import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoSignIn,
  DemoAuthUnavailableError,
  InvalidDemoOtpError,
  verifyDemoOtp,
  type DemoClerkClient,
} from "./demoAuth.ts";
import type { OrganizationProvisioner } from "./clerkOrganization.ts";

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
  const organizations: Array<{ id: string; name: string; slug?: string | null }> = [];
  const memberships = new Set<string>();
  const organizationClient: OrganizationProvisioner = {
    async getOrganizationList() {
      return { data: organizations };
    },
    async createOrganization({ name, slug }) {
      const organization = { id: "org_clients", name, slug };
      organizations.push(organization);
      return organization;
    },
    async getOrganizationMembershipList({ organizationId, userId }) {
      return {
        data: memberships.has(`${organizationId}:${userId[0]}`)
          ? [{ id: "membership" }]
          : [],
      };
    },
    async createOrganizationMembership({ organizationId, userId, role }) {
      assert.equal(role, "org:member");
      memberships.add(`${organizationId}:${userId}`);
    },
  };
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
    organizations: organizationClient,
    signInTokens: {
      async createSignInToken({ userId, orgId, expiresInSeconds }) {
        assert.equal(userId, "user_demo");
        assert.equal(orgId, "org_clients");
        assert.equal(expiresInSeconds, 60);
        ticketCreates += 1;
        return { token: `ticket_${ticketCreates}` };
      },
    },
  };
  return { client, counts: () => ({ userCreates, ticketCreates }), organizations, memberships };
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

test("creates one dedicated Clerk demo user, canonical membership, and short-lived tickets", async () => {
  const fake = fakeClient();
  const first = await createDemoSignIn("246810", fake.client, safeEnv);
  const second = await createDemoSignIn("246810", fake.client, safeEnv);
  assert.equal(first.userId, "user_demo");
  assert.equal(first.organizationId, "org_clients");
  assert.equal(second.organizationId, "org_clients");
  assert.deepEqual(fake.counts(), { userCreates: 1, ticketCreates: 2 });
  assert.equal(fake.organizations.length, 1);
  assert.equal(fake.memberships.size, 1);
});