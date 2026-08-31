import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { createReportsRouter } from "./reports.ts";

function buildTestApp(): express.Express {
  const authenticateFixtureUser: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role");
    if (!role) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Test identity is required." } });
      return;
    }
    req.localUser = {
      id: `${role}-fixture`,
      clerkUserId: `test-${role}`,
      email: `${role}@example.test`,
      displayName: `${role} fixture`,
      phone: null,
      avatarUrl: null,
      status: "active",
      role: role === "admin" ? "admin" : role === "vendor" ? "vendor" : "user",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    next();
  };
  const app = express();
  app.use(createReportsRouter(authenticateFixtureUser));
  return app;
}

async function request(app: express.Express, path: string, role?: string) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start.");
  try {
    const headers = role ? { "x-test-role": role } : undefined;
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
    return { status: response.status, body: await response.json() as { error?: { code?: string } } };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("report routes enforce authentication and role isolation before querying data", async () => {
  const app = buildTestApp();
  assert.equal((await request(app, "/v1/admin/reports")).status, 401);
  assert.equal((await request(app, "/v1/admin/reports", "vendor")).body.error?.code, "FORBIDDEN");
  assert.equal((await request(app, "/v1/vendor/reports", "admin")).body.error?.code, "FORBIDDEN");
  assert.equal((await request(app, "/v1/admin/reports/export?table=bookings", "vendor")).body.error?.code, "FORBIDDEN");
});

test("admin report route validates UTC date ranges before database access", async () => {
  const app = buildTestApp();
  const invalidDate = await request(app, "/v1/admin/reports?from=2026-02-30&to=2026-03-01", "admin");
  assert.equal(invalidDate.status, 400);
  assert.equal(invalidDate.body.error?.code, "INVALID_REPORT_RANGE");
  const tooLong = await request(app, "/v1/admin/reports?from=2025-01-01&to=2026-03-01", "admin");
  assert.equal(tooLong.status, 400);
});

test("admin report export validates the selected table before database access", async () => {
  const app = buildTestApp();
  const invalidTable = await request(app, "/v1/admin/reports/export?table=ledger", "admin");
  assert.equal(invalidTable.status, 400);
  assert.equal(invalidTable.body.error?.code, "INVALID_REPORT_TABLE");
  const missingTable = await request(app, "/v1/admin/reports/export", "admin");
  assert.equal(missingTable.status, 400);
  assert.equal(missingTable.body.error?.code, "INVALID_REPORT_TABLE");
});