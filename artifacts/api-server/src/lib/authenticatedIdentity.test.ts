import assert from "node:assert/strict";
import test from "node:test";
import { configuredApiAuthProvider } from "./apiAuthProvider.ts";
import {
  attachLocalIdentity,
  AuthenticationRejectedError,
  AUTH_PROVIDERS,
} from "./authenticatedIdentity.ts";

test("the API auth provider is Clerk-only", () => {
  assert.deepEqual(AUTH_PROVIDERS, ["clerk"]);
  assert.equal(configuredApiAuthProvider(undefined), "clerk");
  assert.equal(configuredApiAuthProvider("clerk"), "clerk");
  assert.throws(
    () => configuredApiAuthProvider("supabase"),
    /TRAVEL_LAND_API_AUTH_PROVIDER must be clerk/,
  );
  assert.throws(
    () => configuredApiAuthProvider("dual"),
    /TRAVEL_LAND_API_AUTH_PROVIDER must be clerk/,
  );
});

test("a verified Clerk identity maps to the existing local application user ID", () => {
  assert.deepEqual(
    attachLocalIdentity({
      provider: "clerk",
      externalUserId: "clerk-user-1",
      sessionId: "clerk-session-1",
    }, "local-user-9"),
    {
      provider: "clerk",
      externalUserId: "clerk-user-1",
      sessionId: "clerk-session-1",
      localUserId: "local-user-9",
    },
  );
});

test("an authentication rejection remains explicit for unauthenticated requests", () => {
  const error = new AuthenticationRejectedError();
  assert.equal(error.name, "AuthenticationRejectedError");
  assert.equal(error.message, "Authentication was rejected.");
});