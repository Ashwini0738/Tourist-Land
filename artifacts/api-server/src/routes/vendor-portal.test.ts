import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import {
  bookingItems,
  bookings,
  db,
  hotelRooms,
  hotels,
  pool,
  properties,
  propertyEnquiries,
  propertyEnquiryHistory,
  roomAvailability,
  userRoles,
  users,
  vendorAuditLogs,
  vendorProfiles,
} from "@workspace/db";
import { createVendorPortalRouter } from "./vendor-portal.ts";
import { dateRange, isDate, parseInteger, parseNumber, parseString, parseStringArray } from "./vendor-portal-logic.ts";

test("vendor input parsers reject malformed values instead of coercing them silently", () => {
  assert.equal(parseString("  hotel  ", 20), "hotel");
  assert.equal(parseString(" ", 20), undefined);
  assert.equal(parseString(null, 20), undefined);
  assert.equal(parseString(null, 20, true), null);
  assert.equal(parseNumber("7800", 0, 10000), 7800);
  assert.equal(parseNumber("not-a-number", 0, 10000), undefined);
  assert.equal(parseInteger("2.5", 1, 10), undefined);
  assert.equal(parseInteger("2", 1, 10), 2);
});

test("vendor array and calendar validation stays bounded and exact", () => {
  assert.deepEqual(parseStringArray([" Wi-Fi ", "Breakfast"]), ["Wi-Fi", "Breakfast"]);
  assert.equal(parseStringArray(["ok", 4]), undefined);
  assert.equal(parseStringArray(Array.from({ length: 31 }, () => "amenity")), undefined);
  assert.equal(isDate("2026-02-28"), true);
  assert.equal(isDate("2026-02-29"), false);
  assert.deepEqual(dateRange("2026-09-01", "2026-09-04"), ["2026-09-01", "2026-09-02", "2026-09-03"]);
  assert.equal(dateRange("2026-09-01", "2026-12-31").length, 91);
});

type VendorFixture = {
  vendorA: string;
  vendorB: string;
  hotelA: string;
  hotelB: string;
  roomA: string;
  roomB: string;
  bookingA: string;
  bookingB: string;
  propertyA: string;
  propertyB: string;
  enquiryA: string;
  enquiryB: string;
  date: string;
};

async function createVendorFixture(): Promise<VendorFixture> {
  const fixture: VendorFixture = {
    vendorA: randomUUID(),
    vendorB: randomUUID(),
    hotelA: randomUUID(),
    hotelB: randomUUID(),
    roomA: randomUUID(),
    roomB: randomUUID(),
    bookingA: randomUUID(),
    bookingB: randomUUID(),
    propertyA: randomUUID(),
    propertyB: randomUUID(),
    enquiryA: randomUUID(),
    enquiryB: randomUUID(),
    date: "2026-09-15",
  };

  await db.insert(users).values([
    {
      id: fixture.vendorA,
      clerkUserId: `vendor-a-${fixture.vendorA}`,
      email: `vendor-a-${fixture.vendorA}@example.test`,
      displayName: "Vendor A",
      status: "active",
    },
    {
      id: fixture.vendorB,
      clerkUserId: `vendor-b-${fixture.vendorB}`,
      email: `vendor-b-${fixture.vendorB}@example.test`,
      displayName: "Vendor B",
      status: "active",
    },
  ]);
  await db.insert(userRoles).values([
    { userId: fixture.vendorA, role: "vendor" },
    { userId: fixture.vendorB, role: "vendor" },
  ]);
  await db.insert(vendorProfiles).values([
    {
      userId: fixture.vendorA,
      businessName: "Vendor A Stays",
      businessType: "hotel",
      contactName: "Vendor A",
      phone: "1111111111",
      email: `vendor-a-${fixture.vendorA}@example.test`,
      description: "Fixture vendor A",
      address: "A Street",
      city: "A City",
      state: "A State",
      country: "India",
      status: "approved",
    },
    {
      userId: fixture.vendorB,
      businessName: "Vendor B Stays",
      businessType: "hotel",
      contactName: "Vendor B",
      phone: "2222222222",
      email: `vendor-b-${fixture.vendorB}@example.test`,
      description: "Fixture vendor B",
      address: "B Street",
      city: "B City",
      state: "B State",
      country: "India",
      status: "approved",
    },
  ]);
  await db.insert(hotels).values([
    {
      id: fixture.hotelA,
      catalogId: `fixture-hotel-a-${fixture.hotelA}`,
      ownerId: fixture.vendorA,
      name: "Hotel A",
      address: "A Hotel Street",
      status: "published",
      approvalStatus: "approved",
    },
    {
      id: fixture.hotelB,
      catalogId: `fixture-hotel-b-${fixture.hotelB}`,
      ownerId: fixture.vendorB,
      name: "Hotel B",
      address: "B Hotel Street",
      status: "published",
      approvalStatus: "approved",
    },
  ]);
  await db.insert(hotelRooms).values([
    {
      id: fixture.roomA,
      hotelId: fixture.hotelA,
      name: "Room A",
      capacity: 2,
      totalUnits: 5,
      nightlyRate: "100",
      currency: "INR",
      status: "active",
    },
    {
      id: fixture.roomB,
      hotelId: fixture.hotelB,
      name: "Room B",
      capacity: 2,
      totalUnits: 5,
      nightlyRate: "200",
      currency: "INR",
      status: "active",
    },
  ]);
  await db.insert(bookings).values([
    {
      id: fixture.bookingA,
      userId: fixture.vendorA,
      reference: `FIXTURE-A-${fixture.bookingA}`,
      hotelCatalogId: `fixture-hotel-a-${fixture.hotelA}`,
      startsOn: fixture.date,
      endsOn: "2026-09-17",
      adults: 2,
      children: 0,
      guestCount: 2,
      roomCount: 2,
      guestName: "Guest A",
      guestEmail: "guest-a@example.test",
      totalAmount: "200",
      currency: "INR",
      status: "pending_payment",
    },
    {
      id: fixture.bookingB,
      userId: fixture.vendorB,
      reference: `FIXTURE-B-${fixture.bookingB}`,
      hotelCatalogId: `fixture-hotel-b-${fixture.hotelB}`,
      startsOn: fixture.date,
      endsOn: "2026-09-17",
      adults: 2,
      children: 0,
      guestCount: 2,
      roomCount: 1,
      guestName: "Guest B",
      guestEmail: "guest-b@example.test",
      totalAmount: "200",
      currency: "INR",
      status: "confirmed",
    },
  ]);
  await db.insert(bookingItems).values([
    {
      bookingId: fixture.bookingA,
      roomId: fixture.roomA,
      quantity: 2,
      unitAmount: "100",
    },
    {
      bookingId: fixture.bookingB,
      roomId: fixture.roomB,
      quantity: 1,
      unitAmount: "200",
    },
  ]);
  await db.insert(properties).values([
    {
      id: fixture.propertyA,
      ownerId: fixture.vendorA,
      slug: `fixture-property-a-${fixture.propertyA}`,
      title: "Property A",
      propertyType: "land",
      address: "A Property Street",
      areaValue: "2",
      areaUnit: "acre",
      status: "published",
    },
    {
      id: fixture.propertyB,
      ownerId: fixture.vendorB,
      slug: `fixture-property-b-${fixture.propertyB}`,
      title: "Property B",
      propertyType: "villa",
      address: "B Property Street",
      areaValue: "3",
      areaUnit: "acre",
      status: "published",
    },
  ]);
  await db.insert(propertyEnquiries).values([
    {
      id: fixture.enquiryA,
      propertyId: fixture.propertyA,
      userId: fixture.vendorB,
      message: "Please share the site details.",
      preferredContactMethod: "email",
      status: "new",
    },
    {
      id: fixture.enquiryB,
      propertyId: fixture.propertyB,
      userId: fixture.vendorA,
      message: "Can I arrange a visit?",
      preferredContactMethod: "phone",
      status: "contacted",
    },
  ]);
  await db.insert(propertyEnquiryHistory).values([
    { enquiryId: fixture.enquiryA, status: "new", note: "Enquiry received.", changedBy: fixture.vendorB },
    { enquiryId: fixture.enquiryB, status: "new", note: "Enquiry received.", changedBy: fixture.vendorA },
    { enquiryId: fixture.enquiryB, status: "contacted", note: "Vendor contacted the traveller.", changedBy: fixture.vendorB },
  ]);

  return fixture;
}

async function deleteVendorFixture(fixture: VendorFixture): Promise<void> {
  await db.delete(vendorAuditLogs).where(inArray(vendorAuditLogs.vendorId, [fixture.vendorA, fixture.vendorB]));
  await db.delete(propertyEnquiryHistory).where(inArray(propertyEnquiryHistory.enquiryId, [fixture.enquiryA, fixture.enquiryB]));
  await db.delete(propertyEnquiries).where(inArray(propertyEnquiries.id, [fixture.enquiryA, fixture.enquiryB]));
  await db.delete(properties).where(inArray(properties.id, [fixture.propertyA, fixture.propertyB]));
  await db.delete(bookings).where(inArray(bookings.id, [fixture.bookingA, fixture.bookingB]));
  await db.delete(roomAvailability).where(inArray(roomAvailability.roomId, [fixture.roomA, fixture.roomB]));
  await db.delete(hotelRooms).where(inArray(hotelRooms.id, [fixture.roomA, fixture.roomB]));
  await db.delete(hotels).where(inArray(hotels.id, [fixture.hotelA, fixture.hotelB]));
  await db.delete(vendorProfiles).where(inArray(vendorProfiles.userId, [fixture.vendorA, fixture.vendorB]));
  await db.delete(userRoles).where(inArray(userRoles.userId, [fixture.vendorA, fixture.vendorB]));
  await db.delete(users).where(inArray(users.id, [fixture.vendorA, fixture.vendorB]));
}

function buildVendorTestApp(): express.Express {
  const app = express();
  const authenticateFixtureVendor: RequestHandler = (req, res, next) => {
    const vendorId = req.header("x-test-vendor-id");
    if (!vendorId) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Test vendor identity is required." } });
      return;
    }
    req.localUser = {
      id: vendorId,
      clerkUserId: `test-${vendorId}`,
      email: `test-${vendorId}@example.test`,
      displayName: "Fixture vendor",
      phone: null,
      avatarUrl: null,
      status: "active",
      role: req.header("x-test-role") === "user" ? "user" : "vendor",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    next();
  };
  app.use(express.json());
  app.use(createVendorPortalRouter(authenticateFixtureVendor));
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

async function vendorRequest(
  baseUrl: string,
  vendorId: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set("x-test-vendor-id", vendorId);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

test("database-backed vendor requests stay isolated by hotel ownership", async (t) => {
  const requiredColumns = [
    "hotels.catalog_id",
    "hotels.approval_status",
    "hotel_rooms.total_units",
    "hotel_rooms.amenities",
    "hotel_rooms.image_urls",
    "bookings.hotel_catalog_id",
    "bookings.adults",
    "bookings.children",
    "bookings.room_count",
    "bookings.guest_name",
    "bookings.guest_email",
    "vendor_audit_logs.vendor_id",
      "properties.owner_id",
      "property_enquiries.property_id",
      "property_enquiries.user_id",
      "property_enquiries.status",
      "property_enquiry_history.enquiry_id",
      "property_enquiry_history.status",
  ];
  const schemaRows = await db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
       and table_name in ('hotels', 'hotel_rooms', 'bookings', 'vendor_audit_logs', 'properties', 'property_enquiries', 'property_enquiry_history')
  `);
  const availableColumns = new Set(schemaRows.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missingColumns = requiredColumns.filter((column) => !availableColumns.has(column));
  if (missingColumns.length) {
    t.skip(`development database schema is pending post-merge application (missing: ${missingColumns.join(", ")})`);
    return;
  }

  const fixture = await createVendorFixture();
  const server = await startTestServer(buildVendorTestApp());
  try {
    const ownHotels = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/hotels");
    assert.equal(ownHotels.status, 200);
    assert.deepEqual((ownHotels.body.items as Array<{ id: string }>).map((hotel) => hotel.id), [fixture.hotelA]);

    const ownHotel = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/hotels/${fixture.hotelA}`);
    assert.equal(ownHotel.status, 200);
    const updatedHotel = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/hotels/${fixture.hotelA}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Hotel A Updated" }),
    });
    assert.equal(updatedHotel.status, 200);
    assert.equal((updatedHotel.body as { name: string }).name, "Hotel A Updated");

    const ownRoom = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/rooms/${fixture.roomA}`);
    assert.equal(ownRoom.status, 200);
    const updatedRoom = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/rooms/${fixture.roomA}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Room A Updated" }),
    });
    assert.equal(updatedRoom.status, 200);
    assert.equal((updatedRoom.body as { name: string }).name, "Room A Updated");

    const createdRoom = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/hotels/${fixture.hotelA}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name: "Room A New", capacity: 2, totalUnits: 2, nightlyRate: 125 }),
    });
    assert.equal(createdRoom.status, 201);
    const [createdRoomRecord] = await db.select().from(hotelRooms).where(eq(hotelRooms.id, (createdRoom.body as { id: string }).id));
    assert.equal(createdRoomRecord?.hotelId, fixture.hotelA);

    const crossOwnerCases: Array<{ method: string; path: string; body?: Record<string, unknown>; code: string }> = [
      { method: "GET", path: `/v1/vendor/hotels/${fixture.hotelB}`, code: "HOTEL_NOT_FOUND" },
      { method: "PATCH", path: `/v1/vendor/hotels/${fixture.hotelB}`, body: { name: "Should Not Change" }, code: "HOTEL_NOT_FOUND" },
      { method: "POST", path: `/v1/vendor/hotels/${fixture.hotelB}/rooms`, body: { name: "Should Not Exist", capacity: 2, totalUnits: 1, nightlyRate: 1 }, code: "HOTEL_NOT_FOUND" },
      { method: "GET", path: `/v1/vendor/rooms/${fixture.roomB}`, code: "ROOM_NOT_FOUND" },
      { method: "PATCH", path: `/v1/vendor/rooms/${fixture.roomB}`, body: { name: "Should Not Change" }, code: "ROOM_NOT_FOUND" },
      { method: "GET", path: `/v1/vendor/availability?roomId=${fixture.roomB}&from=${fixture.date}&to=2026-09-16`, code: "ROOM_NOT_FOUND" },
    ];
    for (const request of crossOwnerCases) {
      const response = await vendorRequest(server.baseUrl, fixture.vendorA, request.path, {
        method: request.method,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      assert.equal(response.status, 404, `${request.method} ${request.path}`);
      assert.equal((response.body.error as { code: string }).code, request.code);
    }
    const vendorBCrossOwnerCases: Array<{ method: string; path: string; body?: Record<string, unknown>; code: string }> = [
      { method: "GET", path: `/v1/vendor/hotels/${fixture.hotelA}`, code: "HOTEL_NOT_FOUND" },
      { method: "PATCH", path: `/v1/vendor/hotels/${fixture.hotelA}`, body: { name: "Should Not Change" }, code: "HOTEL_NOT_FOUND" },
      { method: "POST", path: `/v1/vendor/hotels/${fixture.hotelA}/rooms`, body: { name: "Should Not Exist", capacity: 2, totalUnits: 1, nightlyRate: 1 }, code: "HOTEL_NOT_FOUND" },
      { method: "GET", path: `/v1/vendor/rooms/${fixture.roomA}`, code: "ROOM_NOT_FOUND" },
      { method: "PATCH", path: `/v1/vendor/rooms/${fixture.roomA}`, body: { name: "Should Not Change" }, code: "ROOM_NOT_FOUND" },
      { method: "GET", path: `/v1/vendor/availability?roomId=${fixture.roomA}&from=${fixture.date}&to=2026-09-16`, code: "ROOM_NOT_FOUND" },
    ];
    for (const request of vendorBCrossOwnerCases) {
      const response = await vendorRequest(server.baseUrl, fixture.vendorB, request.path, {
        method: request.method,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      assert.equal(response.status, 404, `${request.method} ${request.path}`);
      assert.equal((response.body.error as { code: string }).code, request.code);
    }

    const hiddenRooms = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/rooms?hotelId=${fixture.hotelB}`);
    assert.equal(hiddenRooms.status, 200);
    assert.deepEqual(hiddenRooms.body.items, []);
    const vendorBHiddenRooms = await vendorRequest(server.baseUrl, fixture.vendorB, `/v1/vendor/rooms?hotelId=${fixture.hotelA}`);
    assert.equal(vendorBHiddenRooms.status, 200);
    assert.deepEqual(vendorBHiddenRooms.body.items, []);

    const crossOwnerAvailabilityUpdate = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/availability", {
      method: "PUT",
      body: JSON.stringify({ roomId: fixture.roomB, date: fixture.date, availableUnits: 0 }),
    });
    assert.equal(crossOwnerAvailabilityUpdate.status, 404);
    assert.equal((crossOwnerAvailabilityUpdate.body.error as { code: string }).code, "ROOM_NOT_FOUND");
    const vendorBCrossOwnerAvailabilityUpdate = await vendorRequest(server.baseUrl, fixture.vendorB, "/v1/vendor/availability", {
      method: "PUT",
      body: JSON.stringify({ roomId: fixture.roomA, date: fixture.date, availableUnits: 0 }),
    });
    assert.equal(vendorBCrossOwnerAvailabilityUpdate.status, 404);
    assert.equal((vendorBCrossOwnerAvailabilityUpdate.body.error as { code: string }).code, "ROOM_NOT_FOUND");

    const belowReserved = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/availability", {
      method: "PUT",
      body: JSON.stringify({ roomId: fixture.roomA, date: fixture.date, availableUnits: 1 }),
    });
    assert.equal(belowReserved.status, 409);
    assert.equal((belowReserved.body.error as { code: string }).code, "AVAILABILITY_CONFLICT");
    assert.match((belowReserved.body.error as { message: string }).message, /3 reserved/);

    const safeAvailability = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/availability", {
      method: "PUT",
      body: JSON.stringify({ roomId: fixture.roomA, date: fixture.date, availableUnits: 3 }),
    });
    assert.equal(safeAvailability.status, 200);
    assert.equal((safeAvailability.body as { availableUnits: number }).availableUnits, 3);
    assert.equal((safeAvailability.body as { reservedUnits: number }).reservedUnits, 3);

    const vendorABookings = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/bookings?limit=50");
    assert.equal(vendorABookings.status, 200);
    assert.deepEqual(
      (vendorABookings.body.items as Array<{ reference: string }>).map((booking) => booking.reference),
      [`FIXTURE-A-${fixture.bookingA}`],
    );

    const vendorBBook = await vendorRequest(server.baseUrl, fixture.vendorB, "/v1/vendor/bookings?limit=50");
    assert.equal(vendorBBook.status, 200);
    assert.deepEqual(
      (vendorBBook.body.items as Array<{ reference: string }>).map((booking) => booking.reference),
      [`FIXTURE-B-${fixture.bookingB}`],
    );

    const vendorAEnquiries = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/enquiries");
    assert.equal(vendorAEnquiries.status, 200);
    assert.deepEqual(
      (vendorAEnquiries.body.items as Array<{ id: string; property: { id: string }; history: Array<{ status: string }> }>).map((enquiry) => enquiry.id),
      [fixture.enquiryA],
    );
    assert.equal((vendorAEnquiries.body.items as Array<{ property: { id: string } }>)[0]?.property.id, fixture.propertyA);
    assert.deepEqual(
      (vendorAEnquiries.body.items as Array<{ history: Array<{ status: string }> }>)[0]?.history.map((entry) => entry.status),
      ["new"],
    );

    const contacted = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/enquiries/${fixture.enquiryA}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "contacted", note: "Called the customer." }),
    });
    assert.equal(contacted.status, 200);
    assert.equal((contacted.body as { status: string }).status, "contacted");
    assert.deepEqual((contacted.body as { history: Array<{ status: string }> }).history.map((entry) => entry.status), ["new", "contacted"]);

    const closed = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/enquiries/${fixture.enquiryA}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    });
    assert.equal(closed.status, 200);
    assert.equal((closed.body as { status: string }).status, "closed");
    assert.deepEqual((closed.body as { history: Array<{ status: string }> }).history.map((entry) => entry.status), ["new", "contacted", "closed"]);

    const crossOwnerEnquiry = await vendorRequest(server.baseUrl, fixture.vendorA, `/v1/vendor/enquiries/${fixture.enquiryB}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    });
    assert.equal(crossOwnerEnquiry.status, 404);
    assert.equal((crossOwnerEnquiry.body.error as { code: string }).code, "ENQUIRY_NOT_FOUND");

    const nonVendor = await vendorRequest(server.baseUrl, fixture.vendorA, "/v1/vendor/enquiries", {
      headers: { "x-test-role": "user" },
    });
    assert.equal(nonVendor.status, 403);
    assert.equal((nonVendor.body.error as { code: string }).code, "FORBIDDEN");

    const vendorBTargetingA = await vendorRequest(server.baseUrl, fixture.vendorB, `/v1/vendor/hotels/${fixture.hotelA}`);
    assert.equal(vendorBTargetingA.status, 404);
    assert.equal((vendorBTargetingA.body.error as { code: string }).code, "HOTEL_NOT_FOUND");

    const [unchangedHotelB] = await db.select().from(hotels).where(eq(hotels.id, fixture.hotelB));
    const [unchangedRoomB] = await db.select().from(hotelRooms).where(eq(hotelRooms.id, fixture.roomB));
    assert.equal(unchangedHotelB?.name, "Hotel B");
    assert.equal(unchangedRoomB?.name, "Room B");
  } finally {
    await server.close();
    await deleteVendorFixture(fixture);
  }
});

test.after(async () => {
  await pool.end();
});