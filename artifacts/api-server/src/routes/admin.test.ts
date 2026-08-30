import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { and, eq, sql } from "drizzle-orm";
import { adminAuditLogs, db, pool, userRoles, users } from "@workspace/db";
import { createAdminRouter } from "./admin.ts";

const ADMIN_ID = randomUUID();
const TARGET_ID = randomUUID();

function fixtureUser(id: string, role: "admin" | "user") {
  return {
    id,
    clerkUserId: `admin-test-${id}`,
    email: `${role}-${id}@example.test`,
    displayName: role === "admin" ? "Fixture admin" : "Fixture user",
    status: "active" as const,
    role,
    phone: null,
    avatarUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

const authenticateFixtureUser: RequestHandler = (req, _res, next) => {
  const role = req.header("x-test-role");
  if (role !== "admin" && role !== "user") {
    next();
    return;
  }
  const identity = role === "admin" ? fixtureUser(ADMIN_ID, "admin") : fixtureUser(TARGET_ID, "user");
  req.localUser = identity;
  next();
};

function buildTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(createAdminRouter(authenticateFixtureUser));
  return app;
}

async function startTestServer(app: express.Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
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

async function request(
  baseUrl: string,
  path: string,
  role?: "admin" | "user",
  init: RequestInit = {},
): Promise<{ status: number; body: Record<string, any> }> {
  const headers = new Headers(init.headers);
  if (role) headers.set("x-test-role", role);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function adminSchemaIsReady(): Promise<boolean> {
  const result = await db.execute(sql`
    select to_regclass('public.admin_audit_logs') as audit_table,
           to_regclass('public.users') as users_table
  `);
  const row = result.rows[0] as { audit_table: string | null; users_table: string | null } | undefined;
  return Boolean(row?.audit_table && row?.users_table);
}

async function cleanupFixture(): Promise<void> {
  await db.delete(adminAuditLogs).where(eq(adminAuditLogs.adminUserId, ADMIN_ID));
  await db.delete(userRoles).where(eq(userRoles.userId, TARGET_ID));
  await db.delete(userRoles).where(eq(userRoles.userId, ADMIN_ID));
  await db.delete(users).where(eq(users.id, TARGET_ID));
  await db.delete(users).where(eq(users.id, ADMIN_ID));
}

test("admin routes fail closed for unauthenticated and non-admin identities", async () => {
  const server = await startTestServer(buildTestApp());
  try {
    const unauthenticated = await request(server.baseUrl, "/v1/admin/dashboard");
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.error.code, "UNAUTHENTICATED");

    const user = await request(server.baseUrl, "/v1/admin/dashboard", "user");
    assert.equal(user.status, 403);
    assert.equal(user.body.error.code, "FORBIDDEN");
  } finally {
    await server.close();
  }
});

test("admin status controls validate transitions and protect the current administrator", async () => {
  const server = await startTestServer(buildTestApp());
  try {
    const invalid = await request(server.baseUrl, `/v1/admin/users/${TARGET_ID}/status`, "admin", {
      method: "POST",
      body: JSON.stringify({ status: "deleted" }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "INVALID_STATUS");

    const selfLockout = await request(server.baseUrl, `/v1/admin/users/${ADMIN_ID}/status`, "admin", {
      method: "POST",
      body: JSON.stringify({ status: "suspended", reason: "test" }),
    });
    assert.equal(selfLockout.status, 409);
    assert.equal(selfLockout.body.error.code, "SELF_LOCKOUT");
  } finally {
    await server.close();
  }
});

test("admin status changes write an actor-bound audit record", async (t) => {
  if (!(await adminSchemaIsReady())) {
    t.skip("development database schema is pending post-merge application (missing admin audit table)");
    return;
  }

  await cleanupFixture();
  await db.insert(users).values([fixtureUser(ADMIN_ID, "admin"), fixtureUser(TARGET_ID, "user")]);
  await db.insert(userRoles).values([{ userId: ADMIN_ID, role: "admin" }, { userId: TARGET_ID, role: "user" }]);

  const server = await startTestServer(buildTestApp());
  try {
    const changed = await request(server.baseUrl, `/v1/admin/users/${TARGET_ID}/status`, "admin", {
      method: "POST",
      body: JSON.stringify({ status: "suspended", reason: "policy review" }),
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.status, "suspended");

    const [record] = await db.select().from(adminAuditLogs).where(and(
      eq(adminAuditLogs.adminUserId, ADMIN_ID),
      eq(adminAuditLogs.entityId, TARGET_ID),
    ));
    assert.ok(record);
    assert.equal(record.action, "status_updated");
    assert.equal(record.entityType, "user");
    assert.deepEqual(record.metadata, { status: "suspended", reason: "policy review" });

    const visible = await request(server.baseUrl, `/v1/admin/audit-logs?q=${TARGET_ID}`, "admin");
    assert.equal(visible.status, 200);
    assert.equal((visible.body.items as Array<{ entityId: string }>).some((item) => item.entityId === TARGET_ID), true);
  } finally {
    await server.close();
    await cleanupFixture();
  }
});

test.after(async () => {
  await pool.end();
});