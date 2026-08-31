import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";
import { demoBookings, demoDestinations, demoEvents, demoHotels, demoPayments, demoProperties, demoRooms, demoAvailability } from "@workspace/db/seed-data";

test("demo guard rejects disabled, production, and remote targets", () => {
  assert.throws(() => assertSafeDemoEnvironment({ DEMO_MODE: "false", DATABASE_URL: "postgres://localhost/demo" }));
  assert.throws(() => assertSafeDemoEnvironment({ DEMO_MODE: "true", NODE_ENV: "production", DATABASE_URL: "postgres://localhost/demo" }));
  assert.throws(() => assertSafeDemoEnvironment({ DEMO_MODE: "true", DATABASE_URL: "postgres://db.example/demo" }));
  assert.doesNotThrow(() => assertSafeDemoEnvironment({ DEMO_MODE: "true", NODE_ENV: "test", DATABASE_URL: "postgres://localhost/travel_demo" }));
});

test("demo dataset has the expected shape and stable relationships", () => {
  assert.equal(demoDestinations.length, 8);
  assert.equal(demoEvents.length, 6);
  assert.equal(demoHotels.length, 4);
  assert.equal(demoProperties.length, 8);
  assert.equal(demoRooms.length, 8);
  assert.ok(demoAvailability.length >= 8);
  assert.ok(demoHotels.every((hotel) => hotel.approvalStatus === "approved" && hotel.status === "published"));
  assert.ok(demoRooms.every((room) => demoHotels.some((hotel) => hotel.id === room.hotelId)));
  assert.deepEqual(
    demoPayments.map((payment) => payment.bookingId),
    demoBookings.map((booking) => booking.id),
    "each demo booking has one unambiguous payment state",
  );
  assert.ok(demoAvailability.length >= demoRooms.length * 10);
});