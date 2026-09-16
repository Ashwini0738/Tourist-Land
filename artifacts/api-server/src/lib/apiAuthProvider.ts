import type { Request } from "express";
import { getAuth } from "@clerk/express";
import {
  AuthenticationRejectedError,
  type VerifiedExternalIdentity,
} from "./authenticatedIdentity.ts";

export type ApiAuthMode = "clerk";

export function configuredApiAuthProvider(
  value = process.env.TRAVEL_LAND_API_AUTH_PROVIDER,
): ApiAuthMode {
  if (!value || value === "clerk") return "clerk";
  throw new Error("TRAVEL_LAND_API_AUTH_PROVIDER must be clerk.");
}

export async function verifyRequestIdentity(
  req: Request,
): Promise<VerifiedExternalIdentity> {
  configuredApiAuthProvider();
  return verifyClerkRequest(req);
}

export function verifyClerkRequest(req: Request): VerifiedExternalIdentity {
  const { userId, sessionId } = getAuth(req);
  if (!userId) throw new AuthenticationRejectedError();
  return {
    provider: "clerk",
    externalUserId: userId,
    ...(sessionId ? { sessionId } : {}),
  };
}

export type RequestIdentityVerifier = (
  req: Request,
) => Promise<VerifiedExternalIdentity> | VerifiedExternalIdentity;