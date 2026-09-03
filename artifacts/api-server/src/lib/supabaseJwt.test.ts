import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, jwtVerify } from "jose";
import test from "node:test";
import { AuthenticationRejectedError } from "./authenticatedIdentity.ts";
import {
  readSupabaseJwtConfiguration,
  validateSupabaseClaims,
  verifySupabaseJwt,
  type SupabaseClaimsVerifier,
} from "./supabaseJwt.ts";

const now = 1_800_000_000;
const config = {
  url: "https://travel-land.supabase.co",
  publishableKey: "sb_publishable_test",
  audience: "authenticated",
};
const issuer = `${config.url}/auth/v1`;

async function signedFixture(
  overrides: Record<string, unknown> = {},
  signingKey?: CryptoKey,
): Promise<{ token: string; publicKey: CryptoKey }> {
  const keys = signingKey
    ? null
    : await generateKeyPair("ES256", { extractable: true });
  const privateKey = signingKey ?? keys!.privateKey;
  const publicKey = keys?.publicKey ?? privateKey;
  const token = await new SignJWT({
    email: "traveller@example.test",
    session_id: "session-1",
    ...overrides,
  })
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(typeof overrides.sub === "string" ? overrides.sub : "supabase-user-1")
    .setIssuer(typeof overrides.iss === "string" ? overrides.iss : issuer)
    .setAudience(typeof overrides.aud === "string" ? overrides.aud : config.audience)
    .setExpirationTime(typeof overrides.exp === "number" ? overrides.exp : now + 300)
    .sign(privateKey);
  return { token, publicKey };
}

function verifierFor(publicKey: CryptoKey): SupabaseClaimsVerifier {
  return async (token) => {
    const { payload } = await jwtVerify(token, publicKey);
    return { claims: payload };
  };
}

async function rejectsAuthentication(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(action, AuthenticationRejectedError);
}

test("valid signed Supabase JWT reaches verification and resolves its subject", async () => {
  const { token, publicKey } = await signedFixture();
  const identity = await verifySupabaseJwt(token, config, verifierFor(publicKey), now);
  assert.deepEqual(identity, {
    provider: "supabase",
    externalUserId: "supabase-user-1",
    email: "traveller@example.test",
    sessionId: "session-1",
  });
});

test("rejects invalid signatures and payload tampering", async () => {
  const trusted = await signedFixture();
  const attacker = await signedFixture({ sub: "another-user" });
  await rejectsAuthentication(() => verifySupabaseJwt(
    attacker.token,
    config,
    verifierFor(trusted.publicKey),
    now,
  ));
});

test("rejects expired tokens", async () => {
  assert.throws(
    () => validateSupabaseClaims({
      sub: "user-1", iss: issuer, aud: config.audience, exp: now - 1,
    }, config, now),
    AuthenticationRejectedError,
  );
});

test("rejects incorrect issuer", () => {
  assert.throws(
    () => validateSupabaseClaims({
      sub: "user-1", iss: "https://attacker.example/auth/v1", aud: config.audience, exp: now + 1,
    }, config, now),
    AuthenticationRejectedError,
  );
});

test("rejects incorrect audience", () => {
  assert.throws(
    () => validateSupabaseClaims({
      sub: "user-1", iss: issuer, aud: "other", exp: now + 1,
    }, config, now),
    AuthenticationRejectedError,
  );
});

test("rejects missing subject even when an email claim exists", () => {
  assert.throws(
    () => validateSupabaseClaims({
      email: "existing@example.test", iss: issuer, aud: config.audience, exp: now + 1,
    }, config, now),
    AuthenticationRejectedError,
  );
});

test("requires complete Supabase verification configuration", () => {
  assert.throws(
    () => readSupabaseJwtConfiguration({
      SUPABASE_URL: config.url,
      SUPABASE_JWT_AUDIENCE: config.audience,
    }),
    /SUPABASE_URL/,
  );
});