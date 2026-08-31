import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import express from "express";
import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";
import { demoIds, demoProperties, demoReviews } from "@workspace/db/seed-data";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const apiRoot = path.resolve(workspaceRoot, "artifacts/api-server");
const tsxLoader = path.resolve(workspaceRoot, "scripts/node_modules/tsx/dist/loader.mjs");
const databaseUrl = process.env.DEMO_E2E_DATABASE_URL;
const demoE2EPhase = process.env.DEMO_E2E_PHASE ?? "journey";

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

function skipUnlessPhase(phase: "startup" | "journey") {
  if (demoE2EPhase !== phase) {
    return `This test belongs to the ${phase} phase (set DEMO_E2E_PHASE=${phase}).`;
  }
  return testEnvironment().skip;
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

test("API startup/import validation", { skip: skipUnlessPhase("startup") }, async (t) => {
  const { default: app } = await import("../app.ts");
  assert.equal(typeof app, "function");

  const server = await startTestServer();
  t.after(() => server.close());

  const health = await request(server.baseUrl, "/healthz");
  assert.equal(health.response.status, 200, JSON.stringify(health.body));
  assert.deepEqual(health.body, { status: "ok" });
});

test("seeded traveller, vendor, and admin journeys work end to end", { skip: skipUnlessPhase("journey") }, async (t) => {
  await runDemoCommand("reset");
  await runDemoCommand("seed");
  await runDemoCommand("seed");
  await runDemoCommand("reset");
  await runDemoCommand("reset");
  await runDemoCommand("seed");
  let cleanupTemporaryReviews: (() => Promise<void>) | undefined;
  t.after(async () => {
    await cleanupTemporaryReviews?.();
    await runDemoCommand("reset");
  });

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
  assert.equal(hotel.body.hotel.id, "demo-hotel-1");

  const { db, pool, reviews } = await import("@workspace/db");
  const unpublishedReviewIds = {
    pending: "00000000-0000-4117-8000-000000000001",
    rejected: "00000000-0000-4117-8000-000000000002",
    deleted: "00000000-0000-4117-8000-000000000003",
    moderated: "00000000-0000-4117-8000-000000000004",
  };
  cleanupTemporaryReviews = async () => {
    await db.delete(reviews).where(inArray(reviews.id, Object.values(unpublishedReviewIds)));
    await pool.end();
  };
  await db.insert(reviews).values([
    {
      id: unpublishedReviewIds.pending,
      userId: demoIds.users.traveller,
      entityType: "hotel",
      entityId: demoReviews[0].entityId,
      rating: 1,
      title: "Pending review",
      body: "This review is awaiting moderation.",
      status: "pending",
    },
    {
      id: unpublishedReviewIds.rejected,
      userId: demoIds.users.traveller,
      entityType: "hotel",
      entityId: demoReviews[0].entityId,
      rating: 2,
      title: "Rejected review",
      body: "This review was rejected by moderation.",
      status: "rejected",
    },
    {
      id: unpublishedReviewIds.deleted,
      userId: demoIds.users.traveller,
      entityType: "hotel",
      entityId: demoReviews[0].entityId,
      rating: 3,
      title: "Deleted review",
      body: "This review is removed before it can be displayed.",
      status: "pending",
    },
    {
      id: unpublishedReviewIds.moderated,
      userId: demoIds.users.traveller,
      entityType: "hotel",
      entityId: demoReviews[0].entityId,
      rating: 3,
      title: "Moderated review",
      body: "This review changes visibility through the admin moderation flow.",
      status: "published",
    },
  ]);
  await db.delete(reviews).where(eq(reviews.id, unpublishedReviewIds.deleted));

  const hotelBeforeModeration = await request(server.baseUrl, "/v1/hotels/demo-hotel-2");
  assert.equal(hotelBeforeModeration.response.status, 200, JSON.stringify(hotelBeforeModeration.body));
  assert.equal(hotelBeforeModeration.body.hotel.rating, 4);
  assert.equal(hotelBeforeModeration.body.hotel.ratingLabel, "Demo guest note · 4.0");
  const hotelCardsBeforeModeration = await request(server.baseUrl, "/v1/hotels?q=demo%20hotel%202");
  assert.equal(hotelCardsBeforeModeration.response.status, 200, JSON.stringify(hotelCardsBeforeModeration.body));
  assert.equal(hotelCardsBeforeModeration.body.items[0]?.rating, 4);
  assert.equal(hotelCardsBeforeModeration.body.items[0]?.ratingLabel, "Demo guest note · 4.0");

  const publicReviews = await request(server.baseUrl, "/v1/hotels/demo-hotel-2/reviews");
  assert.equal(publicReviews.response.status, 200, JSON.stringify(publicReviews.body));
  assert.equal(publicReviews.body.reviewCount, 2);
  assert.equal(publicReviews.body.ratingAverage, 4);
  assert.deepEqual(
    new Set(publicReviews.body.items.map((item: any) => item.id)),
    new Set([demoReviews[0].id, unpublishedReviewIds.moderated]),
  );
  assert.equal(publicReviews.body.items.every((item: any) => item.status === "published"), true);
  const seededPublicReview = publicReviews.body.items.find((item: any) => item.id === demoReviews[0].id);
  assert.equal(seededPublicReview?.entityId, demoReviews[0].entityId);
  assert.equal(seededPublicReview?.rating, 5);

  const rejectModeratedReview = await request(
    server.baseUrl,
    `/v1/admin/reviews/${unpublishedReviewIds.moderated}/status`,
    "demo_admin",
    {
      method: "POST",
      body: JSON.stringify({ status: "rejected", reason: "Moderation fixture rejection" }),
    },
  );
  assert.equal(rejectModeratedReview.response.status, 200, JSON.stringify(rejectModeratedReview.body));
  assert.equal(rejectModeratedReview.body.status, "rejected");

  const afterRejection = await request(server.baseUrl, "/v1/hotels/demo-hotel-2/reviews");
  assert.equal(afterRejection.response.status, 200, JSON.stringify(afterRejection.body));
  assert.equal(afterRejection.body.reviewCount, 1);
  assert.equal(afterRejection.body.ratingAverage, 5);
  assert.deepEqual(afterRejection.body.items.map((item: any) => item.id), [demoReviews[0].id]);
  const hotelAfterRejection = await request(server.baseUrl, "/v1/hotels/demo-hotel-2");
  assert.equal(hotelAfterRejection.body.hotel.rating, 5);
  assert.equal(hotelAfterRejection.body.hotel.ratingLabel, "Demo guest note · 5.0");
  const hotelCardsAfterRejection = await request(server.baseUrl, "/v1/hotels?q=demo%20hotel%202");
  assert.equal(hotelCardsAfterRejection.body.items[0]?.rating, 5);
  assert.equal(hotelCardsAfterRejection.body.items[0]?.ratingLabel, "Demo guest note · 5.0");

  const republishModeratedReview = await request(
    server.baseUrl,
    `/v1/admin/reviews/${unpublishedReviewIds.moderated}/status`,
    "demo_admin",
    {
      method: "POST",
      body: JSON.stringify({ status: "published", reason: "Moderation fixture republished" }),
    },
  );
  assert.equal(republishModeratedReview.response.status, 200, JSON.stringify(republishModeratedReview.body));
  assert.equal(republishModeratedReview.body.status, "published");

  const afterRepublish = await request(server.baseUrl, "/v1/hotels/demo-hotel-2/reviews");
  assert.equal(afterRepublish.response.status, 200, JSON.stringify(afterRepublish.body));
  assert.equal(afterRepublish.body.reviewCount, 2);
  assert.equal(afterRepublish.body.ratingAverage, 4);
  assert.deepEqual(
    new Set(afterRepublish.body.items.map((item: any) => item.id)),
    new Set([demoReviews[0].id, unpublishedReviewIds.moderated]),
  );
  assert.equal(
    afterRepublish.body.items.find((item: any) => item.id === unpublishedReviewIds.moderated)?.rating,
    3,
  );
  const hotelAfterRepublish = await request(server.baseUrl, "/v1/hotels/demo-hotel-2");
  assert.equal(hotelAfterRepublish.body.hotel.rating, 4);
  assert.equal(hotelAfterRepublish.body.hotel.ratingLabel, "Demo guest note · 4.0");
  const hotelCardsAfterRepublish = await request(server.baseUrl, "/v1/hotels?q=demo%20hotel%202");
  assert.equal(hotelCardsAfterRepublish.body.items[0]?.rating, 4);
  assert.equal(hotelCardsAfterRepublish.body.items[0]?.ratingLabel, "Demo guest note · 4.0");
  await db.delete(reviews).where(eq(reviews.id, unpublishedReviewIds.moderated));

  const availability = await request(
    server.baseUrl,
    "/v1/hotels/demo-hotel-1/availability?checkIn=2030-06-10&checkOut=2030-06-12&adults=2&children=0&rooms=1",
  );
  assert.equal(availability.response.status, 200);
  assert.equal(availability.body.status, "available");
  assert.equal(availability.body.source, "vendor");
  assert.ok(availability.body.items.length >= 1);
  assert.equal(availability.body.items.find((item: any) => item.id === "demo-room-1-1")?.availableUnits, 4);
  const overbooked = await request(
    server.baseUrl,
    "/v1/bookings",
    "demo_traveller",
    {
      method: "POST",
      headers: { "Idempotency-Key": "demo-overbooking-floor-1" },
      body: JSON.stringify({
        hotelId: "demo-hotel-1",
        checkIn: "2030-06-10",
        checkOut: "2030-06-12",
        adults: 2,
        children: 0,
        rooms: 5,
        items: [{ roomId: "demo-room-1-1", quantity: 5 }],
        guest: { name: "Demo Traveller", email: "traveller@demo.travel", phone: "+91 9000000001" },
      }),
    },
  );
  assert.equal(overbooked.response.status, 409, JSON.stringify(overbooked.body));
  assert.equal(overbooked.body.error?.code, "BOOKING_CONFLICT");

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
  assert.equal(travellerReviews.body.items.length, 3);
  assert.deepEqual(
    new Set(travellerReviews.body.items.map((item: any) => item.id)),
    new Set([demoReviews[0].id, unpublishedReviewIds.pending, unpublishedReviewIds.rejected]),
  );
  assert.deepEqual(
    new Set(travellerReviews.body.items.map((item: any) => item.status)),
    new Set(["published", "pending", "rejected"]),
  );
  assert.equal(
    travellerReviews.body.items.find((item: any) => item.id === demoReviews[0].id)?.bookingReference,
    "DEMO-CONFIRMED-01",
  );

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
      headers: { "Idempotency-Key": "demo-property-enquiry-4" },
      body: JSON.stringify({ message: "Can you share the title details?", preferredContactMethod: "email" }),
    },
  );
  assert.equal(enquiry.response.status, 202);
  assert.equal(enquiry.body.status, "new");
  const duplicateEnquiry = await request(
    server.baseUrl,
    `/v1/properties/${demoProperties[3].slug}/enquiries`,
    "demo_traveller",
    {
      method: "POST",
      headers: { "Idempotency-Key": "demo-property-enquiry-4" },
      body: JSON.stringify({ message: "This retry must not create another enquiry.", preferredContactMethod: "email" }),
    },
  );
  assert.equal(duplicateEnquiry.response.status, 202);
  assert.equal(duplicateEnquiry.body.id, enquiry.body.id);
  assert.equal(duplicateEnquiry.body.status, "new");
  assert.match(duplicateEnquiry.body.message, /already recorded/i);

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
  const adminAuditLogs = await request(server.baseUrl, "/v1/admin/audit-logs", "demo_admin");
  assert.equal(adminAuditLogs.response.status, 200, JSON.stringify(adminAuditLogs.body));
  assert.ok(adminAuditLogs.body.meta.total >= 2);
  const reviewAudit = adminAuditLogs.body.items.find((item: any) => item.action === "status_updated" && item.entityType === "review");
  assert.ok(reviewAudit);
  const auditDetail = await request(server.baseUrl, `/v1/admin/audit-logs/${reviewAudit.id}`, "demo_admin");
  assert.equal(auditDetail.response.status, 200, JSON.stringify(auditDetail.body));
  assert.equal(auditDetail.body.id, reviewAudit.id);
});

test("demo catalogue is absent when demo mode is disabled", { skip: skipUnlessPhase("journey") }, async () => {
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