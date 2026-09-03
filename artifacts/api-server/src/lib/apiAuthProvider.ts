import type { Request } from "express";
import { getAuth } from "@clerk/express";
import {
  AuthenticationRejectedError,
  type AuthProvider,
  type VerifiedExternalIdentity,
} from "./authenticatedIdentity.ts";
import { verifySupabaseBearerToken } from "./supabaseJwt.ts";

export function configuredApiAuthProvider(
  value = process.env.TRAVEL_LAND_API_AUTH_PROVIDER,
): AuthProvider {
  if (!value || value === "clerk") return "clerk";
  if (value === "supabase") return "supabase";
  throw new Error("TRAVEL_LAND_API_AUTH_PROVIDER must be either clerk or supabase.");
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
  const provider = configuredApiAuthProvider();
  if (provider === "clerk") {
    const { userId, sessionId } = getAuth(req);
    if (!userId) throw new AuthenticationRejectedError();
    return {
      provider,
      externalUserId: userId,
      ...(sessionId ? { sessionId } : {}),
    };
  }

  return verifySupabaseBearerToken(bearerToken(req));
}