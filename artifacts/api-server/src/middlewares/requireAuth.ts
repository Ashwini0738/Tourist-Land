import type { NextFunction, Request, Response } from "express";
import { db, userRoles, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { clerkClient } from "../lib/clerkConfig.ts";
import {
  configuredAdminClerkUserIds,
  normalizeAccountStatus,
  resolvePrimaryRole,
} from "../lib/roles.ts";
import { claimInvitedAccess } from "../lib/onboarding.ts";
import {
  attachLocalIdentity,
  AuthenticationRejectedError,
  type VerifiedExternalIdentity,
} from "../lib/authenticatedIdentity.ts";
import { verifyRequestIdentity } from "../lib/apiAuthProvider.ts";

function unauthenticated(res: Response): void {
  res.status(401).json({
    error: { code: "UNAUTHENTICATED", message: "Please sign in with Clerk to continue." },
  });
}

async function resolveClerkUser(identity: VerifiedExternalIdentity) {
  let local = await db.query.users.findFirst({
    where: eq(users.clerkUserId, identity.externalUserId),
  });
  if (!local) {
    const clerkUser = await clerkClient.users.getUser(identity.externalUserId);
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) return { local: null, missingEmail: true };
    await db.insert(users).values({
      clerkUserId: identity.externalUserId,
      email,
      displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
    }).onConflictDoNothing();
    local = await db.query.users.findFirst({
      where: eq(users.clerkUserId, identity.externalUserId),
    });
  }
  return { local, missingEmail: false };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  try {
    const identity = await verifyRequestIdentity(req);
    const resolved = await resolveClerkUser(identity);
    if (resolved.missingEmail) {
      res.status(422).json({ error: { code: "ACCOUNT_EMAIL_REQUIRED", message: "Your Clerk account needs a primary email address." } });
      return;
    }
    const local = resolved.local;
    if (!local) throw new Error("Local user provisioning did not complete.");
    await claimInvitedAccess({ id: local.id, email: local.email });
    let roleRows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, local.id));
    const configuredAdmins = configuredAdminClerkUserIds();
    if (configuredAdmins.has(identity.externalUserId) && !roleRows.some((row) => row.role === "admin")) {
      await db.transaction(async (tx) => {
        await tx.delete(userRoles).where(eq(userRoles.userId, local!.id));
        await tx.insert(userRoles).values({ userId: local!.id, role: "admin" });
      });
      roleRows = [{ role: "admin" }];
    } else if (roleRows.length === 0) {
      await db.insert(userRoles).values({ userId: local.id, role: "user" }).onConflictDoNothing();
      roleRows = [{ role: "user" }];
    }
    const status = normalizeAccountStatus(local.status);
    if (status !== "active") {
      res.status(403).json({ error: { code: "ACCOUNT_INACTIVE", message: "This account is not active." } });
      return;
    }
    req.authenticatedIdentity = attachLocalIdentity(identity, local.id);
    req.localUser = {
      id: local.id,
      clerkUserId: local.clerkUserId,
      email: local.email,
      displayName: local.displayName,
      phone: local.phone,
      avatarUrl: local.avatarUrl,
      status,
      role: resolvePrimaryRole(roleRows.map((row) => row.role)),
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
    };
    next();
  } catch (error) {
    if (error instanceof AuthenticationRejectedError) {
      unauthenticated(res);
      return;
    }
    res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable. Please try again." } });
  }
}