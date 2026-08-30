import type { NextFunction, Request, RequestHandler, Response } from "express";
import { db, vendorProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ownsResourceOrIsAdmin,
  roleIsAllowed,
  type AccountStatus,
  type PrimaryRole,
} from "../lib/roles.ts";

export type LocalUser = {
  id: string;
  clerkUserId: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
  role: PrimaryRole;
  createdAt: Date;
  updatedAt: Date;
};

declare global {
  namespace Express {
    interface Request {
      localUser?: LocalUser;
    }
  }
}

function unauthenticated(res: Response): void {
  res.status(401).json({
    error: { code: "UNAUTHENTICATED", message: "Please sign in with Clerk to continue." },
  });
}

function forbidden(res: Response, message = "You do not have permission to access this resource."): void {
  res.status(403).json({ error: { code: "FORBIDDEN", message } });
}

export function requireRole(...allowedRoles: PrimaryRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.localUser) {
      unauthenticated(res);
      return;
    }
    if (!roleIsAllowed(req.localUser.role, allowedRoles)) {
      forbidden(res);
      return;
    }
    next();
  };
}

export const requireAnyRole = requireRole;

export function requireOwnerOrAdmin(
  resolveOwnerId: (req: Request) => string | null | Promise<string | null>,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.localUser) {
      unauthenticated(res);
      return;
    }
    if (req.localUser.role === "admin") {
      next();
      return;
    }
    try {
      const ownerId = await resolveOwnerId(req);
      if (!ownerId) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
        return;
      }
      if (!ownsResourceOrIsAdmin(req.localUser.role, req.localUser.id, ownerId)) {
        forbidden(res, "You can only access resources owned by your vendor account.");
        return;
      }
      next();
    } catch {
      res.status(503).json({ error: { code: "AUTHORIZATION_UNAVAILABLE", message: "Authorization is temporarily unavailable." } });
    }
  };
}

export async function requireApprovedVendor(req: Request, res: Response): Promise<boolean> {
  if (!req.localUser) {
    unauthenticated(res);
    return false;
  }
  if (req.localUser.role === "admin") return true;
  if (req.localUser.role !== "vendor") {
    forbidden(res);
    return false;
  }
  const profile = await db.query.vendorProfiles.findFirst({
    where: eq(vendorProfiles.userId, req.localUser.id),
  });
  if (!profile || profile.status !== "approved") {
    forbidden(res, "Your vendor profile must be approved before vendor access is activated.");
    return false;
  }
  return true;
}
