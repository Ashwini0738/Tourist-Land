import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CLIENT_ORGANIZATION,
  ensureDefaultClientOrganizationMembership,
  type OrganizationProvisioner,
} from "./clerkOrganization.ts";

function fakeProvisioner() {
  const organizations: Array<{ id: string; name: string; slug?: string | null }> = [];
  const members = new Set<string>();
  let createOrganizationCalls = 0;
  let createMembershipCalls = 0;
  const client: OrganizationProvisioner = {
    async getOrganizationList() {
      return { data: [...organizations] };
    },
    async createOrganization(params) {
      createOrganizationCalls += 1;
      const organization = { id: "org_clients", name: params.name, slug: params.slug };
      organizations.push(organization);
      return organization;
    },
    async getOrganizationMembershipList({ organizationId, userId }) {
      return { data: members.has(`${organizationId}:${userId[0]}`) ? [{ id: "membership" }] : [] };
    },
    async createOrganizationMembership({ organizationId, userId, role }) {
      assert.equal(role, "org:member");
      createMembershipCalls += 1;
      members.add(`${organizationId}:${userId}`);
    },
  };
  return {
    client,
    organizations,
    members,
    counts: () => ({ createOrganizationCalls, createMembershipCalls }),
  };
}

test("provisions the canonical organization and normal membership idempotently", async () => {
  const fake = fakeProvisioner();
  const first = await ensureDefaultClientOrganizationMembership("user_1", fake.client);
  const second = await ensureDefaultClientOrganizationMembership("user_1", fake.client);

  assert.deepEqual(first, { organizationId: "org_clients" });
  assert.deepEqual(second, first);
  assert.equal(fake.organizations[0]?.slug, DEFAULT_CLIENT_ORGANIZATION.slug);
  assert.deepEqual(fake.counts(), {
    createOrganizationCalls: 1,
    createMembershipCalls: 1,
  });
});

test("recovers when concurrent creation wins before the retry", async () => {
  const fake = fakeProvisioner();
  fake.client.createOrganization = async () => {
    fake.organizations.push({
      id: "org_raced",
      name: DEFAULT_CLIENT_ORGANIZATION.name,
      slug: DEFAULT_CLIENT_ORGANIZATION.slug,
    });
    throw new Error("slug already exists");
  };

  const result = await ensureDefaultClientOrganizationMembership("user_2", fake.client);
  assert.deepEqual(result, { organizationId: "org_raced" });
  assert.ok(fake.members.has("org_raced:user_2"));
});

test("creates the canonical organization without a slug when the tenant disables slugs", async () => {
  const fake = fakeProvisioner();
  fake.client.createOrganization = async (params) => {
    if (params.slug) {
      throw { errors: [{ code: "organization_slugs_disabled" }] };
    }
    const organization = {
      id: "org_clients",
      name: params.name,
      slug: null,
    };
    fake.organizations.push(organization);
    return organization;
  };

  const result = await ensureDefaultClientOrganizationMembership("user_3", fake.client);
  assert.deepEqual(result, { organizationId: "org_clients" });
  assert.equal(fake.organizations[0]?.name, DEFAULT_CLIENT_ORGANIZATION.name);
  assert.equal(fake.organizations[0]?.slug, null);
});
