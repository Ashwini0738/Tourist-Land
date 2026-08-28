import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, userPinCredentials } from "@workspace/db";
import { ChangePinBody, SetupPinBody, VerifyLoginPinBody } from "@workspace/api-zod";
import { hashPin, lockoutAfterFailure, PIN_LOCKOUT_MS, verifyPin } from "../lib/pin";
import { requireAuth } from "../middlewares/requireAuth";

const authRouter: IRouter = Router();
function parseInput<T>(result: { success: boolean; data?: T }, body: unknown, allowedKeys: string[], res: import("express").Response): T | null {
  const hasOnlyExpectedKeys = typeof body === "object" && body !== null && !Array.isArray(body) &&
    Object.keys(body).every((key) => allowedKeys.includes(key));
  if (!result.success || !hasOnlyExpectedKeys) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Please provide a PIN containing 4 to 6 digits." } });
    return null;
  }
  return result.data!;
}

authRouter.use(requireAuth);

authRouter.get("/v1/auth/session", async (req, res) => {
  const auth = getAuth(req);
  const credential = await db.query.userPinCredentials.findFirst({
    where: eq(userPinCredentials.userId, req.localUser!.id),
  });
  res.json({
    authenticated: true,
    clerkUserId: req.localUser!.clerkUserId,
    sessionId: auth.sessionId ?? null,
    pinConfigured: Boolean(credential),
    sessionAuthority: "clerk",
  });
});

authRouter.post("/v1/auth/setup-pin", async (req, res) => {
  const input = parseInput(SetupPinBody.safeParse(req.body), req.body, ["pin"], res);
  if (!input) return;
  const existing = await db.query.userPinCredentials.findFirst({
    where: eq(userPinCredentials.userId, req.localUser!.id),
  });
  if (existing) {
    res.status(409).json({ error: { code: "PIN_ALREADY_CONFIGURED", message: "A PIN is already configured. Use change PIN instead." } });
    return;
  }
  await db.insert(userPinCredentials).values({ userId: req.localUser!.id, pinHash: await hashPin(input.pin) });
  res.status(201).json({ pinConfigured: true, message: "PIN configured. Your Clerk session remains active." });
});

authRouter.post("/v1/auth/login-pin", async (req, res) => {
  const input = parseInput(VerifyLoginPinBody.safeParse(req.body), req.body, ["pin"], res);
  if (!input) return;
  const credential = await db.query.userPinCredentials.findFirst({
    where: eq(userPinCredentials.userId, req.localUser!.id),
  });
  if (!credential) {
    res.status(409).json({ error: { code: "PIN_NOT_CONFIGURED", message: "Set up a PIN before verifying it." } });
    return;
  }
  const now = new Date();
  if (credential.lockedUntil && credential.lockedUntil > now) {
    res.status(429).json({ error: { code: "PIN_LOCKED", message: "Too many attempts. Please try again later." }, retryAfterSeconds: Math.ceil((credential.lockedUntil.getTime() - now.getTime()) / 1000) });
    return;
  }
  if (await verifyPin(input.pin, credential.pinHash)) {
    await db.update(userPinCredentials).set({ failedAttempts: 0, lockedUntil: null, updatedAt: now })
      .where(eq(userPinCredentials.userId, req.localUser!.id));
    res.json({ verified: true, sessionAuthority: "clerk", message: "PIN verified; Clerk continues to own this session." });
    return;
  }
  const next = lockoutAfterFailure(credential.failedAttempts, now);
  await db.update(userPinCredentials).set({ ...next, updatedAt: now })
    .where(eq(userPinCredentials.userId, req.localUser!.id));
  res.status(next.lockedUntil ? 429 : 401).json({
    error: { code: next.lockedUntil ? "PIN_LOCKED" : "INVALID_PIN", message: next.lockedUntil ? "Too many attempts. Please try again later." : "That PIN is not correct." },
    ...(next.lockedUntil ? { retryAfterSeconds: PIN_LOCKOUT_MS / 1000 } : {}),
  });
});

authRouter.post("/v1/auth/refresh", (req, res) => {
  const auth = getAuth(req);
  res.json({ authenticated: true, sessionId: auth.sessionId ?? null, sessionAuthority: "clerk", message: "Clerk verifies and refreshes sessions; no application session was created." });
});

authRouter.post("/v1/auth/logout", (_req, res) => {
  res.json({ authenticated: true, sessionAuthority: "clerk", message: "Sign out through Clerk's client SDK; this API does not revoke or create sessions." });
});

authRouter.post("/v1/auth/change-pin", async (req, res) => {
  const input = parseInput(ChangePinBody.safeParse(req.body), req.body, ["currentPin", "newPin"], res);
  if (!input) return;
  const credential = await db.query.userPinCredentials.findFirst({
    where: eq(userPinCredentials.userId, req.localUser!.id),
  });
  if (!credential) {
    res.status(401).json({ error: { code: "INVALID_PIN", message: "Your current PIN is not correct." } });
    return;
  }
  const now = new Date();
  if (credential.lockedUntil && credential.lockedUntil > now) {
    res.status(429).json({ error: { code: "PIN_LOCKED", message: "Too many attempts. Please try again later." }, retryAfterSeconds: Math.ceil((credential.lockedUntil.getTime() - now.getTime()) / 1000) });
    return;
  }
  if (!(await verifyPin(input.currentPin, credential.pinHash))) {
    const next = lockoutAfterFailure(credential.failedAttempts, now);
    await db.update(userPinCredentials).set({ ...next, updatedAt: now })
      .where(eq(userPinCredentials.userId, req.localUser!.id));
    res.status(next.lockedUntil ? 429 : 401).json({
      error: { code: next.lockedUntil ? "PIN_LOCKED" : "INVALID_PIN", message: next.lockedUntil ? "Too many attempts. Please try again later." : "Your current PIN is not correct." },
      ...(next.lockedUntil ? { retryAfterSeconds: PIN_LOCKOUT_MS / 1000 } : {}),
    });
    return;
  }
  await db.update(userPinCredentials).set({
    pinHash: await hashPin(input.newPin), failedAttempts: 0, lockedUntil: null, updatedAt: new Date(),
  }).where(and(eq(userPinCredentials.userId, req.localUser!.id), eq(userPinCredentials.pinHash, credential.pinHash)));
  res.json({ pinConfigured: true, message: "PIN changed. Clerk continues to own your session." });
});

export default authRouter;