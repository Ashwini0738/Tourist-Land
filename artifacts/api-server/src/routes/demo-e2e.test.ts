import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import express from "express";
import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";
import { demoIds, demoProperties } from "@workspace/db/seed-data";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const apiRoot = path.resolve(workspaceRoot, "artifacts/api-server");
const tsxLoader = path.resolve(workspaceRoot, "scripts/node_modules/tsx/dist/loader.mjs");
const databaseUrl = process.env.DEMO_E2E_DATABASE_URL;

function testEnvironment() {
  if (!databaseUrl) return { skip: "Set DEMO_E2E_DATABASE_URL to a disposable local Postgres database." };
  assertSafeDemoEnvironment({
    ...process.env,
    DATABASE_URL: databaseUrl,
    DEMO_MODE: "true",
    NODE_ENV: "test",
  }, "demo e2e test");
  return {};
}

async function runDemoCommand(action: "seed" | "reset") {
  if (!databaseUrl) throw new Error("DEMO_E2E_DATABASE_URL is required.");
  await execFileAsync("pnpm", ["--filter", "@workspace/scripts", `demo:${action}`], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DEMO_MODE: "true",
      NODE_ENV: "test",
    },
    maxBuffer: 2_000_000,
  });
}

type TestServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

async function startTestServer(): Promise<TestServer> {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DEMO_MODE = "true";
  process.env.NODE_ENV = "test";

  const { default: router } = await import("./index.ts");

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const clerkUserId = req.get("x-demo-clerk-user") ?? null;
    const auth = Object.assign(
      () => ({
        tokenType: "session_token",
        sessionClaims: clerkUserId
          ? { sub: clerkUserId, sid: `demo-session-${clerkUserId}`, sts: "active" }
          : null,
        userId: clerkUserId,
        sessionId: clerkUserId ? `demo-session-${clerkUserId}` : null,
        sessionStatus: clerkUserId ? "active" : null,
      }),
      { [Symbol.for("@clerk/express.auth")]: true },
    );
    (req as typeof req & { auth: typeof auth }).auth = auth;
    next();
  });
  app.use("/api", router);

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}/api`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

async function request(
  baseUrl: string,
  route: string,
  clerkUserId?: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  if (clerkUserId) headers.set("x-demo-clerk-user", clerkUserId);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}${route}`, { ...init, headers });
  const text = await response.text();
  if (text && !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Expected JSON from ${route}, received HTTP ${response.status}: ${text.slice(0, 120)}`);
  }
  return {
    response,
    body: text ? JSON.parse(text) as Record<string, any> : {},
  };
}

test("seeded traveller, vendor, and admin journeys work end to end", { skip: testEnvironment().skip }, async (t) => {
  await runDemoCommand("reset");
  await runDemoCommand("seed");
  await runDemoCommand("seed");
  await runDemoCommand("reset");
  await runDemoCommand("reset");
  await runDemoCommand("seed");
  t.after(() => runDemoCommand("reset"));

  const server = await startTestServer();
  t.after(() => server.close());

  const session = await request(server.baseUrl, "/v1/auth/session", "demo_traveller");
  assert.equal(session.response.status, 200, JSON.stringify(session.body));
  assert.equal(session.body.clerkUserId, "demo_traveller");
  assert.equal(session.body.sessionAuthority, "clerk");

  const me = await request(server.baseUrl, "/v1/me", "demo_traveller");
  assert.equal(me.response.status, 200);
  assert.equal(me.body.id, demoIds.users.traveller);
  assert.equal(me.body.role, "user");

  const home = await request(server.baseUrl, "/v1/home");
  assert.equal(home.response.status, 200);
  assert.equal(home.body.destinations.length, 8);
  assert.ok(home.body.destinations.some((item: any) => item.id === "demo-destination-1"));

  const hotel = await request(server.baseUrl, "/v1/hotels/demo-hotel-1");
  assert.equal(hotel.response.status, 200);
  assert.equal(hotel.body.id, "demo-hotel-1");

  const publicReviews = await request(server.baseUrl, "/v1/hotels/demo-hotel-2/reviews");
  assert.equal(publicReviews.response.status, 200, JSON.stringify(publicReviews.body));
  assert.equal(publicReviews.body.reviewCount, 1);
  assert.equal(publicReviews.body.items[0].entityId, demoIds.hotels[1]);
  assert.equal(publicReviews.body.items[0].rating, 5);

  const availability = await request(
    server.baseUrl,
    "/v1/hotels/demo-hotel-1/availability?checkIn=2030-06-10&checkOut=2030-06-12&adults=2&children=0&rooms=1",
  );
  assert.equal(availability.response.status, 200);
  assert.equal(availability.body.status, "available");
  assert.equal(availability.body.source, "vendor");
  assert.ok(availability.body.items.length >= 1);

  const unauthorizedBookings = await request(server.baseUrl, "/v1/bookings");
  assert.equal(unauthorizedBookings.response.status, 401);
  const unauthorizedVendor = await request(server.baseUrl, "/v1/vendor/dashboard");
  assert.equal(unauthorizedVendor.response.status, 401);
  const unauthorizedAdmin = await request(server.baseUrl, "/v1/admin/dashboard");
  assert.equal(unauthorizedAdmin.response.status, 401);
  const travellerAdmin = await request(server.baseUrl, "/v1/admin/dashboard", "demo_traveller");
  assert.equal(travellerAdmin.response.status, 403);
  const travellerVendor = await request(server.baseUrl, "/v1/vendor/dashboard", "demo_traveller");
  assert.equal(travellerVendor.response.status, 403);

  const bookings = await request(server.baseUrl, "/v1/bookings", "demo_traveller");
  assert.equal(bookings.response.status, 200);
  assert.deepEqual(
    bookings.body.items.map((item: any) => item.reference).sort(),
    ["DEMO-CANCELLED-01", "DEMO-CONFIRMED-01", "DEMO-PENDING-01"],
  );
  const confirmed = await request(server.baseUrl, "/v1/bookings/DEMO-CONFIRMED-01", "demo_traveller");
  assert.equal(confirmed.response.status, 200);
  assert.equal(confirmed.body.booking.paymentStatus, "paid");
  assert.equal(confirmed.body.booking.status, "confirmed");
  const travellerReviews = await request(server.baseUrl, "/v1/reviews", "demo_traveller");
  assert.equal(travellerReviews.response.status, 200, JSON.stringify(travellerReviews.body));
  assert.equal(travellerReviews.body.items.length, 1);
  assert.equal(travellerReviews.body.items[0].bookingReference, "DEMO-CONFIRMED-01");

  const initialFavorites = await request(server.baseUrl, "/v1/favorites", "demo_traveller");
  assert.equal(initialFavorites.response.status, 200);
  assert.equal(initialFavorites.body.items.length, 2);
  const saved = await request(
    server.baseUrl,
    "/v1/favorites/property/demo-property-4",
    "demo_traveller",
    { method: "PUT" },
  );
  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.entityId, "demo-property-4");
  const afterSave = await request(server.baseUrl, "/v1/favorites", "demo_traveller");
  assert.equal(afterSave.body.items.length, 3);
  const removed = await request(
    server.baseUrl,
    "/v1/favorites/property/demo-property-4",
    "demo_traveller",
    { method: "DELETE" },
  );
  assert.equal(removed.response.status, 204);

  const enquiry = await request(
    server.baseUrl,
    `/v1/properties/${demoProperties[3].slug}/enquiries`,
    "demo_traveller",
    {
      method: "POST",
      body: JSON.stringify({ message: "Can you share the title details?", preferredContactMethod: "email" }),
    },
  );
  assert.equal(enquiry.response.status, 202);
  assert.equal(enquiry.body.status, "new");

  const vendorSession = await request(server.baseUrl, "/v1/auth/session", "demo_vendor");
  assert.equal(vendorSession.response.status, 200);
  const vendorMe = await request(server.baseUrl, "/v1/me", "demo_vendor");
  assert.equal(vendorMe.body.id, demoIds.users.vendor);
  assert.equal(vendorMe.body.role, "vendor");
  assert.equal(vendorMe.body.vendorProfile.status, "approved");
  const vendorDashboard = await request(server.baseUrl, "/v1/vendor/dashboard", "demo_vendor");
  const vendorAdmin = await request(server.baseUrl, "/v1/admin/dashboard", "demo_vendor");
  assert.equal(vendorAdmin.response.status, 403);
  assert.deepEqual(vendorDashboard.body.stats, {
    hotels: 4,
    publishedHotels: 4,
    activeRooms: 8,
    activeBookings: 2,
  });
  const vendorHotels = await request(server.baseUrl, "/v1/vendor/hotels", "demo_vendor");
  assert.equal(vendorHotels.body.total, 4);
  const vendorBookings = await request(server.baseUrl, "/v1/vendor/bookings", "demo_vendor");
  assert.equal(vendorBookings.body.items.length, 3);
  const vendorNotifications = await request(server.baseUrl, "/v1/notifications", "demo_vendor");
  assert.ok(vendorNotifications.body.items.some((item: any) => item.title === "New property enquiry"));

  const adminSession = await request(server.baseUrl, "/v1/auth/session", "demo_admin");
  assert.equal(adminSession.response.status, 200);
  const adminMe = await request(server.baseUrl, "/v1/me", "demo_admin");
  assert.equal(adminMe.body.id, demoIds.users.admin);
  assert.equal(adminMe.body.role, "admin");
  const adminDashboard = await request(server.baseUrl, "/v1/admin/dashboard", "demo_admin");
  assert.equal(adminDashboard.body.users?.total, 3, JSON.stringify(adminDashboard.body));
  assert.equal(adminDashboard.body.vendors.approved, 1);
  assert.equal(adminDashboard.body.hotels.total, 4);
  assert.equal(adminDashboard.body.bookings.total, 3);
  const adminHotels = await request(server.baseUrl, "/v1/admin/hotels", "demo_admin");
  assert.equal(adminHotels.body.items.length, 4);
  const adminProperties = await request(server.baseUrl, "/v1/admin/properties", "demo_admin");
  assert.equal(adminProperties.body.items.length, 8);
  const property = adminProperties.body.items.find((item: any) => item.id === demoProperties[3].id);
  assert.equal(property.enquiryCount, 1);
  const adminBookings = await request(server.baseUrl, "/v1/admin/bookings", "demo_admin");
  assert.equal(adminBookings.body.items.length, 3);
});

test("demo catalogue is absent when demo mode is disabled", { skip: testEnvironment().skip }, async () => {
  if (!databaseUrl) return;
  const script = `
    import express from "express";
    import http from "node:http";
    import { createCatalogRouter } from "./src/routes/catalog.ts";
    const app = express();
    app.use(createCatalogRouter());
    const server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    const response = await fetch("http://127.0.0.1:" + address.port + "/v1/home");
    console.log(JSON.stringify({ status: response.status, body: await response.json() }));
    await new Promise((resolve) => server.close(resolve));
  `;
  const result = await execFileAsync(process.execPath, ["--import", tsxLoader, "--input-type=module", "-e", script], {
    cwd: apiRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DEMO_MODE: "false",
      NODE_ENV: "test",
    },
    maxBuffer: 2_000_000,
  });
  const payload = JSON.parse(result.stdout.trim());
  assert.equal(payload.status, 200);
  assert.equal(payload.body.destinations.some((item: any) => String(item.id).startsWith("demo-")), false);
  assert.equal(payload.body.hotels.some((item: any) => String(item.id).startsWith("demo-")), false);
  assert.equal(payload.body.properties.some((item: any) => String(item.id).startsWith("demo-")), false);
  assert.equal(JSON.stringify(payload.body).includes("Demo "), false);
});