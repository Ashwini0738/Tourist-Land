import { and, eq } from "drizzle-orm";
import { db, identityLinkAttempts, users } from "@workspace/db";

const ATTEMPT_TTL_MS = 10 * 60 * 1000;

export type IdentityLinkErrorCode =
  | "IDENTITY_LINK_ACCOUNT_NOT_FOUND"
  | "IDENTITY_LINK_ACCOUNT_INACTIVE"
  | "IDENTITY_LINK_ATTEMPT_INVALID"
  | "IDENTITY_LINK_ATTEMPT_EXPIRED"
  | "IDENTITY_LINK_CONFLICT"
  | "IDENTITY_LINK_UNAVAILABLE";

export class IdentityLinkError extends Error {
  constructor(
    readonly code: IdentityLinkErrorCode,
    readonly status: 403 | 404 | 409 | 410 | 503,
    message: string,
  ) {
    super(message);
  }
}

function isUniqueViolation(error: unknown): boolean {
  let candidate: unknown = error;
  for (let depth = 0; depth < 4 && candidate && typeof candidate === "object"; depth += 1) {
    if ("code" in candidate && candidate.code === "23505") return true;
    candidate = "cause" in candidate ? candidate.cause : null;
  }
  return false;
}

export async function startIdentityLinkAttempt(
  clerkUserId: string,
  now = new Date(),
): Promise<{ attemptId: string; expiresAt: Date }> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .for("update");

    if (!user) {
      throw new IdentityLinkError(
        "IDENTITY_LINK_ACCOUNT_NOT_FOUND",
        404,
        "No existing Travel & Land account is linked to this verified Clerk identity.",
      );
    }
    if (user.status !== "active") {
      throw new IdentityLinkError(
        "IDENTITY_LINK_ACCOUNT_INACTIVE",
        403,
        "This Travel & Land account is not active.",
      );
    }

    await tx
      .update(identityLinkAttempts)
      .set({ status: "cancelled", updatedAt: now })
      .where(and(
        eq(identityLinkAttempts.userId, user.id),
        eq(identityLinkAttempts.status, "pending"),
      ));

    const expiresAt = new Date(now.getTime() + ATTEMPT_TTL_MS);
    const [attempt] = await tx
      .insert(identityLinkAttempts)
      .values({
        userId: user.id,
        clerkUserId,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: identityLinkAttempts.id });

    if (!attempt) {
      throw new IdentityLinkError(
        "IDENTITY_LINK_UNAVAILABLE",
        503,
        "Identity linking is temporarily unavailable.",
      );
    }
    return { attemptId: attempt.id, expiresAt };
  });
}

export async function completeIdentityLinkAttempt(input: {
  attemptId: string;
  clerkUserId: string;
  supabaseUserId: string;
  now?: Date;
}): Promise<{ status: "linked" | "already_linked" }> {
  const now = input.now ?? new Date();

  try {
    const result = await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(identityLinkAttempts)
        .where(eq(identityLinkAttempts.id, input.attemptId))
        .for("update");

      if (!attempt || attempt.status !== "pending" || attempt.clerkUserId !== input.clerkUserId) {
        return { error: new IdentityLinkError(
          "IDENTITY_LINK_ATTEMPT_INVALID",
          409,
          "This identity-link attempt is invalid or has already been used.",
        ) };
      }
      if (attempt.expiresAt.getTime() <= now.getTime()) {
        await tx
          .update(identityLinkAttempts)
          .set({ status: "expired", updatedAt: now })
          .where(eq(identityLinkAttempts.id, attempt.id));
        return { error: new IdentityLinkError(
          "IDENTITY_LINK_ATTEMPT_EXPIRED",
          410,
          "This identity-link attempt has expired.",
        ) };
      }

      const [user] = await tx
        .select({
          id: users.id,
          clerkUserId: users.clerkUserId,
          authUserId: users.authUserId,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, attempt.userId))
        .for("update");

      if (!user || user.clerkUserId !== input.clerkUserId) {
        return { error: new IdentityLinkError(
          "IDENTITY_LINK_ATTEMPT_INVALID",
          409,
          "This identity-link attempt is invalid or has already been used.",
        ) };
      }
      if (user.status !== "active") {
        return { error: new IdentityLinkError(
          "IDENTITY_LINK_ACCOUNT_INACTIVE",
          403,
          "This Travel & Land account is not active.",
        ) };
      }

      const [mappedUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authUserId, input.supabaseUserId))
        .for("update");

      if (user.authUserId === input.supabaseUserId && mappedUser?.id === user.id) {
        await tx
          .update(identityLinkAttempts)
          .set({
            status: "completed",
            supabaseUserId: input.supabaseUserId,
            usedAt: now,
            updatedAt: now,
          })
          .where(eq(identityLinkAttempts.id, attempt.id));
        return { value: { status: "already_linked" as const } };
      }

      if (user.authUserId || (mappedUser && mappedUser.id !== user.id)) {
        await tx
          .update(identityLinkAttempts)
          .set({ status: "cancelled", updatedAt: now })
          .where(eq(identityLinkAttempts.id, attempt.id));
        return { error: new IdentityLinkError(
          "IDENTITY_LINK_CONFLICT",
          409,
          "These verified identities cannot be linked.",
        ) };
      }

      const [updated] = await tx
        .update(users)
        .set({ authUserId: input.supabaseUserId, updatedAt: now })
        .where(and(eq(users.id, user.id), eq(users.clerkUserId, input.clerkUserId)))
        .returning({ id: users.id });

      if (!updated) {
        throw new IdentityLinkError(
          "IDENTITY_LINK_CONFLICT",
          409,
          "These verified identities cannot be linked.",
        );
      }

      await tx
        .update(identityLinkAttempts)
        .set({
          status: "completed",
          supabaseUserId: input.supabaseUserId,
          usedAt: now,
          updatedAt: now,
        })
        .where(eq(identityLinkAttempts.id, attempt.id));

      return { value: { status: "linked" as const } };
    });

    if ("error" in result) throw result.error;
    return result.value;
  } catch (error) {
    if (error instanceof IdentityLinkError) throw error;
    if (isUniqueViolation(error)) {
      throw new IdentityLinkError(
        "IDENTITY_LINK_CONFLICT",
        409,
        "These verified identities cannot be linked.",
      );
    }
    throw new IdentityLinkError(
      "IDENTITY_LINK_UNAVAILABLE",
      503,
      "Identity linking is temporarily unavailable.",
    );
  }
}