import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBookingNights,
  calculateBookingPricing,
  canCancelBooking,
  parseBookingInput,
} from "./booking-logic.ts";

const now = new Date("2026-08-30T08:00:00Z");

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    hotelId: "01",
    checkIn: "2026-10-18",
    checkOut: "2026-10-21",
    adults: 2,
    children: 0,
    rooms: 1,
    items: [{ roomId: "01-garden-room", quantity: 1 }],
    guest: { name: "A Traveller", email: "TRAVELLER@example.com", phone: null },
    ...overrides,
  };
}

test("booking input normalizes guest data and rejects mismatched room quantities", () => {
  const result = parseBookingInput(validInput(), now);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.guest.email, "traveller@example.com");
    assert.equal(result.data.guest.name, "A Traveller");
  }

  const invalid = parseBookingInput(validInput({ rooms: 2 }), now);
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.match(invalid.fieldErrors?.rooms ?? "", /match/);
});

test("booking input rejects past, reversed, invalid, and duplicate room selections", () => {
  const invalid = parseBookingInput(validInput({
    checkIn: "2026-08-29",
    checkOut: "2026-08-28",
    rooms: 2,
    items: [{ roomId: "01-garden-room", quantity: 1 }, { roomId: "01-garden-room", quantity: 1 }],
  }), now);
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.match(invalid.fieldErrors?.checkIn ?? "", /future/);
    assert.match(invalid.fieldErrors?.checkOut ?? "", /after/);
    assert.match(invalid.fieldErrors?.items ?? "", /once/);
  }
});

test("pricing is calculated from server room rates and nights", () => {
  const parsed = parseBookingInput(validInput(), now);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  const pricing = calculateBookingPricing(parsed.data, [{
    roomId: "01-garden-room",
    name: "Garden Room",
    capacity: 2,
    nightlyRate: 7800,
    currency: "INR",
    quantity: 1,
  }]);
  assert.equal(calculateBookingNights(parsed.data.checkIn, parsed.data.checkOut), 3);
  assert.equal(pricing.total, 23400);
  assert.equal(pricing.items[0].roomTotal, 23400);
});

test("only future pending-payment bookings can be cancelled", () => {
  assert.equal(canCancelBooking("pending_payment", "2026-10-18", now), true);
  assert.equal(canCancelBooking("pending_payment", "2026-08-30", now), false);
  assert.equal(canCancelBooking("cancelled", "2026-10-18", now), false);
});