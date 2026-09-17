import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";
import { findVendorProfile, serializeCurrentUser } from "../lib/role-data";
import { ensureDefaultClientOrganizationMembership } from "../lib/clerkOrganization";
import { clerkClient } from "../lib/clerkConfig";
import {
  createDemoSignIn,
  DemoAuthUnavailableError,
  InvalidDemoOtpError,
} from "../lib/demoAuth";
import {
  InvalidClerkSessionProofError,
  verifyClerkSessionProof,
} from "../lib/clerkSessionProof";
import { configuredAdminClerkUserIds } from "../lib/roles";
import { db, userRoles, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const authRouter: IRouter = Router();

authRouter.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});

authRouter.post("/v1/auth/organization/provision", async (req, res) => {
  try {
    const session = await verifyClerkSessionProof(req, clerkClient.sessions);
    const result = await ensureDefaultClientOrganizationMembership(
      session.userId,
      clerkClient.organizations,
    );
    res.json(result);
  } catch (error) {
    if (error instanceof InvalidClerkSessionProofError) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "A valid Clerk session proof is required.",
        },
      });
      return;
    }
    throw error;
  }
});

authRouter.post("/v1/auth/demo", async (req, res) => {
  try {
    const result = await createDemoSignIn(
      typeof req.body?.otp === "string" ? req.body.otp : "",
      clerkClient,
    );
    if (configuredAdminClerkUserIds().has(result.userId)) {
      throw new DemoAuthUnavailableError();
    }
    const local = await db.query.users.findFirst({
      where: eq(users.clerkUserId, result.userId),
    });
    if (local) {
      await db.transaction(async (tx) => {
        await tx.delete(userRoles).where(eq(userRoles.userId, local.id));
        await tx.insert(userRoles).values({ userId: local.id, role: "user" });
      });
    }
    res.json({
      email: result.email,
      ticket: result.ticket,
      organizationId: result.organizationId,
    });
  } catch (error) {
    if (error instanceof InvalidDemoOtpError) {
      res.status(401).json({
        error: { code: "INVALID_DEMO_OTP", message: error.message },
      });
      return;
    }
    if (error instanceof DemoAuthUnavailableError) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Demo authentication is unavailable." },
      });
      return;
    }
    throw error;
  }
});

authRouter.use(requireAuth);

authRouter.get("/v1/auth/session", async (req, res) => {
  const auth = getAuth(req);
  res.json({
    authenticated: true,
    clerkUserId: req.localUser!.clerkUserId,
    sessionId: auth.sessionId ?? null,
    sessionAuthority: "clerk",
  });
});

authRouter.get("/v1/me", async (req, res) => {
  const vendorProfile = await findVendorProfile(req.localUser!.id);
  res.json(serializeCurrentUser(req.localUser!, vendorProfile));
});

authRouter.post("/v1/auth/refresh", (req, res) => {
  const auth = getAuth(req);
  res.json({ authenticated: true, sessionId: auth.sessionId ?? null, sessionAuthority: "clerk", message: "Clerk verifies and refreshes sessions; no application session was created." });
});

authRouter.post("/v1/auth/logout", (_req, res) => {
  res.json({ authenticated: true, sessionAuthority: "clerk", message: "Sign out through Clerk's client SDK; this API does not revoke or create sessions." });
});

export default authRouter;