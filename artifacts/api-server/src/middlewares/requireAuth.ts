import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, userRoles, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  configuredAdminClerkUserIds,
  normalizeAccountStatus,
  resolvePrimaryRole,
} from "../lib/roles.ts";
import { claimInvitedAccess } from "../lib/onboarding.ts";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in with Clerk to continue." } });
    return;
  }
  try {
    let local = await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) });
    if (!local) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (!email) {
        res.status(422).json({ error: { code: "ACCOUNT_EMAIL_REQUIRED", message: "Your Clerk account needs a primary email address." } });
        return;
      }
      await db.insert(users).values({
        clerkUserId: userId, email, displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      }).onConflictDoNothing();
      local = await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) });
    }
    if (!local) throw new Error("Local user provisioning did not complete.");
    await claimInvitedAccess({ id: local.id, email: local.email });
    let roleRows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, local.id));
    const configuredAdmins = configuredAdminClerkUserIds();
    if (configuredAdmins.has(userId) && !roleRows.some((row) => row.role === "admin")) {
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
    req.localUser = {
      id: local.id,
      clerkUserId: userId,
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
  } catch {
    res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable. Please try again." } });
  }
}