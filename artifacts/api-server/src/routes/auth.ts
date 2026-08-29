import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";

const authRouter: IRouter = Router();

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

authRouter.post("/v1/auth/refresh", (req, res) => {
  const auth = getAuth(req);
  res.json({ authenticated: true, sessionId: auth.sessionId ?? null, sessionAuthority: "clerk", message: "Clerk verifies and refreshes sessions; no application session was created." });
});

authRouter.post("/v1/auth/logout", (_req, res) => {
  res.json({ authenticated: true, sessionAuthority: "clerk", message: "Sign out through Clerk's client SDK; this API does not revoke or create sessions." });
});

export default authRouter;