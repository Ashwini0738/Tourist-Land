import { createServerSupabaseClient } from "@workspace/supabase/server";
import {
  AuthenticationRejectedError,
  type VerifiedExternalIdentity,
} from "./authenticatedIdentity.ts";

type JwtClaims = {
  sub?: unknown;
  email?: unknown;
  session_id?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
};

export type SupabaseClaimsVerifier = (
  token: string,
) => Promise<{ claims: JwtClaims }>;

export type SupabaseJwtConfiguration = {
  url: string;
  publishableKey: string;
  audience: string;
};

export function readSupabaseJwtConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseJwtConfiguration {
  const url = env.SUPABASE_URL?.trim();
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const audience = env.SUPABASE_JWT_AUDIENCE?.trim();
  if (!url || !publishableKey || !audience) {
    throw new Error(
      "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_JWT_AUDIENCE are required in Supabase API auth mode.",
    );
  }
  return { url, publishableKey, audience };
}

function expectedIssuer(url: string): string {
  return `${url.replace(/\/+$/, "")}/auth/v1`;
}

function hasAudience(value: unknown, expected: string): boolean {
  return typeof value === "string"
    ? value === expected
    : Array.isArray(value) && value.some((entry) => entry === expected);
}

export function validateSupabaseClaims(
  claims: JwtClaims,
  config: Pick<SupabaseJwtConfiguration, "url" | "audience">,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedExternalIdentity {
  if (
    typeof claims.sub !== "string"
    || !claims.sub
    || claims.iss !== expectedIssuer(config.url)
    || !hasAudience(claims.aud, config.audience)
    || typeof claims.exp !== "number"
    || claims.exp <= nowSeconds
  ) {
    throw new AuthenticationRejectedError();
  }

  return {
    provider: "supabase",
    externalUserId: claims.sub,
    ...(typeof claims.email === "string" ? { email: claims.email } : {}),
    ...(typeof claims.session_id === "string" ? { sessionId: claims.session_id } : {}),
  };
}

function createSdkClaimsVerifier(
  config: SupabaseJwtConfiguration,
): SupabaseClaimsVerifier {
  const client = createServerSupabaseClient({
    url: config.url,
    publishableKey: config.publishableKey,
  });
  return async (token) => {
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims) throw new AuthenticationRejectedError();
    return { claims: data.claims };
  };
}

export async function verifySupabaseJwt(
  token: string,
  config: SupabaseJwtConfiguration,
  verifier: SupabaseClaimsVerifier = createSdkClaimsVerifier(config),
  nowSeconds?: number,
): Promise<VerifiedExternalIdentity> {
  if (!token) throw new AuthenticationRejectedError();
  try {
    const { claims } = await verifier(token);
    return validateSupabaseClaims(claims, config, nowSeconds);
  } catch (error) {
    if (error instanceof AuthenticationRejectedError) throw error;
    throw new AuthenticationRejectedError();
  }
}

export async function verifySupabaseBearerToken(
  token: string,
): Promise<VerifiedExternalIdentity> {
  return verifySupabaseJwt(token, readSupabaseJwtConfiguration());
}