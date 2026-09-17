export const DEFAULT_CLIENT_ORGANIZATION = {
  name: "Travel & Land Clients",
  slug: "travel-land-clients",
  role: "org:member",
} as const;

type OrganizationRecord = { id: string; name: string; slug?: string | null };
type OrganizationPage = { data: OrganizationRecord[] };
type MembershipPage = { data: Array<{ id: string }> };

export type OrganizationProvisioner = {
  getOrganizationList(params: { query: string; limit: number }): Promise<OrganizationPage>;
  createOrganization(params: { name: string; slug?: string; maxAllowedMemberships: number }): Promise<OrganizationRecord>;
  getOrganizationMembershipList(params: {
    organizationId: string;
    userId: string[];
    limit: number;
  }): Promise<MembershipPage>;
  createOrganizationMembership(params: {
    organizationId: string;
    userId: string;
    role: string;
  }): Promise<unknown>;
};

async function findDefaultOrganization(client: OrganizationProvisioner): Promise<OrganizationRecord | null> {
  const page = await client.getOrganizationList({
    query: DEFAULT_CLIENT_ORGANIZATION.name,
    limit: 100,
  });
  return page.data.find(
    (organization) =>
      organization.name === DEFAULT_CLIENT_ORGANIZATION.name &&
      (!organization.slug || organization.slug === DEFAULT_CLIENT_ORGANIZATION.slug),
  ) ?? null;
}

function organizationSlugsDisabled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const source = error as {
    errors?: Array<{ code?: string }>;
    aggregateErrors?: Array<{ code?: string }>;
  };
  return [...(source.errors ?? []), ...(source.aggregateErrors ?? [])].some(
    ({ code }) => code === "organization_slugs_disabled",
  );
}

async function getOrCreateDefaultOrganization(client: OrganizationProvisioner): Promise<OrganizationRecord> {
  const existing = await findDefaultOrganization(client);
  if (existing) return existing;

  try {
    return await client.createOrganization({
      name: DEFAULT_CLIENT_ORGANIZATION.name,
      slug: DEFAULT_CLIENT_ORGANIZATION.slug,
      maxAllowedMemberships: 0,
    });
  } catch (error) {
    if (organizationSlugsDisabled(error)) {
      return client.createOrganization({
        name: DEFAULT_CLIENT_ORGANIZATION.name,
        maxAllowedMemberships: 0,
      });
    }
    const raced = await findDefaultOrganization(client);
    if (raced) return raced;
    throw error;
  }
}

export async function ensureDefaultClientOrganizationMembership(
  userId: string,
  client: OrganizationProvisioner,
): Promise<{ organizationId: string }> {
  const organization = await getOrCreateDefaultOrganization(client);
  const memberships = await client.getOrganizationMembershipList({
    organizationId: organization.id,
    userId: [userId],
    limit: 1,
  });

  if (memberships.data.length === 0) {
    try {
      await client.createOrganizationMembership({
        organizationId: organization.id,
        userId,
        role: DEFAULT_CLIENT_ORGANIZATION.role,
      });
    } catch (error) {
      const raced = await client.getOrganizationMembershipList({
        organizationId: organization.id,
        userId: [userId],
        limit: 1,
      });
      if (raced.data.length === 0) throw error;
    }
  }

  return { organizationId: organization.id };
}