import type { Request } from "express";
import { getAuth } from "@clerk/express";
import {
  AuthenticationRejectedError,
  type AuthProvider,
  type VerifiedExternalIdentity,
} from "./authenticatedIdentity.ts";
import { verifySupabaseBearerToken } from "./supabaseJwt.ts";

export type ApiAuthMode = AuthProvider | "dual";

export function configuredApiAuthProvider(
  value = process.env.TRAVEL_LAND_API_AUTH_PROVIDER,
): ApiAuthMode {
  if (!value || value === "clerk") return "clerk";
  if (value === "supabase") return "supabase";
  if (value === "dual") return "dual";
  throw new Error("TRAVEL_LAND_API_AUTH_PROVIDER must be clerk, supabase, or dual.");
}

function bearerToken(req: Request): string {
  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) throw new AuthenticationRejectedError();
  return match[1];
}

export async function verifyRequestIdentity(
  req: Request,
): Promise<VerifiedExternalIdentity> {
  const mode = configuredApiAuthProvider();
  if (mode === "dual") {
    return verifyDualProviderRequest(req);
  }
  return mode === "clerk"
    ? verifyClerkRequest(req)
    : verifySupabaseBearerToken(bearerToken(req));
}

function verifyClerkRequest(req: Request): VerifiedExternalIdentity {
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

export async function verifyDualProviderRequest(
  req: Request,
  clerkVerifier: RequestIdentityVerifier = verifyClerkRequest,
  supabaseVerifier: RequestIdentityVerifier = () => verifySupabaseBearerToken(bearerToken(req)),
): Promise<VerifiedExternalIdentity> {
  try {
    return await clerkVerifier(req);
  } catch (clerkError) {
    if (clerkError instanceof Error && clerkError.name !== "AuthenticationRejectedError") {
      throw clerkError;
    }
    return supabaseVerifier(req);
  }
}