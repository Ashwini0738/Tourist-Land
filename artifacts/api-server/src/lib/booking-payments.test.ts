import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import {
  BookingConflictError,
  BookingNotFoundError,
} from "../routes/booking.ts";
import { startBookingCheckout } from "./booking-payments.ts";

const booking = {
  id: "booking-1",
  userId: "traveller-1",
  reference: "TL-1001",
  status: "pending_payment",
  guestEmail: "traveller@example.com",
  guestName: "A Traveller",
  guestPhone: null,
  hotelCatalogId: "01",
  startsOn: "2026-10-18",
  endsOn: "2026-10-21",
  adults: 2,
  children: 0,
  guestCount: 2,
  roomCount: 1,
  totalAmount: "234.00",
  currency: "INR",
  idempotencyKey: "booking-key",
  createdAt: new Date("2026-08-30T07:00:00Z"),
  updatedAt: new Date("2026-08-30T07:00:00Z"),
} as any;

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    bookingId: booking.id,
    userId: booking.userId,
    provider: "stripe",
    providerReference: "cs_current",
    amount: booking.totalAmount,
    currency: booking.currency,
    status: "processing",
    createdAt: new Date("2026-08-30T07:00:00Z"),
    updatedAt: new Date("2026-08-30T08:00:00Z"),
    ...overrides,
  } as any;
}

function stripeWithExistingSession(session: Record<string, unknown>) {
  let createCalled = false;
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async () => session,
        create: async () => {
          createCalled = true;
          throw new Error("A new Stripe session should not be created.");
        },
      },
    },
  } as unknown as Stripe;
  return { stripe, wasCreateCalled: () => createCalled };
}

test("checkout ownership is enforced before any Stripe call", async () => {
  let stripeCalled = false;
  const stripe = {} as Stripe;
  const ownerOnlyLookup = async (userId: string, reference: string) => {
    if (userId !== booking.userId || reference !== booking.reference) return null;
    stripeCalled = true;
    return { booking, payment: payment() };
  };

  await assert.rejects(
    startBookingCheckout("another-traveller", booking.reference, "retry-key", {
      stripe,
      loadBookingPayment: ownerOnlyLookup,
    }),
    (error: unknown) => error instanceof BookingNotFoundError,
  );
  assert.equal(stripeCalled, false);
});

test("retry reuses an open Checkout Session without creating another payment", async () => {
  const { stripe, wasCreateCalled } = stripeWithExistingSession({
    id: "cs_current",
    status: "open",
    url: "https://checkout.stripe.test/cs_current",
  });
  const result = await startBookingCheckout(booking.userId, booking.reference, "retry-key", {
    stripe,
    loadBookingPayment: async () => ({ booking, payment: payment() }),
    findBooking: async () => booking,
  });
  assert.equal(result.checkoutUrl, "https://checkout.stripe.test/cs_current");
  assert.equal(wasCreateCalled(), false);
});

test("retry does not create a second Checkout Session while the existing one is complete", async () => {
  const { stripe, wasCreateCalled } = stripeWithExistingSession({
    id: "cs_current",
    status: "complete",
    url: "https://checkout.stripe.test/cs_current",
  });
  await assert.rejects(
    startBookingCheckout(booking.userId, booking.reference, "retry-key", {
      stripe,
      loadBookingPayment: async () => ({ booking, payment: payment() }),
    }),
    (error: unknown) => error instanceof BookingConflictError,
  );
  assert.equal(wasCreateCalled(), false);
});