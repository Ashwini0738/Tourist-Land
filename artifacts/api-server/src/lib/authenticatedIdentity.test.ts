import assert from "node:assert/strict";
import test from "node:test";
import { configuredApiAuthProvider } from "./apiAuthProvider.ts";
import {
  attachLocalIdentity,
  AuthenticationRejectedError,
  resolveMappedSupabaseUser,
} from "./authenticatedIdentity.ts";

test("API auth provider defaults to Clerk and rejects arbitrary modes", () => {
  assert.equal(configuredApiAuthProvider(undefined), "clerk");
  assert.equal(configuredApiAuthProvider("clerk"), "clerk");
  assert.equal(configuredApiAuthProvider("supabase"), "supabase");
  assert.throws(() => configuredApiAuthProvider("both"), /either clerk or supabase/);
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