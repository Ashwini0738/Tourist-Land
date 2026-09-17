import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoSignIn,
  DemoAuthUnavailableError,
  InvalidDemoOtpError,
  verifyDemoOtp,
  type DemoClerkClient,
} from "./demoAuth.ts";

const safeEnv = {
  NODE_ENV: "development",
  TRAVEL_LAND_DEMO_AUTH_ENABLED: "true",
  TRAVEL_LAND_DEMO_EMAIL: "demo@travel-land.example",
  TRAVEL_LAND_DEMO_PHONE: "+12025550199",
  TRAVEL_LAND_DEMO_OTP: "246810",
} as NodeJS.ProcessEnv;

function fakeClient() {
  const users: Array<{
    id: string;
    externalId: string;
    emailAddresses: Array<{ emailAddress: string }>;
  }> = [];
  let userCreates = 0;
  let ticketCreates = 0;
  const client: DemoClerkClient = {
    users: {
      async getUserList() {
        return { data: users };
      },
      async createUser(params) {
        userCreates += 1;
        const user = {
          id: "user_demo",
          externalId: params.externalId,
          emailAddresses: [{ emailAddress: params.emailAddress[0] }],
        };
        users.push(user);
        return user;
      },
    },
    signInTokens: {
      async createSignInToken({ userId, expiresInSeconds }) {
        assert.equal(userId, "user_demo");
        assert.equal(expiresInSeconds, 60);
        ticketCreates += 1;
        return { token: `ticket_${ticketCreates}` };
      },
    },
  };
  return { client, counts: () => ({ userCreates, ticketCreates }) };
}

test("accepts the configured OTP only in an explicitly enabled development environment", () => {
  assert.deepEqual(verifyDemoOtp("246810", safeEnv), {
    email: "demo@travel-land.example",
  });
  assert.throws(() => verifyDemoOtp("000000", safeEnv), InvalidDemoOtpError);
  for (const env of [
    { ...safeEnv, NODE_ENV: "production" },
    { ...safeEnv, TRAVEL_LAND_BUILD_ENV: "production" },
    { ...safeEnv, TRAVEL_LAND_BUILD_ENV: "release" },
    { ...safeEnv, EAS_BUILD_PROFILE: "production" },
    { ...safeEnv, TRAVEL_LAND_DEMO_AUTH_ENABLED: "false" },
  ]) {
    assert.throws(() => verifyDemoOtp("246810", env), DemoAuthUnavailableError);
  }
});

test("creates one dedicated Clerk demo user and organization-independent short-lived tickets", async () => {
  const fake = fakeClient();
  const first = await createDemoSignIn("246810", fake.client, safeEnv);
  const second = await createDemoSignIn("246810", fake.client, safeEnv);
  assert.equal(first.userId, "user_demo");
  assert.equal(first.ticket, "ticket_1");
  assert.equal(second.ticket, "ticket_2");
  assert.deepEqual(fake.counts(), { userCreates: 1, ticketCreates: 2 });
});