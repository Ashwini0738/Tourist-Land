import { Router, type IRouter, type Request } from "express";
import {
  CompleteIdentityLinkHeader,
  CompleteIdentityLinkParams,
  CompleteIdentityLinkResponse,
  StartIdentityLinkResponse,
} from "@workspace/api-zod";
import { verifyClerkRequest } from "../lib/apiAuthProvider.ts";
import { verifySupabaseBearerToken } from "../lib/supabaseJwt.ts";
import {
  completeIdentityLinkAttempt,
  IdentityLinkError,
  startIdentityLinkAttempt,
} from "../lib/identityLink.ts";
import type { VerifiedExternalIdentity } from "../lib/authenticatedIdentity.ts";

type IdentityLinkDependencies = {
  verifyClerk: (req: Request) => VerifiedExternalIdentity | Promise<VerifiedExternalIdentity>;
  verifySupabaseToken: (token: string) => Promise<VerifiedExternalIdentity>;
  startAttempt: typeof startIdentityLinkAttempt;
  completeAttempt: typeof completeIdentityLinkAttempt;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(
  res: import("express").Response,
  status: number,
  code: string,
  message: string,
): void {
  res.status(status).json({ error: { code, message } });
}

export function createIdentityLinkRouter(
  dependencies: Partial<IdentityLinkDependencies> = {},
): IRouter {
  const deps: IdentityLinkDependencies = {
    verifyClerk: verifyClerkRequest,
    verifySupabaseToken: verifySupabaseBearerToken,
    startAttempt: startIdentityLinkAttempt,
    completeAttempt: completeIdentityLinkAttempt,
    ...dependencies,
  };
  const router: IRouter = Router();

  router.post("/v1/auth/identity-link/attempts", async (req, res): Promise<void> => {
    try {
      const clerkIdentity = await deps.verifyClerk(req);
      if (clerkIdentity.provider !== "clerk") throw new Error("Unexpected identity provider.");
      const attempt = await deps.startAttempt(clerkIdentity.externalUserId);
      res.status(201).json(StartIdentityLinkResponse.parse(attempt));
    } catch (error) {
      if (error instanceof IdentityLinkError) {
        fail(res, error.status, error.code, error.message);
        return;
      }
      fail(res, 401, "UNAUTHENTICATED", "A verified Clerk session is required.");
    }
  });

  router.post(
    "/v1/auth/identity-link/attempts/:attemptId/complete",
    async (req, res): Promise<void> => {
      const params = CompleteIdentityLinkParams.safeParse(req.params);
      const header = CompleteIdentityLinkHeader.safeParse({
        "X-Supabase-Link-Token": req.header("X-Supabase-Link-Token"),
      });
      if (!params.success || !header.success) {
        fail(res, 400, "INVALID_INPUT", "A valid attempt and Supabase credential are required.");
        return;
      }

      try {
        const clerkIdentity = await deps.verifyClerk(req);
        if (clerkIdentity.provider !== "clerk") throw new Error("Unexpected identity provider.");

        let supabaseIdentity: VerifiedExternalIdentity;
        try {
          supabaseIdentity = await deps.verifySupabaseToken(
            header.data["X-Supabase-Link-Token"],
          );
        } catch {
          fail(
            res,
            401,
            "IDENTITY_LINK_PROVIDER_VERIFICATION_FAILED",
            "The Supabase credential could not be verified.",
          );
          return;
        }
        if (
          supabaseIdentity.provider !== "supabase"
          || !UUID_PATTERN.test(supabaseIdentity.externalUserId)
        ) {
          fail(
            res,
            401,
            "IDENTITY_LINK_PROVIDER_VERIFICATION_FAILED",
            "The Supabase credential could not be verified.",
          );
          return;
        }

        const result = await deps.completeAttempt({
          attemptId: params.data.attemptId,
          clerkUserId: clerkIdentity.externalUserId,
          supabaseUserId: supabaseIdentity.externalUserId,
        });
        res.json(CompleteIdentityLinkResponse.parse(result));
      } catch (error) {
        if (error instanceof IdentityLinkError) {
          fail(res, error.status, error.code, error.message);
          return;
        }
        fail(res, 401, "UNAUTHENTICATED", "A verified Clerk session is required.");
      }
    },
  );

  return router;
}

export default createIdentityLinkRouter();