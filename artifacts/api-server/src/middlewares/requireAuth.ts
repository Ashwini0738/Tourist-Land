import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      localUser?: { id: string; clerkUserId: string };
    }
  }
}

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
    req.localUser = { id: local.id, clerkUserId: userId };
    next();
  } catch {
    res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable. Please try again." } });
  }
}