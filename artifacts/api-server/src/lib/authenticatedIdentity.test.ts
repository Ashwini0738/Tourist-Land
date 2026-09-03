import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredApiAuthProvider,
  verifyDualProviderRequest,
} from "./apiAuthProvider.ts";
import {
  attachLocalIdentity,
  AuthenticationRejectedError,
  resolveMappedSupabaseUser,
} from "./authenticatedIdentity.ts";

test("API auth provider defaults to Clerk and rejects arbitrary modes", () => {
  assert.equal(configuredApiAuthProvider(undefined), "clerk");
  assert.equal(configuredApiAuthProvider("clerk"), "clerk");
  assert.equal(configuredApiAuthProvider("supabase"), "supabase");
  assert.equal(configuredApiAuthProvider("dual"), "dual");
  assert.throws(() => configuredApiAuthProvider("both"), /clerk, supabase, or dual/);
});

test("provider identity maps to the existing local application user ID", () => {
  assert.deepEqual(
    attachLocalIdentity({
      provider: "supabase",
      externalUserId: "supabase-user-1",
      email: "matching-email-is-not-used-for-resolution@example.test",
    }, "local-user-9"),
    {
      provider: "supabase",
      externalUserId: "supabase-user-1",
      email: "matching-email-is-not-used-for-resolution@example.test",
      localUserId: "local-user-9",
    },
  );
});

test("mapped Supabase subject resolves to the matching local user ID", async () => {
  const localUser = await resolveMappedSupabaseUser(
    {
      provider: "supabase",
      externalUserId: "supabase-user-1",
      email: "same-email-does-not-drive-resolution@example.test",
    },
    async (authUserId) => authUserId === "supabase-user-1"
      ? { id: "local-user-9", role: "vendor" }
      : null,
  );
  assert.deepEqual(localUser, { id: "local-user-9", role: "vendor" });
});

test("unmapped Supabase subject is rejected without email fallback", async () => {
  await assert.rejects(
    () => resolveMappedSupabaseUser(
      {
        provider: "supabase",
        externalUserId: "unmapped-user",
        email: "existing-clerk-user@example.test",
      },
      async () => null,
    ),
    AuthenticationRejectedError,
  );
});

test("dual mode accepts an independently verified Clerk identity", async () => {
  const identity = await verifyDualProviderRequest(
    {} as import("express").Request,
    () => ({
      provider: "clerk",
      externalUserId: "clerk-user-1",
      sessionId: "clerk-session-1",
    }),
    async () => {
      throw new AuthenticationRejectedError();
    },
  );
  assert.equal(identity.provider, "clerk");
  assert.equal(identity.externalUserId, "clerk-user-1");
});

test("dual mode falls back to Supabase only after Clerk verification rejects", async () => {
  let clerkAttempts = 0;
  let supabaseAttempts = 0;
  const identity = await verifyDualProviderRequest(
    {} as import("express").Request,
    () => {
      clerkAttempts += 1;
      throw new AuthenticationRejectedError();
    },
    () => {
      supabaseAttempts += 1;
      return {
        provider: "supabase",
        externalUserId: "supabase-user-1",
      };
    },
  );
  assert.equal(clerkAttempts, 1);
  assert.equal(supabaseAttempts, 1);
  assert.equal(identity.provider, "supabase");
});

test("dual mode rejects a token rejected by both trusted verifiers", async () => {
  await assert.rejects(
    () => verifyDualProviderRequest(
      {} as import("express").Request,
      () => {
        throw new AuthenticationRejectedError();
      },
      async () => {
        throw new AuthenticationRejectedError();
      },
    ),
    AuthenticationRejectedError,
  );
});