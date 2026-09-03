import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  adminAuditLogs,
  db,
  destinations,
  featuredContent,
  hotels,
  properties,
  reviews,
  userRoles,
  users,
  vendorProfiles,
} from "@workspace/db";
import { createAdminRouter } from "./admin.ts";

type JsonObject = Record<string, unknown>;

type AdminFixture = {
  adminId: string;
  targetUserId: string;
  vendorId: string;
  hotelAId: string;
  hotelBId: string;
  propertyId: string;
  reviewId: string;
  destinationId: string;
};

type TestServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

function fixtureUser(id: string, displayName: string, email: string) {
  return {
    id,
    clerkUserId: `admin-test-clerk-${id}`,
    email,
    displayName,
    status: "active" as const,
  };
}

async function createFixture(): Promise<AdminFixture> {
  const fixture: AdminFixture = {
    adminId: randomUUID(),
    targetUserId: randomUUID(),
    vendorId: randomUUID(),
    hotelAId: randomUUID(),
    hotelBId: randomUUID(),
    propertyId: randomUUID(),
    reviewId: randomUUID(),
    destinationId: randomUUID(),
  };

  await db.insert(users).values([
    fixtureUser(fixture.adminId, "Admin Fixture Operator", `admin-${fixture.adminId}@example.test`),
    fixtureUser(fixture.targetUserId, "Admin Fixture Target", `target-${fixture.targetUserId}@example.test`),
    fixtureUser(fixture.vendorId, "Admin Fixture Vendor", `vendor-${fixture.vendorId}@example.test`),
  ]);
  await db.insert(userRoles).values([
    { userId: fixture.adminId, role: "admin" },
    { userId: fixture.targetUserId, role: "user" },
    { userId: fixture.vendorId, role: "vendor" },
  ]);
  await db.insert(vendorProfiles).values({
    userId: fixture.vendorId,
    businessName: "Admin Fixture Stays",
    businessType: "hotel",
    contactName: "Admin Fixture Vendor",
    phone: "1111111111",
    email: `vendor-profile-${fixture.vendorId}@example.test`,
    description: "Admin route test vendor",
    address: "Fixture Vendor Street",
    city: "Fixture City",
    state: "Fixture State",
    country: "India",
    status: "pending",
  });
  await db.insert(hotels).values([
    {
      id: fixture.hotelAId,
      catalogId: `admin-test-hotel-a-${fixture.hotelAId}`,
      ownerId: fixture.vendorId,
      name: "Admin Fixture Hotel A",
      address: "Fixture Hotel Street A",
      city: "Fixture City",
      country: "India",
      status: "draft",
      approvalStatus: "pending",
    },
    {
      id: fixture.hotelBId,
      catalogId: `admin-test-hotel-b-${fixture.hotelBId}`,
      ownerId: fixture.vendorId,
      name: "Admin Fixture Hotel B",
      address: "Fixture Hotel Street B",
      city: "Fixture City",
      country: "India",
      status: "draft",
      approvalStatus: "pending",
    },
  ]);
  await db.insert(properties).values({
    id: fixture.propertyId,
    ownerId: fixture.targetUserId,
    slug: `admin-fixture-property-${fixture.propertyId}`,
    title: "Admin Fixture Property",
    description: "This field must not leak through the admin list serializer.",
    propertyType: "farm",
    address: "Fixture Property Street",
    areaValue: "10",
    areaUnit: "acre",
    askingPrice: "50000",
    status: "pending",
  });
  await db.insert(reviews).values({
    id: fixture.reviewId,
    userId: fixture.targetUserId,
    entityType: "hotel",
    entityId: fixture.hotelAId,
    rating: 5,
    title: "Admin fixture review",
    body: "A review used to verify moderation status writes.",
    status: "pending",
  });
  await db.insert(destinations).values({
    id: fixture.destinationId,
    slug: `admin-fixture-destination-${fixture.destinationId}`,
    name: "Admin Fixture Destination",
    country: "India",
    status: "published",
  });

  return fixture;
}

async function deleteFixture(fixture: AdminFixture): Promise<void> {
  await db.delete(adminAuditLogs).where(eq(adminAuditLogs.adminUserId, fixture.adminId));
  await db.delete(reviews).where(eq(reviews.id, fixture.reviewId));
  await db.delete(featuredContent).where(eq(featuredContent.entityId, fixture.destinationId));
  await db.delete(destinations).where(eq(destinations.id, fixture.destinationId));
  await db.delete(properties).where(eq(properties.id, fixture.propertyId));
  await db.delete(hotels).where(inArray(hotels.id, [fixture.hotelAId, fixture.hotelBId]));
  await db.delete(vendorProfiles).where(eq(vendorProfiles.userId, fixture.vendorId));
  await db.delete(userRoles).where(inArray(userRoles.userId, [fixture.adminId, fixture.targetUserId, fixture.vendorId]));
  await db.delete(users).where(inArray(users.id, [fixture.adminId, fixture.targetUserId, fixture.vendorId]));
}

async function adminSchemaReady(): Promise<boolean> {
  const requiredColumns = [
    "users.status",
    "users.auth_user_id",
    "user_roles.role",
    "vendor_profiles.status",
    "hotels.catalog_id",
    "hotels.approval_status",
    "properties.status",
    "reviews.status",
    "admin_audit_logs.admin_user_id",
    "admin_audit_logs.action",
    "admin_audit_logs.entity_type",
    "admin_audit_logs.entity_id",
    "admin_audit_logs.metadata",
    "featured_content.entity_type",
    "featured_content.entity_id",
    "featured_content.sort_order",
    "featured_content.status",
    "featured_content.created_by",
  ];
  const schemaRows = await db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('users', 'user_roles', 'vendor_profiles', 'hotels', 'properties', 'reviews', 'admin_audit_logs', 'featured_content')
  `);
  const availableColumns = new Set(schemaRows.rows.map((row) => `${row.table_name}.${row.column_name}`));
  return requiredColumns.every((column) => availableColumns.has(column));
}

function buildTestApp(adminId: string, userId: string, authenticatedAdminId = adminId): express.Express {
  const authenticateFixtureUser: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role");
    if (!role) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Test identity is required." } });
      return;
    }
    req.localUser = {
      id: role === "admin" ? authenticatedAdminId : userId,
      clerkUserId: `test-${role}`,
      email: `${role}@example.test`,
      displayName: role === "admin" ? "Fixture admin" : "Fixture user",
      phone: null,
      avatarUrl: null,
      status: "active",
      role: role === "admin" ? "admin" : "user",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(createAdminRouter(authenticateFixtureUser));
  return app;
}

async function startTestServer(app: express.Express): Promise<TestServer> {
  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function adminRequest(
  baseUrl: string,
  path: string,
  role?: "admin" | "user",
  init: RequestInit = {},
): Promise<{ status: number; body: JsonObject }> {
  const headers = new Headers(init.headers);
  if (role) headers.set("x-test-role", role);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  return { status: response.status, body: await response.json() as JsonObject };
}

const protectedAdminRoutes: Array<{ method: string; path: string; body?: JsonObject }> = [
  { method: "GET", path: "/v1/admin/dashboard" },
  { method: "GET", path: "/v1/admin/featured-content" },
  { method: "POST", path: "/v1/admin/featured-content", body: { entityType: "destination", entityId: randomUUID() } },
  { method: "PATCH", path: `/v1/admin/featured-content/${randomUUID()}`, body: { sortOrder: 1 } },
  { method: "DELETE", path: `/v1/admin/featured-content/${randomUUID()}` },
  { method: "GET", path: "/v1/admin/users" },
  { method: "GET", path: `/v1/admin/users/${randomUUID()}` },
  { method: "POST", path: `/v1/admin/users/${randomUUID()}/status`, body: { status: "active" } },
  { method: "POST", path: `/v1/admin/users/${randomUUID()}/supabase-link`, body: { authUserId: randomUUID(), reason: "Fixture" } },
  { method: "GET", path: "/v1/admin/vendors" },
  { method: "POST", path: `/v1/admin/vendors/${randomUUID()}/status`, body: { status: "approved" } },
  { method: "GET", path: "/v1/admin/hotels" },
  { method: "GET", path: `/v1/admin/hotels/${randomUUID()}` },
  { method: "POST", path: `/v1/admin/hotels/${randomUUID()}/status`, body: { status: "published" } },
  { method: "GET", path: "/v1/admin/rooms" },
  { method: "GET", path: "/v1/admin/availability" },
  { method: "GET", path: "/v1/admin/destinations" },
  { method: "POST", path: "/v1/admin/destinations", body: { slug: "fixture", name: "Fixture", country: "India" } },
  { method: "PATCH", path: `/v1/admin/destinations/${randomUUID()}`, body: { name: "Fixture" } },
  { method: "GET", path: "/v1/admin/places" },
  { method: "GET", path: "/v1/admin/events" },
  { method: "GET", path: "/v1/admin/properties" },
  { method: "POST", path: `/v1/admin/properties/${randomUUID()}/status`, body: { status: "published" } },
  { method: "GET", path: "/v1/admin/bookings" },
  { method: "GET", path: `/v1/admin/bookings/${randomUUID()}` },
  { method: "GET", path: "/v1/admin/payments" },
  { method: "GET", path: "/v1/admin/reviews" },
  { method: "POST", path: `/v1/admin/reviews/${randomUUID()}/status`, body: { status: "published" } },
  { method: "POST", path: "/v1/admin/notifications", body: { type: "fixture", title: "Fixture", body: "Fixture" } },
  { method: "GET", path: "/v1/admin/audit-logs" },
];

test("every admin route rejects unauthenticated and non-admin requests", async (t) => {
  const server = await startTestServer(buildTestApp(randomUUID(), randomUUID()));
  t.after(() => server.close());

  for (const route of protectedAdminRoutes) {
    const unauthenticated = await adminRequest(server.baseUrl, route.path, undefined, {
      method: route.method,
      body: route.body ? JSON.stringify(route.body) : undefined,
    });
    assert.equal(unauthenticated.status, 401, `${route.method} ${route.path} should require authentication`);
    assert.equal((unauthenticated.body.error as JsonObject).code, "UNAUTHENTICATED");

    const nonAdmin = await adminRequest(server.baseUrl, route.path, "user", {
      method: route.method,
      body: route.body ? JSON.stringify(route.body) : undefined,
    });
    assert.equal(nonAdmin.status, 403, `${route.method} ${route.path} should require admin role`);
    assert.equal((nonAdmin.body.error as JsonObject).code, "FORBIDDEN");
  }
});

test("admin links one approved Supabase identity to one existing local user", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  t.after(() => deleteFixture(fixture));
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId));
  t.after(() => server.close());
  const authUserId = randomUUID();

  const invalid = await adminRequest(server.baseUrl, `/v1/admin/users/${fixture.targetUserId}/supabase-link`, "admin", {
    method: "POST",
    body: JSON.stringify({ authUserId, reason: "" }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((invalid.body.error as JsonObject).code, "INVALID_INPUT");

  const linked = await adminRequest(server.baseUrl, `/v1/admin/users/${fixture.targetUserId}/supabase-link`, "admin", {
    method: "POST",
    body: JSON.stringify({ authUserId, reason: "Verified against the approved Supabase migration roster." }),
  });
  assert.equal(linked.status, 200);
  assert.equal(linked.body.id, fixture.targetUserId);
  assert.equal(linked.body.supabaseLinked, true);

  const persisted = await db.query.users.findFirst({ where: eq(users.id, fixture.targetUserId) });
  assert.equal(persisted?.authUserId, authUserId);
  const logs = await db.select().from(adminAuditLogs)
    .where(eq(adminAuditLogs.adminUserId, fixture.adminId));
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.action, "supabase_identity_linked");
  assert.equal(logs[0]?.entityType, "user");
  assert.equal(logs[0]?.entityId, fixture.targetUserId);
  assert.deepEqual(logs[0]?.metadata, {
    provider: "supabase",
    authUserId,
    reason: "Verified against the approved Supabase migration roster.",
  });

  const alreadyLinked = await adminRequest(server.baseUrl, `/v1/admin/users/${fixture.targetUserId}/supabase-link`, "admin", {
    method: "POST",
    body: JSON.stringify({ authUserId: randomUUID(), reason: "Attempted reassignment." }),
  });
  assert.equal(alreadyLinked.status, 409);
  assert.equal((alreadyLinked.body.error as JsonObject).code, "LOCAL_USER_ALREADY_LINKED");

  const conflicting = await adminRequest(server.baseUrl, `/v1/admin/users/${fixture.vendorId}/supabase-link`, "admin", {
    method: "POST",
    body: JSON.stringify({ authUserId, reason: "Attempted duplicate identity." }),
  });
  assert.equal(conflicting.status, 409);
  assert.equal((conflicting.body.error as JsonObject).code, "SUPABASE_IDENTITY_ALREADY_LINKED");
  const vendor = await db.query.users.findFirst({ where: eq(users.id, fixture.vendorId) });
  assert.equal(vendor?.authUserId, null);

  const missing = await adminRequest(server.baseUrl, `/v1/admin/users/${randomUUID()}/supabase-link`, "admin", {
    method: "POST",
    body: JSON.stringify({
      authUserId: randomUUID(),
      reason: "This must not provision a new account.",
      email: "existing-target@example.test",
    }),
  });
  assert.equal(missing.status, 404);
  assert.equal((missing.body.error as JsonObject).code, "NOT_FOUND");
});

test("Supabase identity link and audit record roll back together", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  t.after(() => deleteFixture(fixture));
  const unknownAdminId = randomUUID();
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId, unknownAdminId));
  t.after(() => server.close());

  const response = await adminRequest(server.baseUrl, `/v1/admin/users/${fixture.targetUserId}/supabase-link`, "admin", {
    method: "POST",
    body: JSON.stringify({ authUserId: randomUUID(), reason: "Audit rollback fixture." }),
  });
  assert.equal(response.status, 500);
  assert.equal((response.body.error as JsonObject).code, "SUPABASE_IDENTITY_LINK_FAILED");
  const target = await db.query.users.findFirst({ where: eq(users.id, fixture.targetUserId) });
  assert.equal(target?.authUserId, null);
  assert.equal((await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.adminUserId, unknownAdminId))).length, 0);
});

test("admin status transitions validate values, isolate entities, and write auditable metadata", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  t.after(() => deleteFixture(fixture));
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId));
  t.after(() => server.close());

  const selfLockout = await adminRequest(server.baseUrl, `/v1/admin/users/${fixture.adminId}/status`, "admin", {
    method: "POST",
    body: JSON.stringify({ status: "suspended", reason: "Should be rejected" }),
  });
  assert.equal(selfLockout.status, 409);
  assert.equal((selfLockout.body.error as JsonObject).code, "SELF_LOCKOUT");

  const invalidCases: Array<{ path: string; body: JsonObject }> = [
    { path: `/v1/admin/users/${fixture.targetUserId}/status`, body: { status: "deleted" } },
    { path: `/v1/admin/vendors/${fixture.vendorId}/status`, body: { status: "deleted" } },
    { path: `/v1/admin/hotels/${fixture.hotelAId}/status`, body: { status: "deleted" } },
    { path: `/v1/admin/hotels/${fixture.hotelAId}/status`, body: { status: "published", approvalStatus: "deleted" } },
    { path: `/v1/admin/properties/${fixture.propertyId}/status`, body: { status: "deleted" } },
    { path: `/v1/admin/reviews/${fixture.reviewId}/status`, body: { status: "deleted" } },
  ];
  for (const invalidCase of invalidCases) {
    const response = await adminRequest(server.baseUrl, invalidCase.path, "admin", {
      method: "POST",
      body: JSON.stringify(invalidCase.body),
    });
    assert.equal(response.status, 400, invalidCase.path);
    assert.equal((response.body.error as JsonObject).code, "INVALID_STATUS");
  }

  const crossEntity = await adminRequest(server.baseUrl, `/v1/admin/vendors/${fixture.adminId}/status`, "admin", {
    method: "POST",
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(crossEntity.status, 404);
  assert.equal((crossEntity.body.error as JsonObject).code, "NOT_FOUND");

  const transitions: Array<{ path: string; body: JsonObject; entityType: string; entityId: string; status: string }> = [
    { path: `/v1/admin/users/${fixture.targetUserId}/status`, body: { status: "inactive", reason: "Account requested deactivation" }, entityType: "user", entityId: fixture.targetUserId, status: "inactive" },
    { path: `/v1/admin/vendors/${fixture.vendorId}/status`, body: { status: "approved", reason: "Vendor review completed" }, entityType: "vendor", entityId: fixture.vendorId, status: "approved" },
    { path: `/v1/admin/hotels/${fixture.hotelAId}/status`, body: { status: "published", reason: "Hotel content verified" }, entityType: "hotel", entityId: fixture.hotelAId, status: "published" },
    { path: `/v1/admin/properties/${fixture.propertyId}/status`, body: { status: "published", reason: "Property listing verified" }, entityType: "property", entityId: fixture.propertyId, status: "published" },
    { path: `/v1/admin/reviews/${fixture.reviewId}/status`, body: { status: "published", reason: "Review moderation completed" }, entityType: "review", entityId: fixture.reviewId, status: "published" },
  ];
  for (const transition of transitions) {
    const response = await adminRequest(server.baseUrl, transition.path, "admin", {
      method: "POST",
      body: JSON.stringify(transition.body),
    });
    assert.equal(response.status, 200, transition.path);
    assert.equal(response.body.status, transition.status);
  }

  const [updatedUser] = await db.select().from(users).where(eq(users.id, fixture.targetUserId));
  const [updatedVendor] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.userId, fixture.vendorId));
  const [updatedHotel] = await db.select().from(hotels).where(eq(hotels.id, fixture.hotelAId));
  const [updatedProperty] = await db.select().from(properties).where(eq(properties.id, fixture.propertyId));
  const [updatedReview] = await db.select().from(reviews).where(eq(reviews.id, fixture.reviewId));
  assert.equal(updatedUser?.status, "inactive");
  assert.equal(updatedVendor?.status, "approved");
  assert.equal(updatedHotel?.status, "published");
  assert.equal(updatedProperty?.status, "published");
  assert.equal(updatedReview?.status, "published");

  const logs = await db.select().from(adminAuditLogs)
    .where(eq(adminAuditLogs.adminUserId, fixture.adminId))
    .orderBy(asc(adminAuditLogs.createdAt));
  assert.equal(logs.length, transitions.length);
  for (const transition of transitions) {
    const log = logs.find((entry) => entry.entityType === transition.entityType && entry.entityId === transition.entityId);
    assert.ok(log, `missing audit log for ${transition.entityType}`);
    assert.equal(log.adminUserId, fixture.adminId);
    assert.equal(log.action, "status_updated");
    assert.ok(log.createdAt instanceof Date);
    assert.deepEqual(log.metadata, {
      status: transition.status,
      reason: transition.body.reason,
    });
  }
});

test("admin status transitions roll back when the audit record cannot be inserted", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  t.after(() => deleteFixture(fixture));
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId, randomUUID()));
  t.after(() => server.close());

  const transitions: Array<{ path: string; body: JsonObject }> = [
    { path: `/v1/admin/users/${fixture.targetUserId}/status`, body: { status: "inactive", reason: "Rollback user status" } },
    { path: `/v1/admin/vendors/${fixture.vendorId}/status`, body: { status: "approved", reason: "Rollback vendor status" } },
    { path: `/v1/admin/hotels/${fixture.hotelAId}/status`, body: { status: "published", reason: "Rollback hotel status" } },
    { path: `/v1/admin/properties/${fixture.propertyId}/status`, body: { status: "published", reason: "Rollback property status" } },
    { path: `/v1/admin/reviews/${fixture.reviewId}/status`, body: { status: "published", reason: "Rollback review status" } },
  ];
  for (const transition of transitions) {
    const response = await adminRequest(server.baseUrl, transition.path, "admin", {
      method: "POST",
      body: JSON.stringify(transition.body),
    });
    assert.equal(response.status, 500, transition.path);
    assert.deepEqual(response.body.error, {
      code: "STATUS_UPDATE_FAILED",
      message: "The status change and audit record could not be saved.",
    });
  }

  const [user, vendor, hotel, property, review] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, fixture.targetUserId) }),
    db.query.vendorProfiles.findFirst({ where: eq(vendorProfiles.userId, fixture.vendorId) }),
    db.query.hotels.findFirst({ where: eq(hotels.id, fixture.hotelAId) }),
    db.query.properties.findFirst({ where: eq(properties.id, fixture.propertyId) }),
    db.query.reviews.findFirst({ where: eq(reviews.id, fixture.reviewId) }),
  ]);
  assert.equal(user?.status, "active");
  assert.equal(vendor?.status, "pending");
  assert.equal(hotel?.status, "draft");
  assert.equal(hotel?.approvalStatus, "pending");
  assert.equal(property?.status, "pending");
  assert.equal(review?.status, "pending");
  assert.equal((await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.adminUserId, fixture.adminId))).length, 0);
});

test("destination create and edit history is attributable, safe, and searchable", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  let createdDestinationId: string | undefined;
  t.after(async () => {
    if (createdDestinationId) await db.delete(destinations).where(eq(destinations.id, createdDestinationId));
    await deleteFixture(fixture);
  });
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId));
  t.after(() => server.close());

  const slug = `admin-audit-destination-${randomUUID()}`;
  const created = await adminRequest(server.baseUrl, "/v1/admin/destinations", "admin", {
    method: "POST",
    body: JSON.stringify({
      slug,
      name: "Audit Fixture Destination",
      country: "India",
      region: "Audit Region",
      summary: "A destination used to verify safe audit metadata.",
    }),
  });
  assert.equal(created.status, 201);
  createdDestinationId = created.body.id as string;
  assert.equal(typeof createdDestinationId, "string");

  const edited = await adminRequest(server.baseUrl, `/v1/admin/destinations/${createdDestinationId}`, "admin", {
    method: "PATCH",
    body: JSON.stringify({
      name: "Edited Audit Fixture Destination",
      summary: "Updated destination summary.",
    }),
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.id, createdDestinationId);
  assert.equal(edited.body.name, "Edited Audit Fixture Destination");

  const duplicate = await adminRequest(server.baseUrl, "/v1/admin/destinations", "admin", {
    method: "POST",
    body: JSON.stringify({
      slug,
      name: "Misleading Duplicate",
      country: "India",
    }),
  });
  assert.equal(duplicate.status, 409);
  assert.equal((duplicate.body.error as JsonObject).code, "CONFLICT");

  const missingDestinationId = randomUUID();
  const notFound = await adminRequest(server.baseUrl, `/v1/admin/destinations/${missingDestinationId}`, "admin", {
    method: "PATCH",
    body: JSON.stringify({ name: "Misleading Not Found" }),
  });
  assert.equal(notFound.status, 404);
  assert.equal((notFound.body.error as JsonObject).code, "NOT_FOUND");

  const logs = await db.select().from(adminAuditLogs)
    .where(eq(adminAuditLogs.adminUserId, fixture.adminId));
  assert.equal(logs.length, 2);
  const createdLog = logs.find((log) => log.action === "created");
  const updatedLog = logs.find((log) => log.action === "updated");
  assert.ok(createdLog);
  assert.ok(updatedLog);
  for (const log of [createdLog, updatedLog]) {
    assert.equal(log.adminUserId, fixture.adminId);
    assert.equal(log.entityType, "destination");
    assert.equal(log.entityId, createdDestinationId);
    assert.ok(log.createdAt instanceof Date);
  }
  assert.deepEqual(createdLog.metadata, {});
  assert.deepEqual(updatedLog.metadata, {
    fields: ["name", "summary"],
    before: { name: "Audit Fixture Destination", summary: "A destination used to verify safe audit metadata." },
    after: { name: "Edited Audit Fixture Destination", summary: "Updated destination summary." },
  });
  assert.equal((await db.select().from(adminAuditLogs)
    .where(eq(adminAuditLogs.entityId, missingDestinationId))).length, 0);

  const auditPageOne = await adminRequest(
    server.baseUrl,
    `/v1/admin/audit-logs?q=${createdDestinationId}&page=1&limit=1`,
    "admin",
  );
  assert.equal(auditPageOne.status, 200);
  assert.deepEqual(auditPageOne.body.meta, { page: 1, limit: 1, total: 2, hasMore: true });

  const auditPageTwo = await adminRequest(
    server.baseUrl,
    `/v1/admin/audit-logs?q=${createdDestinationId}&page=2&limit=1`,
    "admin",
  );
  assert.equal(auditPageTwo.status, 200);
  assert.deepEqual(auditPageTwo.body.meta, { page: 2, limit: 1, total: 2, hasMore: false });

  const auditItems = [
    ...(auditPageOne.body.items as JsonObject[]),
    ...(auditPageTwo.body.items as JsonObject[]),
  ];
  assert.deepEqual(new Set(auditItems.map((item) => item.action)), new Set(["created", "updated"]));
  for (const item of auditItems) {
    assert.equal(item.adminUserId, fixture.adminId);
    assert.equal(item.adminName, "Admin Fixture Operator");
    assert.equal(item.entityType, "destination");
    assert.equal(item.entityId, createdDestinationId);
    assert.equal(item.destinationName, "Edited Audit Fixture Destination");
    assert.equal(typeof item.createdAt, "string");
  }
  assert.deepEqual(auditItems.find((item) => item.action === "created")?.metadata, {});
  assert.deepEqual(auditItems.find((item) => item.action === "updated")?.metadata, {
    fields: ["name", "summary"],
    before: { name: "Audit Fixture Destination", summary: "A destination used to verify safe audit metadata." },
    after: { name: "Edited Audit Fixture Destination", summary: "Updated destination summary." },
  });

  const updatedAuditItem = auditItems.find((item) => item.action === "updated");
  assert.ok(updatedAuditItem);
  const auditDetail = await adminRequest(server.baseUrl, `/v1/admin/audit-logs/${updatedAuditItem.id}`, "admin");
  assert.equal(auditDetail.status, 200);
  assert.deepEqual(auditDetail.body.revision, {
    fields: ["name", "summary"],
    before: { name: "Audit Fixture Destination", summary: "A destination used to verify safe audit metadata." },
    after: { name: "Edited Audit Fixture Destination", summary: "Updated destination summary." },
  });

  const destinationFilter = await adminRequest(
    server.baseUrl,
    "/v1/admin/audit-logs?entityType=destination&q=Edited%20Audit%20Fixture%20Destination",
    "admin",
  );
  assert.equal(destinationFilter.status, 200);
  assert.deepEqual(destinationFilter.body.meta, { page: 1, limit: 20, total: 2, hasMore: false });
  assert.equal((destinationFilter.body.items as JsonObject[]).length, 2);
  assert.ok((destinationFilter.body.items as JsonObject[]).every((item) => item.destinationName === "Edited Audit Fixture Destination"));
});

test("admin lists support search, pagination, and safe serialization", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  t.after(() => deleteFixture(fixture));
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId));
  t.after(() => server.close());

  const usersPage = await adminRequest(server.baseUrl, "/v1/admin/users?q=Admin%20Fixture%20Target&page=1&limit=1", "admin");
  assert.equal(usersPage.status, 200);
  assert.equal((usersPage.body.items as unknown[]).length, 1);
  assert.deepEqual(usersPage.body.meta, { page: 1, limit: 1, total: 1, hasMore: false });
  const userItem = (usersPage.body.items as JsonObject[])[0];
  assert.equal(userItem.id, fixture.targetUserId);
  assert.equal("password" in userItem, false);
  assert.equal("createdAt" in userItem, true);
  assert.equal("updatedAt" in userItem, true);

  const hotelsPage = await adminRequest(server.baseUrl, "/v1/admin/hotels?q=Admin%20Fixture%20Hotel&page=2&limit=1", "admin");
  assert.equal(hotelsPage.status, 200);
  assert.deepEqual(hotelsPage.body.meta, { page: 2, limit: 1, total: 2, hasMore: false });
  const hotelItem = (hotelsPage.body.items as JsonObject[])[0];
  assert.equal(typeof hotelItem.id, "string");
  assert.equal(typeof hotelItem.roomCount, "number");
  assert.equal("description" in hotelItem, false);
  assert.equal("latitude" in hotelItem, false);
  assert.equal("longitude" in hotelItem, false);

  const propertyPage = await adminRequest(server.baseUrl, "/v1/admin/properties?q=Admin%20Fixture%20Property&limit=1", "admin");
  assert.equal(propertyPage.status, 200);
  const propertyItem = (propertyPage.body.items as JsonObject[])[0];
  assert.equal(propertyItem.id, fixture.propertyId);
  assert.equal(propertyItem.areaValue, 10);
  assert.equal(propertyItem.askingPrice, 50000);
  assert.equal("description" in propertyItem, false);

  const propertyStatus = await adminRequest(server.baseUrl, `/v1/admin/properties/${fixture.propertyId}/status`, "admin", {
    method: "POST",
    body: JSON.stringify({ status: "published", reason: "List serializer fixture" }),
  });
  assert.equal(propertyStatus.status, 200);

  const auditPage = await adminRequest(server.baseUrl, "/v1/admin/audit-logs?q=property&page=1&limit=1", "admin");
  assert.equal(auditPage.status, 200);
  assert.deepEqual(auditPage.body.meta, { page: 1, limit: 1, total: 1, hasMore: false });
  const auditItem = (auditPage.body.items as JsonObject[])[0];
  assert.equal(auditItem.adminUserId, fixture.adminId);
  assert.equal(auditItem.adminName, "Admin Fixture Operator");
  assert.equal(auditItem.action, "status_updated");
  assert.equal(auditItem.entityType, "property");
  assert.equal(auditItem.entityId, fixture.propertyId);
  assert.deepEqual(auditItem.metadata, { status: "published", reason: "List serializer fixture" });
  assert.equal(typeof auditItem.createdAt, "string");
});

test("featured content is selected, ordered, and removed through persisted admin controls", async (t) => {
  if (!(await adminSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }
  const fixture = await createFixture();
  t.after(() => deleteFixture(fixture));
  const server = await startTestServer(buildTestApp(fixture.adminId, fixture.targetUserId));
  t.after(() => server.close());

  const initial = await adminRequest(server.baseUrl, "/v1/admin/featured-content", "admin");
  assert.equal(initial.status, 200);
  assert.ok((initial.body.candidates as JsonObject[]).some((candidate) => candidate.entityId === fixture.destinationId));

  const created = await adminRequest(server.baseUrl, "/v1/admin/featured-content", "admin", {
    method: "POST",
    body: JSON.stringify({ entityType: "destination", entityId: fixture.destinationId, sortOrder: 3 }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.entityId, fixture.destinationId);
  assert.equal(created.body.sortOrder, 3);
  assert.equal(created.body.isAvailable, true);

  const updated = await adminRequest(server.baseUrl, `/v1/admin/featured-content/${created.body.id}`, "admin", {
    method: "PATCH",
    body: JSON.stringify({ sortOrder: 0 }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.sortOrder, 0);

  const listing = await adminRequest(server.baseUrl, "/v1/admin/featured-content", "admin");
  assert.equal(listing.status, 200);
  assert.equal((listing.body.items as JsonObject[]).find((item) => item.entityId === fixture.destinationId)?.sortOrder, 0);

  const deleted = await adminRequest(server.baseUrl, `/v1/admin/featured-content/${created.body.id}`, "admin", { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.deleted, true);
  const persisted = await db.select().from(featuredContent).where(eq(featuredContent.entityId, fixture.destinationId));
  assert.equal(persisted.length, 0);
});