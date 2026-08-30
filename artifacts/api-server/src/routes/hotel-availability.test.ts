import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateNights,
  getHotelAvailability,
  parseHotelAvailabilityInput,
} from "./hotel-availability.ts";

const now = new Date("2026-08-30T12:00:00Z");

function validQuery(overrides: Record<string, unknown> = {}) {
  return {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: "2",
    children: "0",
    rooms: "1",
    ...overrides,
  };
}

function errorMessage(value: ReturnType<typeof parseHotelAvailabilityInput>) {
  return "error" in value ? value.error : "";
}

test("availability requires future real dates and calculates nights", () => {
  assert.deepEqual(parseHotelAvailabilityInput(validQuery(), now), {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 1,
  });
  assert.equal(calculateNights("2026-09-10", "2026-09-13"), 3);
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ checkIn: "2026-02-30" }), now)), /real/);
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ checkIn: "2026-08-29" }), now)), /future/);
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ checkOut: "2026-09-10" }), now)), /after/);
});

test("availability validates adults, children, and room counts", () => {
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ adults: "0" }), now)), /Adults/);
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ children: "-1" }), now)), /Children/);
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ rooms: "0" }), now)), /Rooms/);
  assert.match(errorMessage(parseHotelAvailabilityInput(validQuery({ adults: undefined }), now)), /Adults/);
});

test("availability filters room types by per-room capacity", () => {
  const result = getHotelAvailability("01", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 3,
    children: 0,
    rooms: 1,
  }, { NODE_ENV: "development" });
  assert.ok(result);
  assert.equal(result.status, "available");
  assert.deepEqual(result.items.map((room) => room.id), ["01-family-suite"]);
});

test("availability honors available-unit limits for the requested room count", () => {
  const result = getHotelAvailability("01", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 3,
  }, { NODE_ENV: "development" });
  assert.ok(result);
  assert.deepEqual(result.items.map((room) => room.id), ["01-garden-room"]);
  assert.equal(result.items[0]?.availableUnits, 3);

  const none = getHotelAvailability("01", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 4,
  }, { NODE_ENV: "development" });
  assert.ok(none);
  assert.equal(none.status, "no_availability");
  assert.equal(none.items.length, 0);
});

test("availability returns multiple room types with server-calculated totals", () => {
  const result = getHotelAvailability("01", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 1,
  }, { NODE_ENV: "development" });
  assert.ok(result);
  assert.equal(result.status, "available");
  assert.equal(result.items.length, 2);
  assert.equal(result.nights, 3);
  assert.equal(result.items[0]?.roomTotal, 23400);
  assert.equal(result.roomSubtotal, 23400);
  assert.equal(result.total, 23400);
  assert.equal(result.source, "development");
  assert.match(result.sourceNotice, /not a live supplier offer/);
  assert.equal(result.provenance.provider, "travel-land-development");
  assert.equal(result.provenance.freshness, "not_applicable");
  assert.equal(result.provenance.checkedAt, null);
  assert.equal("taxes" in result, false);
  assert.equal("fees" in result, false);
});

test("production never exposes development fallback as live availability", () => {
  const result = getHotelAvailability("01", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 1,
  }, { NODE_ENV: "production" }, now);

  assert.ok(result);
  assert.equal(result.status, "unavailable");
  assert.equal(result.source, "unavailable");
  assert.equal(result.items.length, 0);
  assert.equal(result.provenance.provider, "none");
  assert.equal(result.provenance.freshness, "unavailable");
  assert.equal(result.provenance.checkedAt, now.toISOString());
  assert.match(result.sourceNotice, /managed live inventory connection/);
});

test("availability distinguishes a catalog hotel with no configured inventory", () => {
  const result = getHotelAvailability("02", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 1,
  }, { NODE_ENV: "development" });
  assert.ok(result);
  assert.equal(result.status, "no_availability");
  assert.equal(result.items.length, 0);
  assert.equal(result.source, "development");
  assert.match(result.notice, /No rooms/);
});

test("availability returns null for an unknown hotel", () => {
  assert.equal(getHotelAvailability("missing", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 1,
  }, { NODE_ENV: "development" }), null);
});

test("inventory offers fail closed when the runtime mode is missing", () => {
  const result = getHotelAvailability("01", {
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    adults: 2,
    children: 0,
    rooms: 1,
  }, {}, now);

  assert.ok(result);
  assert.equal(result.status, "unavailable");
  assert.equal(result.items.length, 0);
});