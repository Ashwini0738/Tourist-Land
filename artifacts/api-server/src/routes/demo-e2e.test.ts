import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { and, eq, gte, inArray } from "drizzle-orm";
import express from "express";
import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";
import {
  demoBookings,
  demoDestinations,
  demoEnquiries,
  demoHotels,
  demoIds,
  demoPayments,
  demoProperties,
  demoReviews,
  demoRooms,
  demoVendorTwoBookings,
  demoVendorTwoEnquiries,
  demoVendorTwoHotels,
  demoVendorTwoPayments,
  demoVendorTwoProperties,
  demoVendorTwoReviews,
} from "@workspace/db/seed-data";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const apiRoot = path.resolve(workspaceRoot, "artifacts/api-server");
const tsxLoader = path.resolve(
  workspaceRoot,
  "scripts/node_modules/tsx/dist/loader.mjs",
);
const databaseUrl = process.env.DEMO_E2E_DATABASE_URL;
const demoE2EPhase = process.env.DEMO_E2E_PHASE ?? "journey";

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DEMO_MODE = "true";
  process.env.NODE_ENV = "test";
}

function testEnvironment() {
  if (!databaseUrl)
    return {
      skip: "Set DEMO_E2E_DATABASE_URL to a disposable local Postgres database.",
    };
  assertSafeDemoEnvironment(
    {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DEMO_MODE: "true",
      NODE_ENV: "test",
    },
    "demo e2e test",
  );
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
  await execFileAsync(
    "pnpm",
    ["--filter", "@workspace/scripts", `demo:${action}`],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DEMO_MODE: "true",
        NODE_ENV: "test",
      },
      maxBuffer: 2_000_000,
    },
  );
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
          ? {
              sub: clerkUserId,
              sid: `demo-session-${clerkUserId}`,
              sts: "active",
            }
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
  if (!address || typeof address === "string")
    throw new Error("Test server did not expose a TCP address.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}/api`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
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
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}${route}`, { ...init, headers });
  const text = await response.text();
  if (
    text &&
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    throw new Error(
      `Expected JSON from ${route}, received HTTP ${response.status}: ${text.slice(0, 120)}`,
    );
  }
  return {
    response,
    body: text ? (JSON.parse(text) as Record<string, any>) : {},
  };
}

test(
  "simultaneous bookings cannot oversell the final available room",
  { skip: skipUnlessPhase("journey") },
  async (t) => {
    await runDemoCommand("reset");
    await runDemoCommand("seed");

    const {
      db,
      bookingItems,
      bookings,
      notifications,
      payments,
      roomAvailability,
    } = await import("@workspace/db");
    const room = demoRooms[0];
    const bookingKeys = [
      "demo-concurrent-booking-a",
      "demo-concurrent-booking-b",
    ];
    const checkIn = "2030-06-10";
    const checkOut = "2030-06-12";
    const testStartedAt = new Date();

    await db
      .update(roomAvailability)
      .set({ availableUnits: 2 })
      .where(
        and(
          eq(roomAvailability.roomId, room.id),
          inArray(roomAvailability.date, [checkIn, "2030-06-11"]),
        ),
      );

    const server = await startTestServer();
    t.after(() => server.close());
    t.after(async () => {
      const createdBookings = await db
        .select({
          id: bookings.id,
          reference: bookings.reference,
          idempotencyKey: bookings.idempotencyKey,
        })
        .from(bookings)
        .where(inArray(bookings.idempotencyKey, bookingKeys));
      const createdBookingIds = createdBookings.map((booking) => booking.id);
      if (createdBookingIds.length) {
        await db
          .delete(payments)
          .where(inArray(payments.bookingId, createdBookingIds));
        await db
          .delete(bookingItems)
          .where(inArray(bookingItems.bookingId, createdBookingIds));
        await db
          .delete(bookings)
          .where(inArray(bookings.id, createdBookingIds));
        const generatedNotifications = await db
          .select({ id: notifications.id, data: notifications.data })
          .from(notifications)
          .where(eq(notifications.userId, demoIds.users.traveller));
        const notificationIds = generatedNotifications
          .filter(
            (notification) =>
              notification.data &&
              typeof notification.data === "object" &&
              !Array.isArray(notification.data) &&
              createdBookings.some(
                (booking) =>
                  (notification.data as Record<string, unknown>).relatedId ===
                  booking.reference,
              ),
          )
          .map((notification) => notification.id);
        if (notificationIds.length)
          await db
            .delete(notifications)
            .where(inArray(notifications.id, notificationIds));
      }
      await runDemoCommand("reset");
    });

    const availability = await request(
      server.baseUrl,
      `/v1/hotels/demo-hotel-1/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0&rooms=1`,
    );
    assert.equal(
      availability.response.status,
      200,
      JSON.stringify(availability.body),
    );
    assert.equal(
      availability.body.items.find(
        (item: any) => item.id === room.catalogRoomId,
      )?.availableUnits,
      1,
    );

    const bookingBody = {
      hotelId: "demo-hotel-1",
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      rooms: 1,
      items: [{ roomId: room.catalogRoomId, quantity: 1 }],
      guest: {
        name: "Demo Traveller",
        email: "traveller@demo.travel",
        phone: "+91 9000000001",
      },
    };
    const results = await Promise.all(
      bookingKeys.map((idempotencyKey) =>
        request(server.baseUrl, "/v1/bookings", "demo_traveller", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(bookingBody),
        }),
      ),
    );

    assert.deepEqual(
      results.map((result) => result.response.status).sort((a, b) => a - b),
      [201, 409],
      JSON.stringify(results.map((result) => result.body)),
    );
    const winnerIndex = results.findIndex(
      (result) => result.response.status === 201,
    );
    const loser = results.find((result) => result.response.status === 409);
    assert.notEqual(winnerIndex, -1);
    assert.equal(loser?.body.error?.code, "BOOKING_CONFLICT");
    assert.match(loser?.body.error?.message ?? "", /no longer available/i);

    const createdBookings = await db
      .select({
        id: bookings.id,
        idempotencyKey: bookings.idempotencyKey,
      })
      .from(bookings)
      .where(inArray(bookings.idempotencyKey, bookingKeys));
    assert.equal(createdBookings.length, 1);
    assert.equal(createdBookings[0].idempotencyKey, bookingKeys[winnerIndex]);

    const createdBookingIds = createdBookings.map((booking) => booking.id);
    const createdItems = await db
      .select({ bookingId: bookingItems.bookingId })
      .from(bookingItems)
      .where(inArray(bookingItems.bookingId, createdBookingIds));
    assert.deepEqual(
      createdItems.map((item) => item.bookingId),
      createdBookingIds,
    );
    const newPayments = await db
      .select({ bookingId: payments.bookingId })
      .from(payments)
      .where(
        and(
          eq(payments.userId, demoIds.users.traveller),
          eq(payments.provider, "stripe"),
          gte(payments.createdAt, testStartedAt),
        ),
      );
    assert.deepEqual(
      newPayments.map((payment) => payment.bookingId),
      createdBookingIds,
    );
  },
);

test(
  "concurrent booking retries return one saved booking and payment",
  { skip: skipUnlessPhase("journey") },
  async (t) => {
    await runDemoCommand("reset");
    await runDemoCommand("seed");

    const { db, bookingItems, bookings, notifications, payments } =
      await import("@workspace/db");
    const bookingKey = "demo-concurrent-booking-retry";
    const testStartedAt = new Date();
    const server = await startTestServer();
    t.after(() => server.close());
    t.after(async () => {
      const createdBookings = await db
        .select({
          id: bookings.id,
          reference: bookings.reference,
        })
        .from(bookings)
        .where(eq(bookings.idempotencyKey, bookingKey));
      const createdBookingIds = createdBookings.map((booking) => booking.id);
      if (createdBookingIds.length) {
        const generatedNotifications = await db
          .select({ id: notifications.id, data: notifications.data })
          .from(notifications)
          .where(eq(notifications.userId, demoIds.users.traveller));
        const notificationIds = generatedNotifications
          .filter(
            (notification) =>
              notification.data &&
              typeof notification.data === "object" &&
              !Array.isArray(notification.data) &&
              createdBookings.some(
                (booking) =>
                  (notification.data as Record<string, unknown>).relatedId ===
                  booking.reference,
              ),
          )
          .map((notification) => notification.id);
        if (notificationIds.length)
          await db
            .delete(notifications)
            .where(inArray(notifications.id, notificationIds));
        await db
          .delete(payments)
          .where(inArray(payments.bookingId, createdBookingIds));
        await db
          .delete(bookingItems)
          .where(inArray(bookingItems.bookingId, createdBookingIds));
        await db
          .delete(bookings)
          .where(inArray(bookings.id, createdBookingIds));
      }
      await runDemoCommand("reset");
    });

    const bookingBody = {
      hotelId: "demo-hotel-1",
      checkIn: "2030-06-10",
      checkOut: "2030-06-12",
      adults: 2,
      children: 0,
      rooms: 1,
      items: [{ roomId: demoRooms[0].catalogRoomId, quantity: 1 }],
      guest: {
        name: "Demo Traveller",
        email: "traveller@demo.travel",
        phone: "+91 9000000001",
      },
    };
    const results = await Promise.all(
      [1, 2].map(() =>
        request(server.baseUrl, "/v1/bookings", "demo_traveller", {
          method: "POST",
          headers: { "Idempotency-Key": bookingKey },
          body: JSON.stringify(bookingBody),
        }),
      ),
    );

    assert.deepEqual(
      results.map((result) => result.response.status),
      [201, 201],
      JSON.stringify(results.map((result) => result.body)),
    );
    assert.deepEqual(results[0].body, results[1].body);

    const createdBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.idempotencyKey, bookingKey));
    assert.equal(createdBookings.length, 1);

    const createdItems = await db
      .select({ bookingId: bookingItems.bookingId })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, createdBookings[0].id));
    assert.equal(createdItems.length, 1);

    const newPayments = await db
      .select({ bookingId: payments.bookingId })
      .from(payments)
      .where(
        and(
          eq(payments.userId, demoIds.users.traveller),
          eq(payments.provider, "stripe"),
          gte(payments.createdAt, testStartedAt),
        ),
      );
    assert.deepEqual(
      newPayments.map((payment) => payment.bookingId),
      [createdBookings[0].id],
    );
  },
);

test(
  "seeded reports aggregate currencies, filters, and vendor-owned records",
  { skip: skipUnlessPhase("journey") },
  async (t) => {
    await runDemoCommand("reset");
    await runDemoCommand("seed");

    process.env.DATABASE_URL = databaseUrl;
    process.env.DEMO_MODE = "true";
    process.env.NODE_ENV = "test";
    const {
      db,
      bookings,
      destinations,
      hotelRooms,
      hotels,
      notifications,
      payments,
      properties,
      propertyEnquiries,
      reviews,
      userRoles,
      users,
      vendorProfiles,
      wallets,
    } = await import("@workspace/db");
    const primaryBookingIds = demoBookings.map((booking) => booking.id);
    const secondaryBookingIds = demoVendorTwoBookings.map(
      (booking) => booking.id,
    );
    const primaryHotelIds = demoHotels.map((hotel) => hotel.id);
    const secondaryHotelIds = demoVendorTwoHotels.map((hotel) => hotel.id);
    const primaryPropertyIds = demoProperties.map((property) => property.id);
    const secondaryPropertyIds = demoVendorTwoProperties.map(
      (property) => property.id,
    );
    const primaryEnquiryIds = demoEnquiries.map((enquiry) => enquiry.id);
    const secondaryEnquiryIds = demoVendorTwoEnquiries.map(
      (enquiry) => enquiry.id,
    );
    const primaryPaymentIds = demoPayments.map((payment) => payment.id);
    const secondaryPaymentIds = demoVendorTwoPayments.map(
      (payment) => payment.id,
    );
    const primaryReviewIds = demoReviews.map((review) => review.id);
    const secondaryReviewIds = demoVendorTwoReviews.map((review) => review.id);
    const reportDate = new Date("2030-06-10T12:00:00Z");
    const secondVendorReportDate = new Date("2030-06-11T12:00:00Z");

    await Promise.all([
      db
        .update(users)
        .set({ createdAt: reportDate })
        .where(
          inArray(users.id, [
            demoIds.users.traveller,
            demoIds.users.vendor,
            demoIds.users.admin,
          ]),
        ),
      db
        .update(users)
        .set({ createdAt: secondVendorReportDate })
        .where(eq(users.id, demoIds.users.vendorTwo)),
      db
        .update(userRoles)
        .set({ createdAt: reportDate })
        .where(
          inArray(userRoles.userId, [
            demoIds.users.traveller,
            demoIds.users.vendor,
            demoIds.users.admin,
          ]),
        ),
      db
        .update(userRoles)
        .set({ createdAt: secondVendorReportDate })
        .where(eq(userRoles.userId, demoIds.users.vendorTwo)),
      db
        .update(vendorProfiles)
        .set({ createdAt: reportDate })
        .where(eq(vendorProfiles.userId, demoIds.users.vendor)),
      db
        .update(vendorProfiles)
        .set({ createdAt: secondVendorReportDate })
        .where(eq(vendorProfiles.userId, demoIds.users.vendorTwo)),
      db
        .update(destinations)
        .set({ createdAt: reportDate })
        .where(
          inArray(
            destinations.id,
            demoDestinations.map((destination) => destination.id),
          ),
        ),
      db
        .update(hotels)
        .set({ createdAt: reportDate })
        .where(inArray(hotels.id, primaryHotelIds)),
      db
        .update(hotels)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(hotels.id, secondaryHotelIds)),
      db
        .update(hotelRooms)
        .set({ createdAt: reportDate })
        .where(inArray(hotelRooms.hotelId, primaryHotelIds)),
      db
        .update(hotelRooms)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(hotelRooms.hotelId, secondaryHotelIds)),
      db
        .update(properties)
        .set({ createdAt: reportDate })
        .where(inArray(properties.id, primaryPropertyIds)),
      db
        .update(properties)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(properties.id, secondaryPropertyIds)),
      db
        .update(propertyEnquiries)
        .set({ createdAt: reportDate })
        .where(inArray(propertyEnquiries.id, primaryEnquiryIds)),
      db
        .update(propertyEnquiries)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(propertyEnquiries.id, secondaryEnquiryIds)),
      db
        .update(bookings)
        .set({ createdAt: reportDate })
        .where(inArray(bookings.id, primaryBookingIds)),
      db
        .update(bookings)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(bookings.id, secondaryBookingIds)),
      db
        .update(payments)
        .set({ createdAt: reportDate })
        .where(inArray(payments.id, primaryPaymentIds)),
      db
        .update(payments)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(payments.id, secondaryPaymentIds)),
      db
        .update(reviews)
        .set({ createdAt: reportDate })
        .where(inArray(reviews.id, primaryReviewIds)),
      db
        .update(reviews)
        .set({ createdAt: secondVendorReportDate })
        .where(inArray(reviews.id, secondaryReviewIds)),
      db.update(notifications).set({ createdAt: reportDate }),
      db.update(wallets).set({ createdAt: reportDate }),
    ]);

    t.after(async () => {
      await runDemoCommand("reset");
    });
    const server = await startTestServer();
    t.after(() => server.close());
    const range = "?from=2030-06-10&to=2030-06-11&limit=100";

    const admin = await request(
      server.baseUrl,
      `/v1/admin/reports${range}`,
      "demo_admin",
    );
    assert.equal(admin.response.status, 200, JSON.stringify(admin.body));
    assert.equal(admin.body.role, "admin");
    assert.equal(admin.body.source, "database");
    assert.equal(admin.body.provenance, "demo");
    assert.deepEqual(admin.body.range, {
      from: "2030-06-10",
      to: "2030-06-11",
    });
    assert.deepEqual(admin.body.kpis, {
      users: 4,
      vendors: 2,
      hotels: 5,
      destinations: 8,
      properties: 9,
      bookings: 4,
      enquiries: 4,
      reviews: 2,
      notifications: 2,
      payments: 4,
      paidPayments: 2,
      averageRating: 4.5,
      wallets: 2,
    });
    assert.deepEqual(admin.body.currencies.bookings, [
      { currency: "INR", amount: 45600, records: 3 },
      { currency: "USD", amount: 125, records: 1 },
    ]);
    assert.deepEqual(admin.body.currencies.payments, [
      { currency: "INR", amount: 45600, records: 3 },
      { currency: "USD", amount: 125, records: 1 },
    ]);
    assert.deepEqual(
      admin.body.tables.bookings.map((row: any) => row.reference).sort(),
      [
        "DEMO-CANCELLED-01",
        "DEMO-CONFIRMED-01",
        "DEMO-PENDING-01",
        "DEMO-USD-01",
      ].sort(),
    );
    assert.deepEqual(
      admin.body.tables.payments.map((row: any) => row.bookingReference).sort(),
      [
        "DEMO-CANCELLED-01",
        "DEMO-CONFIRMED-01",
        "DEMO-PENDING-01",
        "DEMO-USD-01",
      ].sort(),
    );

    const india = await request(
      server.baseUrl,
      `/v1/admin/reports${range}&country=India`,
      "demo_admin",
    );
    assert.equal(india.response.status, 200, JSON.stringify(india.body));
    assert.equal(india.body.filters.country, "India");
    assert.equal(india.body.kpis.hotels, 4);
    assert.equal(india.body.kpis.bookings, 3);
    assert.deepEqual(
      india.body.tables.bookings.map((row: any) => row.reference).sort(),
      ["DEMO-CANCELLED-01", "DEMO-CONFIRMED-01", "DEMO-PENDING-01"].sort(),
    );

    const nepal = await request(
      server.baseUrl,
      `/v1/admin/reports${range}&country=Nepal`,
      "demo_admin",
    );
    assert.equal(nepal.response.status, 200, JSON.stringify(nepal.body));
    assert.equal(nepal.body.kpis.hotels, 1);
    assert.equal(nepal.body.kpis.bookings, 1);
    assert.deepEqual(
      nepal.body.tables.bookings.map((row: any) => row.reference),
      ["DEMO-USD-01"],
    );

    const paid = await request(
      server.baseUrl,
      `/v1/admin/reports${range}&status=paid`,
      "demo_admin",
    );
    assert.equal(paid.response.status, 200, JSON.stringify(paid.body));
    assert.equal(paid.body.kpis.bookings, 0);
    assert.equal(paid.body.kpis.payments, 2);
    assert.deepEqual(
      paid.body.tables.payments.map((row: any) => row.bookingReference).sort(),
      ["DEMO-CONFIRMED-01", "DEMO-USD-01"],
    );

    const vendor = await request(
      server.baseUrl,
      `/v1/vendor/reports${range}`,
      "demo_vendor",
    );
    assert.equal(vendor.response.status, 200, JSON.stringify(vendor.body));
    assert.equal(vendor.body.role, "vendor");
    assert.equal(vendor.body.kpis.hotels, 4);
    assert.equal(vendor.body.kpis.rooms, 8);
    assert.equal(vendor.body.kpis.properties, 8);
    assert.equal(vendor.body.kpis.bookings, 3);
    assert.equal(vendor.body.kpis.enquiries, 3);
    assert.equal(vendor.body.kpis.reviews, 1);
    assert.equal(vendor.body.kpis.payments, 3);
    assert.deepEqual(vendor.body.currencies.bookings, [
      { currency: "INR", amount: 45600, records: 3 },
    ]);
    assert.deepEqual(vendor.body.currencies.payments, [
      { currency: "INR", amount: 45600, records: 3 },
    ]);
    assert.deepEqual(
      vendor.body.tables.bookings.map((row: any) => row.reference).sort(),
      ["DEMO-CANCELLED-01", "DEMO-CONFIRMED-01", "DEMO-PENDING-01"].sort(),
    );
    assert.deepEqual(
      vendor.body.tables.properties.map((row: any) => row.id).sort(),
      primaryPropertyIds.sort(),
    );
    assert.deepEqual(
      vendor.body.tables.enquiries.map((row: any) => row.id).sort(),
      primaryEnquiryIds.sort(),
    );
    assert.deepEqual(vendor.body.breakdowns.reviewRatings, [
      { rating: 5, count: 1 },
    ]);
    assert.equal(
      vendor.body.tables.bookings.some(
        (row: any) => row.reference === "DEMO-USD-01",
      ),
      false,
    );
    assert.equal(
      vendor.body.tables.payments.some(
        (row: any) => row.bookingReference === "DEMO-USD-01",
      ),
      false,
    );

    const vendorPaid = await request(
      server.baseUrl,
      `/v1/vendor/reports${range}&status=paid`,
      "demo_vendor",
    );
    assert.equal(
      vendorPaid.response.status,
      200,
      JSON.stringify(vendorPaid.body),
    );
    assert.equal(vendorPaid.body.kpis.bookings, 0);
    assert.equal(vendorPaid.body.kpis.payments, 1);
    assert.deepEqual(
      vendorPaid.body.tables.payments.map((row: any) => row.bookingReference),
      ["DEMO-CONFIRMED-01"],
    );

    const vendorTwo = await request(
      server.baseUrl,
      `/v1/vendor/reports${range}`,
      "demo_vendor_two",
    );
    assert.equal(
      vendorTwo.response.status,
      200,
      JSON.stringify(vendorTwo.body),
    );
    assert.equal(vendorTwo.body.kpis.hotels, 1);
    assert.equal(vendorTwo.body.kpis.rooms, 1);
    assert.equal(vendorTwo.body.kpis.properties, 1);
    assert.equal(vendorTwo.body.kpis.bookings, 1);
    assert.equal(vendorTwo.body.kpis.enquiries, 1);
    assert.equal(vendorTwo.body.kpis.reviews, 1);
    assert.equal(vendorTwo.body.kpis.payments, 1);
    assert.deepEqual(vendorTwo.body.currencies.bookings, [
      { currency: "USD", amount: 125, records: 1 },
    ]);
    assert.deepEqual(vendorTwo.body.currencies.payments, [
      { currency: "USD", amount: 125, records: 1 },
    ]);
    assert.deepEqual(
      vendorTwo.body.tables.bookings.map((row: any) => row.reference),
      ["DEMO-USD-01"],
    );
    assert.deepEqual(
      vendorTwo.body.tables.properties.map((row: any) => row.id),
      secondaryPropertyIds,
    );
    assert.deepEqual(
      vendorTwo.body.tables.enquiries.map((row: any) => row.id),
      secondaryEnquiryIds,
    );
    assert.deepEqual(vendorTwo.body.breakdowns.reviewRatings, [
      { rating: 4, count: 1 },
    ]);
    assert.equal(
      vendorTwo.body.tables.bookings.some(
        (row: any) => row.reference === "DEMO-CONFIRMED-01",
      ),
      false,
    );
    assert.equal(
      vendorTwo.body.tables.payments.some(
        (row: any) => row.bookingReference === "DEMO-CONFIRMED-01",
      ),
      false,
    );

    const vendorTwoIndia = await request(
      server.baseUrl,
      `/v1/vendor/reports${range}&country=India`,
      "demo_vendor_two",
    );
    assert.equal(
      vendorTwoIndia.response.status,
      200,
      JSON.stringify(vendorTwoIndia.body),
    );
    assert.equal(vendorTwoIndia.body.kpis.hotels, 0);
    assert.equal(vendorTwoIndia.body.kpis.bookings, 0);
    assert.equal(vendorTwoIndia.body.kpis.payments, 0);
    assert.equal(vendorTwoIndia.body.tables.bookings.length, 0);

    const empty = await request(
      server.baseUrl,
      "/v1/admin/reports?from=2031-01-01&to=2031-01-02",
      "demo_admin",
    );
    assert.equal(empty.response.status, 200, JSON.stringify(empty.body));
    assert.deepEqual(empty.body.kpis, {
      users: 0,
      vendors: 0,
      hotels: 0,
      destinations: 0,
      properties: 0,
      bookings: 0,
      enquiries: 0,
      reviews: 0,
      notifications: 0,
      payments: 0,
      paidPayments: 0,
      averageRating: 0,
      wallets: 0,
    });
    assert.equal(empty.body.tables.bookings.length, 0);
    assert.equal(empty.body.tables.payments.length, 0);
    assert.equal(empty.body.trends.length, 2);
    assert.ok(
      empty.body.trends.every(
        (row: any) =>
          row.bookings === 0 &&
          row.payments === 0 &&
          row.enquiries === 0 &&
          row.reviews === 0,
      ),
    );
  },
);

test(
  "API startup/import validation",
  { skip: skipUnlessPhase("startup") },
  async (t) => {
    const { default: app } = await import("../app.ts");
    assert.equal(typeof app, "function");

    const server = await startTestServer();
    t.after(() => server.close());

    const health = await request(server.baseUrl, "/healthz");
    assert.equal(health.response.status, 200, JSON.stringify(health.body));
    assert.deepEqual(health.body, { status: "ok" });
  },
);

test(
  "seeded traveller, vendor, and admin journeys work end to end",
  { skip: skipUnlessPhase("journey") },
  async (t) => {
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

    const session = await request(
      server.baseUrl,
      "/v1/auth/session",
      "demo_traveller",
    );
    assert.equal(session.response.status, 200, JSON.stringify(session.body));
    assert.equal(session.body.clerkUserId, "demo_traveller");
    assert.equal(session.body.sessionAuthority, "clerk");

    const me = await request(server.baseUrl, "/v1/me", "demo_traveller");
    assert.equal(me.response.status, 200);
    assert.equal(me.body.id, demoIds.users.traveller);
    assert.equal(me.body.role, "user");

    const travellerEnquiries = await request(
      server.baseUrl,
      "/v1/me/enquiries",
      "demo_traveller",
    );
    assert.equal(
      travellerEnquiries.response.status,
      200,
      JSON.stringify(travellerEnquiries.body),
    );
    assert.equal(travellerEnquiries.body.items.length, 4);
    assert.deepEqual(Object.keys(travellerEnquiries.body.items[0]).sort(), [
      "createdAt",
      "history",
      "id",
      "property",
      "status",
    ]);
    assert.deepEqual(
      Object.keys(travellerEnquiries.body.items[0].property).sort(),
      ["address", "id", "title"],
    );
    assert.equal(
      JSON.stringify(travellerEnquiries.body).includes("sourcing specialist"),
      false,
    );
    const firstTravellerEnquiry = travellerEnquiries.body.items[0];
    const travellerEnquiryDetail = await request(
      server.baseUrl,
      `/v1/me/enquiries/${firstTravellerEnquiry.id}`,
      "demo_traveller",
    );
    assert.equal(
      travellerEnquiryDetail.response.status,
      200,
      JSON.stringify(travellerEnquiryDetail.body),
    );
    assert.equal(travellerEnquiryDetail.body.id, firstTravellerEnquiry.id);
    const otherTravellerRead = await request(
      server.baseUrl,
      `/v1/me/enquiries/${firstTravellerEnquiry.id}`,
      "demo_vendor",
    );
    assert.equal(otherTravellerRead.response.status, 404);
    assert.equal(
      (await request(server.baseUrl, "/v1/me/enquiries", "demo_vendor")).body
        .items.length,
      0,
    );

    const home = await request(server.baseUrl, "/v1/home");
    assert.equal(home.response.status, 200);
    assert.equal(home.body.destinations.length, 8);
    assert.ok(
      home.body.destinations.some(
        (item: any) => item.id === "demo-destination-1",
      ),
    );

    const hotel = await request(server.baseUrl, "/v1/hotels/demo-hotel-1");
    assert.equal(hotel.response.status, 200);
    assert.equal(hotel.body.hotel.id, "demo-hotel-1");

    const { db, pool, properties, reviews } = await import("@workspace/db");
    const unpublishedReviewIds = {
      pending: "00000000-0000-4117-8000-000000000001",
      rejected: "00000000-0000-4117-8000-000000000002",
      deleted: "00000000-0000-4117-8000-000000000003",
      moderated: "00000000-0000-4117-8000-000000000004",
    };
    cleanupTemporaryReviews = async () => {
      await db
        .delete(reviews)
        .where(inArray(reviews.id, Object.values(unpublishedReviewIds)));
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
    await db
      .delete(reviews)
      .where(eq(reviews.id, unpublishedReviewIds.deleted));

    const hotelBeforeModeration = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-2",
    );
    assert.equal(
      hotelBeforeModeration.response.status,
      200,
      JSON.stringify(hotelBeforeModeration.body),
    );
    assert.equal(hotelBeforeModeration.body.hotel.rating, 4);
    assert.equal(
      hotelBeforeModeration.body.hotel.ratingLabel,
      "Demo guest note · 4.0",
    );
    const hotelCardsBeforeModeration = await request(
      server.baseUrl,
      "/v1/hotels?q=demo%20hotel%202",
    );
    assert.equal(
      hotelCardsBeforeModeration.response.status,
      200,
      JSON.stringify(hotelCardsBeforeModeration.body),
    );
    assert.equal(hotelCardsBeforeModeration.body.items[0]?.rating, 4);
    assert.equal(
      hotelCardsBeforeModeration.body.items[0]?.ratingLabel,
      "Demo guest note · 4.0",
    );

    const publicReviews = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-2/reviews",
    );
    assert.equal(
      publicReviews.response.status,
      200,
      JSON.stringify(publicReviews.body),
    );
    assert.equal(publicReviews.body.reviewCount, 2);
    assert.equal(publicReviews.body.ratingAverage, 4);
    assert.deepEqual(
      new Set(publicReviews.body.items.map((item: any) => item.id)),
      new Set([demoReviews[0].id, unpublishedReviewIds.moderated]),
    );
    assert.equal(
      publicReviews.body.items.every(
        (item: any) => item.status === "published",
      ),
      true,
    );
    const seededPublicReview = publicReviews.body.items.find(
      (item: any) => item.id === demoReviews[0].id,
    );
    assert.equal(seededPublicReview?.entityId, demoReviews[0].entityId);
    assert.equal(seededPublicReview?.rating, 5);

    const rejectModeratedReview = await request(
      server.baseUrl,
      `/v1/admin/reviews/${unpublishedReviewIds.moderated}/status`,
      "demo_admin",
      {
        method: "POST",
        body: JSON.stringify({
          status: "rejected",
          reason: "Moderation fixture rejection",
        }),
      },
    );
    assert.equal(
      rejectModeratedReview.response.status,
      200,
      JSON.stringify(rejectModeratedReview.body),
    );
    assert.equal(rejectModeratedReview.body.status, "rejected");

    const afterRejection = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-2/reviews",
    );
    assert.equal(
      afterRejection.response.status,
      200,
      JSON.stringify(afterRejection.body),
    );
    assert.equal(afterRejection.body.reviewCount, 1);
    assert.equal(afterRejection.body.ratingAverage, 5);
    assert.deepEqual(
      afterRejection.body.items.map((item: any) => item.id),
      [demoReviews[0].id],
    );
    const hotelAfterRejection = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-2",
    );
    assert.equal(hotelAfterRejection.body.hotel.rating, 5);
    assert.equal(
      hotelAfterRejection.body.hotel.ratingLabel,
      "Demo guest note · 5.0",
    );
    const hotelCardsAfterRejection = await request(
      server.baseUrl,
      "/v1/hotels?q=demo%20hotel%202",
    );
    assert.equal(hotelCardsAfterRejection.body.items[0]?.rating, 5);
    assert.equal(
      hotelCardsAfterRejection.body.items[0]?.ratingLabel,
      "Demo guest note · 5.0",
    );

    const republishModeratedReview = await request(
      server.baseUrl,
      `/v1/admin/reviews/${unpublishedReviewIds.moderated}/status`,
      "demo_admin",
      {
        method: "POST",
        body: JSON.stringify({
          status: "published",
          reason: "Moderation fixture republished",
        }),
      },
    );
    assert.equal(
      republishModeratedReview.response.status,
      200,
      JSON.stringify(republishModeratedReview.body),
    );
    assert.equal(republishModeratedReview.body.status, "published");

    const afterRepublish = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-2/reviews",
    );
    assert.equal(
      afterRepublish.response.status,
      200,
      JSON.stringify(afterRepublish.body),
    );
    assert.equal(afterRepublish.body.reviewCount, 2);
    assert.equal(afterRepublish.body.ratingAverage, 4);
    assert.deepEqual(
      new Set(afterRepublish.body.items.map((item: any) => item.id)),
      new Set([demoReviews[0].id, unpublishedReviewIds.moderated]),
    );
    assert.equal(
      afterRepublish.body.items.find(
        (item: any) => item.id === unpublishedReviewIds.moderated,
      )?.rating,
      3,
    );
    const hotelAfterRepublish = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-2",
    );
    assert.equal(hotelAfterRepublish.body.hotel.rating, 4);
    assert.equal(
      hotelAfterRepublish.body.hotel.ratingLabel,
      "Demo guest note · 4.0",
    );
    const hotelCardsAfterRepublish = await request(
      server.baseUrl,
      "/v1/hotels?q=demo%20hotel%202",
    );
    assert.equal(hotelCardsAfterRepublish.body.items[0]?.rating, 4);
    assert.equal(
      hotelCardsAfterRepublish.body.items[0]?.ratingLabel,
      "Demo guest note · 4.0",
    );
    await db
      .delete(reviews)
      .where(eq(reviews.id, unpublishedReviewIds.moderated));

    const availability = await request(
      server.baseUrl,
      "/v1/hotels/demo-hotel-1/availability?checkIn=2030-06-10&checkOut=2030-06-12&adults=2&children=0&rooms=1",
    );
    assert.equal(availability.response.status, 200);
    assert.equal(availability.body.status, "available");
    assert.equal(availability.body.source, "vendor");
    assert.ok(availability.body.items.length >= 1);
    assert.equal(
      availability.body.items.find((item: any) => item.id === "demo-room-1-1")
        ?.availableUnits,
      3,
    );
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
          guest: {
            name: "Demo Traveller",
            email: "traveller@demo.travel",
            phone: "+91 9000000001",
          },
        }),
      },
    );
    assert.equal(
      overbooked.response.status,
      409,
      JSON.stringify(overbooked.body),
    );
    assert.equal(overbooked.body.error?.code, "BOOKING_CONFLICT");

    const unauthorizedBookings = await request(server.baseUrl, "/v1/bookings");
    assert.equal(unauthorizedBookings.response.status, 401);
    const unauthorizedVendor = await request(
      server.baseUrl,
      "/v1/vendor/dashboard",
    );
    assert.equal(unauthorizedVendor.response.status, 401);
    const unauthorizedAdmin = await request(
      server.baseUrl,
      "/v1/admin/dashboard",
    );
    assert.equal(unauthorizedAdmin.response.status, 401);
    const travellerAdmin = await request(
      server.baseUrl,
      "/v1/admin/dashboard",
      "demo_traveller",
    );
    assert.equal(travellerAdmin.response.status, 403);
    const travellerVendor = await request(
      server.baseUrl,
      "/v1/vendor/dashboard",
      "demo_traveller",
    );
    assert.equal(travellerVendor.response.status, 403);

    const bookings = await request(
      server.baseUrl,
      "/v1/bookings",
      "demo_traveller",
    );
    assert.equal(bookings.response.status, 200);
    assert.deepEqual(
      bookings.body.items.map((item: any) => item.reference).sort(),
      [
        "DEMO-CANCELLED-01",
        "DEMO-CONFIRMED-01",
        "DEMO-PENDING-01",
        "DEMO-USD-01",
      ],
    );
    const confirmed = await request(
      server.baseUrl,
      "/v1/bookings/DEMO-CONFIRMED-01",
      "demo_traveller",
    );
    assert.equal(confirmed.response.status, 200);
    assert.equal(confirmed.body.booking.paymentStatus, "paid");
    assert.equal(confirmed.body.booking.status, "confirmed");
    const travellerReviews = await request(
      server.baseUrl,
      "/v1/reviews",
      "demo_traveller",
    );
    assert.equal(
      travellerReviews.response.status,
      200,
      JSON.stringify(travellerReviews.body),
    );
    assert.equal(travellerReviews.body.items.length, 4);
    assert.deepEqual(
      new Set(travellerReviews.body.items.map((item: any) => item.id)),
      new Set([
        demoReviews[0].id,
        demoVendorTwoReviews[0].id,
        unpublishedReviewIds.pending,
        unpublishedReviewIds.rejected,
      ]),
    );
    assert.deepEqual(
      new Set(travellerReviews.body.items.map((item: any) => item.status)),
      new Set(["published", "pending", "rejected"]),
    );
    assert.equal(
      travellerReviews.body.items.find(
        (item: any) => item.id === demoReviews[0].id,
      )?.bookingReference,
      "DEMO-CONFIRMED-01",
    );

    const initialFavorites = await request(
      server.baseUrl,
      "/v1/favorites",
      "demo_traveller",
    );
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
    const afterSave = await request(
      server.baseUrl,
      "/v1/favorites",
      "demo_traveller",
    );
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
        body: JSON.stringify({
          message: "Can you share the title details?",
          preferredContactMethod: "email",
        }),
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
        body: JSON.stringify({
          message: "This retry must not create another enquiry.",
          preferredContactMethod: "email",
        }),
      },
    );
    assert.equal(duplicateEnquiry.response.status, 202);
    assert.equal(duplicateEnquiry.body.id, enquiry.body.id);
    assert.equal(duplicateEnquiry.body.status, "new");
    assert.match(duplicateEnquiry.body.message, /already recorded/i);
    const unauthenticatedEnquiry = await request(
      server.baseUrl,
      `/v1/properties/${demoProperties[3].slug}/enquiries`,
      undefined,
      {
        method: "POST",
        headers: { "Idempotency-Key": "demo-property-enquiry-unauthenticated" },
        body: JSON.stringify({
          message: "No session.",
          preferredContactMethod: "email",
        }),
      },
    );
    assert.equal(unauthenticatedEnquiry.response.status, 401);
    const unknownPropertyEnquiry = await request(
      server.baseUrl,
      "/v1/properties/not-a-real-property/enquiries",
      "demo_traveller",
      {
        method: "POST",
        headers: { "Idempotency-Key": "demo-property-enquiry-unknown" },
        body: JSON.stringify({
          message: "Unknown property.",
          preferredContactMethod: "email",
        }),
      },
    );
    assert.equal(unknownPropertyEnquiry.response.status, 404);
    await db
      .update(properties)
      .set({ status: "draft" })
      .where(eq(properties.id, demoProperties[3].id));
    try {
      const unpublishedPropertyDetail = await request(
        server.baseUrl,
        `/v1/properties/${demoProperties[3].slug}`,
        "demo_traveller",
      );
      assert.equal(unpublishedPropertyDetail.response.status, 404);
      const unpublishedPropertyEnquiry = await request(
        server.baseUrl,
        `/v1/properties/${demoProperties[3].slug}/enquiries`,
        "demo_traveller",
        {
          method: "POST",
          headers: { "Idempotency-Key": "demo-property-enquiry-unpublished" },
          body: JSON.stringify({
            message: "Unpublished property.",
            preferredContactMethod: "email",
          }),
        },
      );
      assert.equal(unpublishedPropertyEnquiry.response.status, 404);
    } finally {
      await db
        .update(properties)
        .set({ status: "published" })
        .where(eq(properties.id, demoProperties[3].id));
    }

    const vendorSession = await request(
      server.baseUrl,
      "/v1/auth/session",
      "demo_vendor",
    );
    assert.equal(vendorSession.response.status, 200);
    const vendorMe = await request(server.baseUrl, "/v1/me", "demo_vendor");
    assert.equal(vendorMe.body.id, demoIds.users.vendor);
    assert.equal(vendorMe.body.role, "vendor");
    assert.equal(vendorMe.body.vendorProfile.status, "approved");
    const vendorDashboard = await request(
      server.baseUrl,
      "/v1/vendor/dashboard",
      "demo_vendor",
    );
    const vendorAdmin = await request(
      server.baseUrl,
      "/v1/admin/dashboard",
      "demo_vendor",
    );
    assert.equal(vendorAdmin.response.status, 403);
    assert.deepEqual(vendorDashboard.body.stats, {
      hotels: 4,
      publishedHotels: 4,
      activeRooms: 8,
      activeBookings: 2,
    });
    const vendorHotels = await request(
      server.baseUrl,
      "/v1/vendor/hotels",
      "demo_vendor",
    );
    assert.equal(vendorHotels.body.total, 4);
    const vendorBookings = await request(
      server.baseUrl,
      "/v1/vendor/bookings",
      "demo_vendor",
    );
    assert.equal(vendorBookings.body.items.length, 3);
    const vendorNotifications = await request(
      server.baseUrl,
      "/v1/notifications",
      "demo_vendor",
    );
    assert.ok(
      vendorNotifications.body.items.some(
        (item: any) => item.title === "New property enquiry",
      ),
    );

    const adminSession = await request(
      server.baseUrl,
      "/v1/auth/session",
      "demo_admin",
    );
    assert.equal(adminSession.response.status, 200);
    const adminMe = await request(server.baseUrl, "/v1/me", "demo_admin");
    assert.equal(adminMe.body.id, demoIds.users.admin);
    assert.equal(adminMe.body.role, "admin");
    const adminDashboard = await request(
      server.baseUrl,
      "/v1/admin/dashboard",
      "demo_admin",
    );
    assert.equal(
      adminDashboard.body.users?.total,
      4,
      JSON.stringify(adminDashboard.body),
    );
    assert.equal(adminDashboard.body.vendors.approved, 2);
    assert.equal(adminDashboard.body.hotels.total, 5);
    assert.equal(adminDashboard.body.bookings.total, 4);
    const adminHotels = await request(
      server.baseUrl,
      "/v1/admin/hotels",
      "demo_admin",
    );
    assert.equal(adminHotels.body.items.length, 5);
    const adminProperties = await request(
      server.baseUrl,
      "/v1/admin/properties",
      "demo_admin",
    );
    assert.equal(adminProperties.body.items.length, 9);
    const property = adminProperties.body.items.find(
      (item: any) => item.id === demoProperties[3].id,
    );
    assert.equal(property.enquiryCount, 1);
    const adminBookings = await request(
      server.baseUrl,
      "/v1/admin/bookings",
      "demo_admin",
    );
    assert.equal(adminBookings.body.items.length, 4);
    const adminAuditLogs = await request(
      server.baseUrl,
      "/v1/admin/audit-logs",
      "demo_admin",
    );
    assert.equal(
      adminAuditLogs.response.status,
      200,
      JSON.stringify(adminAuditLogs.body),
    );
    assert.ok(adminAuditLogs.body.meta.total >= 2);
    const reviewAudit = adminAuditLogs.body.items.find(
      (item: any) =>
        item.action === "status_updated" && item.entityType === "review",
    );
    assert.ok(reviewAudit);
    const auditDetail = await request(
      server.baseUrl,
      `/v1/admin/audit-logs/${reviewAudit.id}`,
      "demo_admin",
    );
    assert.equal(
      auditDetail.response.status,
      200,
      JSON.stringify(auditDetail.body),
    );
    assert.equal(auditDetail.body.id, reviewAudit.id);
  },
);

test(
  "demo catalogue is absent when demo mode is disabled",
  { skip: skipUnlessPhase("journey") },
  async () => {
    if (!databaseUrl) return;
    const script = `
    void (async () => {
      const [{ default: express }, { default: http }, { createCatalogRouter }] = await Promise.all([
        import("express"),
        import("node:http"),
        import("./src/routes/catalog.ts"),
      ]);
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
    })();
  `;
    const result = await execFileAsync(
      process.execPath,
      ["--import", tsxLoader, "-e", script],
      {
        cwd: apiRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          DEMO_MODE: "false",
          NODE_ENV: "test",
        },
        maxBuffer: 2_000_000,
      },
    );
    const payload = JSON.parse(result.stdout.trim());
    assert.equal(payload.status, 200);
    assert.equal(
      payload.body.destinations.some((item: any) =>
        String(item.id).startsWith("demo-"),
      ),
      false,
    );
    assert.equal(
      payload.body.hotels.some((item: any) =>
        String(item.id).startsWith("demo-"),
      ),
      false,
    );
    assert.equal(
      payload.body.properties.some((item: any) =>
        String(item.id).startsWith("demo-"),
      ),
      false,
    );
    assert.equal(JSON.stringify(payload.body).includes("Demo "), false);
  },
);
