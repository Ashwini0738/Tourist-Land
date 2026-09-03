import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { createIdentityLinkRouter } from "./identity-link.ts";
import { AuthenticationRejectedError } from "../lib/authenticatedIdentity.ts";
import { IdentityLinkError } from "../lib/identityLink.ts";

const attemptId = "11111111-1111-4111-8111-111111111111";
const supabaseUserId = "22222222-2222-4222-8222-222222222222";
const expiresAt = new Date("2026-09-03T12:10:00.000Z");

type Overrides = Parameters<typeof createIdentityLinkRouter>[0];

async function request(
  overrides: Overrides,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const app = express();
  app.use(express.json());
  app.use(createIdentityLinkRouter({
    verifyClerk: async () => ({
      provider: "clerk",
      externalUserId: "clerk-user-1",
      sessionId: "clerk-session-1",
    }),
    verifySupabaseToken: async () => ({
      provider: "supabase",
      externalUserId: supabaseUserId,
    }),
    startAttempt: async () => ({ attemptId, expiresAt }),
    completeAttempt: async () => ({ status: "linked" }),
    ...overrides,
  }));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address.");
  try {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("content-type", "application/json");
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      ...init,
      headers,
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function completeHeaders(token = "verified-supabase-token"): Record<string, string> {
  return {
    authorization: "Bearer verified-clerk-token",
    "x-supabase-link-token": token,
  };
}

test("1. starts only from the server-verified Clerk subject", async () => {
  let subject = "";
  const response = await request({
    startAttempt: async (clerkUserId) => {
      subject = clerkUserId;
      return { attemptId, expiresAt };
    },
  }, "/v1/auth/identity-link/attempts");
  assert.equal(response.status, 201);
  assert.equal(subject, "clerk-user-1");
  assert.deepEqual(response.body, { attemptId, expiresAt: expiresAt.toISOString() });
});

test("2. rejects an unknown Clerk identity without provisioning", async () => {
  const response = await request({
    startAttempt: async () => {
      throw new IdentityLinkError("IDENTITY_LINK_ACCOUNT_NOT_FOUND", 404, "No existing account.");
    },
  }, "/v1/auth/identity-link/attempts");
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "IDENTITY_LINK_ACCOUNT_NOT_FOUND");
});

test("3. rejects an inactive existing local account", async () => {
  const response = await request({
    startAttempt: async () => {
      throw new IdentityLinkError("IDENTITY_LINK_ACCOUNT_INACTIVE", 403, "Inactive.");
    },
  }, "/v1/auth/identity-link/attempts");
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "IDENTITY_LINK_ACCOUNT_INACTIVE");
});

test("4. rejects start without a verified Clerk session", async () => {
  const response = await request({
    verifyClerk: async () => { throw new AuthenticationRejectedError(); },
  }, "/v1/auth/identity-link/attempts");
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHENTICATED");
});

test("5. completes with both independently derived provider subjects", async () => {
  let received: any;
  const response = await request({
    completeAttempt: async (input) => {
      received = input;
      return { status: "linked" };
    },
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { attemptId, clerkUserId: "clerk-user-1", supabaseUserId });
});

test("6. returns idempotent success when the same identities are already linked", async () => {
  const response = await request({
    completeAttempt: async () => ({ status: "already_linked" }),
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "already_linked");
});

test("7. rejects a malformed attempt identifier", async () => {
  const response = await request({}, "/v1/auth/identity-link/attempts/not-an-id/complete", {
    headers: completeHeaders(),
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "INVALID_INPUT");
});

test("8. rejects a missing independent Supabase credential", async () => {
  const response = await request({}, `/v1/auth/identity-link/attempts/${attemptId}/complete`);
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "INVALID_INPUT");
});

test("9. rejects a Supabase token rejected by its verifier", async () => {
  const response = await request({
    verifySupabaseToken: async () => { throw new AuthenticationRejectedError(); },
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders("bad") });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "IDENTITY_LINK_PROVIDER_VERIFICATION_FAILED");
});

test("10. rejects a verified token whose Supabase subject is not a UUID", async () => {
  const response = await request({
    verifySupabaseToken: async () => ({ provider: "supabase", externalUserId: "not-a-uuid" }),
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "IDENTITY_LINK_PROVIDER_VERIFICATION_FAILED");
});

test("11. rejects a second credential verified as the wrong provider", async () => {
  const response = await request({
    verifySupabaseToken: async () => ({ provider: "clerk", externalUserId: "clerk-user-2" }),
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
  assert.equal(response.status, 401);
});

test("12. rejects completion without the same verified Clerk session authority", async () => {
  const response = await request({
    verifyClerk: async () => { throw new AuthenticationRejectedError(); },
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHENTICATED");
});

for (const [number, code, status, title] of [
  [13, "IDENTITY_LINK_CONFLICT", 409, "a local account already linked to another Supabase identity"],
  [14, "IDENTITY_LINK_CONFLICT", 409, "a Supabase identity already mapped to another local account"],
  [15, "IDENTITY_LINK_ATTEMPT_EXPIRED", 410, "an expired attempt"],
  [16, "IDENTITY_LINK_ATTEMPT_INVALID", 409, "a replayed attempt"],
  [17, "IDENTITY_LINK_ATTEMPT_INVALID", 409, "a cross-user attempt"],
  [18, "IDENTITY_LINK_ATTEMPT_INVALID", 409, "an unknown attempt"],
] as const) {
  test(`${number}. rejects ${title} with a stable non-enumerating code`, async () => {
    const response = await request({
      completeAttempt: async () => {
        throw new IdentityLinkError(code, status, "Safe failure.");
      },
    }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
    assert.equal(response.status, status);
    assert.equal(response.body.error.code, code);
  });
}

test("19. rejects a concurrent uniqueness race without leaking the conflicting account", async () => {
  const response = await request({
    completeAttempt: async () => {
      throw new IdentityLinkError("IDENTITY_LINK_CONFLICT", 409, "These verified identities cannot be linked.");
    },
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, { headers: completeHeaders() });
  assert.deepEqual(response.body, {
    error: {
      code: "IDENTITY_LINK_CONFLICT",
      message: "These verified identities cannot be linked.",
    },
  });
});

test("20. ignores client-submitted identity fields and reports transactional rollback failure", async () => {
  let received: any;
  const response = await request({
    completeAttempt: async (input) => {
      received = input;
      throw new IdentityLinkError("IDENTITY_LINK_UNAVAILABLE", 503, "Temporarily unavailable.");
    },
  }, `/v1/auth/identity-link/attempts/${attemptId}/complete`, {
    headers: completeHeaders(),
    body: JSON.stringify({
      clerkUserId: "attacker-clerk",
      supabaseUserId: "33333333-3333-4333-8333-333333333333",
      userId: "44444444-4444-4444-8444-444444444444",
      email: "victim@example.test",
    }),
  });
  assert.deepEqual(received, { attemptId, clerkUserId: "clerk-user-1", supabaseUserId });
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, "IDENTITY_LINK_UNAVAILABLE");
});