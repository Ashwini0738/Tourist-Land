import assert from "node:assert/strict";
import test from "node:test";
import {
  BookingConflictError,
  BookingNotFoundError,
  BookingProviderUnavailableError,
} from "../routes/booking.ts";
import type { PaymentProvider } from "./payment-provider.ts";
import { startBookingCheckout } from "./booking-payments.ts";

const booking = {
  id: "booking-1",
  userId: "traveller-1",
  reference: "TL-1001",
  status: "pending_payment",
  guestEmail: "traveller@example.com",
  guestName: "A Traveller",
  guestPhone: "+919999999999",
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

const bookingPayload = {
  reference: booking.reference,
  hotel: { id: booking.hotelCatalogId, name: "Test Hotel", location: "Goa", imageKey: "coastline" },
  startsOn: booking.startsOn,
  endsOn: booking.endsOn,
  nights: 3,
  adults: booking.adults,
  children: booking.children,
  guestCount: booking.guestCount,
  roomCount: booking.roomCount,
  guest: { name: booking.guestName, email: booking.guestEmail, phone: booking.guestPhone },
  items: [],
  total: Number(booking.totalAmount),
  currency: booking.currency,
  status: "pending_payment" as const,
  paymentStatus: "processing" as const,
  sourceNotice: "Development inventory.",
  canCancel: false,
  createdAt: booking.createdAt.toISOString(),
  updatedAt: booking.updatedAt.toISOString(),
};

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    bookingId: booking.id,
    userId: booking.userId,
    provider: "razorpay",
    providerReference: "order_current",
    amount: booking.totalAmount,
    currency: booking.currency,
    status: "processing",
    createdAt: new Date("2026-08-30T07:00:00Z"),
    updatedAt: new Date("2026-08-30T08:00:00Z"),
    ...overrides,
  } as any;
}

function provider(overrides: Partial<PaymentProvider> = {}): PaymentProvider {
  return {
    name: "razorpay",
    publicKeyId: "rzp_test_public",
    createOrder: async (input) => ({
      id: "order_new",
      amount: input.amount,
      amountPaid: 0,
      currency: input.currency,
      receipt: input.receipt,
      status: "created",
      notes: input.notes,
    }),
    getOrder: async () => ({
      id: "order_current",
      amount: 23_400,
      amountPaid: 0,
      currency: "INR",
      receipt: booking.reference,
      status: "created",
      notes: { bookingId: booking.id, bookingReference: booking.reference, userId: booking.userId },
    }),
    getPayment: async () => { throw new Error("unused"); },
    verifyPayment: () => false,
    capturePayment: async () => { throw new Error("unused"); },
    refundPayment: async () => { throw new Error("unused"); },
    handleWebhook: () => { throw new Error("unused"); },
    ...overrides,
  };
}

test("checkout ownership is enforced before any provider call", async () => {
  let providerCalled = false;
  const ownerOnlyLookup = async (userId: string, reference: string) => {
    if (userId !== booking.userId || reference !== booking.reference) return null;
    return { booking, payment: payment() };
  };
  const paymentProvider = provider({
    getOrder: async () => {
      providerCalled = true;
      throw new Error("should not be called");
    },
  });

  await assert.rejects(
    startBookingCheckout("another-traveller", booking.reference, "retry-key", {
      provider: paymentProvider,
      loadBookingPayment: ownerOnlyLookup,
      inventoryEnv: { NODE_ENV: "development" },
    }),
    (error: unknown) => error instanceof BookingNotFoundError,
  );
  assert.equal(providerCalled, false);
});

test("checkout creates a Razorpay order from trusted booking values", async () => {
  let capturedInput: unknown;
  const paymentProvider = provider({
    createOrder: async (input) => {
      capturedInput = input;
      return {
        id: "order_new",
        amount: input.amount,
        amountPaid: 0,
        currency: input.currency,
        receipt: input.receipt,
        status: "created",
        notes: input.notes,
      };
    },
  });

  const result = await startBookingCheckout(booking.userId, booking.reference, "retry-key", {
    provider: paymentProvider,
    loadBookingPayment: async () => ({ booking, payment: payment({ status: "unpaid", providerReference: null }) }),
    findBooking: async () => bookingPayload,
    inventoryEnv: { NODE_ENV: "development" },
  });

  assert.deepEqual(capturedInput, {
    amount: 23_400,
    currency: "INR",
    receipt: booking.reference,
    notes: {
      bookingId: booking.id,
      bookingReference: booking.reference,
      userId: booking.userId,
    },
  });
  assert.equal(result.provider, "razorpay");
  assert.equal(result.orderId, "order_new");
  assert.equal(result.keyId, "rzp_test_public");
  assert.equal(result.amount, 23_400);
});

test("checkout retry reuses a matching unpaid Razorpay order", async () => {
  let createCalled = false;
  const result = await startBookingCheckout(booking.userId, booking.reference, "retry-key", {
    provider: provider({
      createOrder: async () => {
        createCalled = true;
        throw new Error("A second order should not be created.");
      },
    }),
    loadBookingPayment: async () => ({ booking, payment: payment() }),
    findBooking: async () => bookingPayload,
    inventoryEnv: { NODE_ENV: "development" },
  });

  assert.equal(result.orderId, "order_current");
  assert.equal(createCalled, false);
});

test("checkout does not create another order while the current order is paid", async () => {
  await assert.rejects(
    startBookingCheckout(booking.userId, booking.reference, "retry-key", {
      provider: provider({
        getOrder: async () => ({
          id: "order_current",
          amount: 23_400,
          amountPaid: 23_400,
          currency: "INR",
          receipt: booking.reference,
          status: "paid",
          notes: {},
        }),
      }),
      loadBookingPayment: async () => ({ booking, payment: payment() }),
      inventoryEnv: { NODE_ENV: "development" },
    }),
    (error: unknown) => error instanceof BookingConflictError,
  );
});

test("checkout fails before the payment provider when live inventory is unavailable", async () => {
  let providerCalled = false;
  await assert.rejects(
    startBookingCheckout(booking.userId, booking.reference, "retry-key", {
      provider: provider({
        getOrder: async () => {
          providerCalled = true;
          throw new Error("should not be called");
        },
      }),
      loadBookingPayment: async () => ({ booking, payment: payment() }),
      inventoryEnv: { NODE_ENV: "production" },
    }),
    (error: unknown) => error instanceof BookingProviderUnavailableError,
  );
  assert.equal(providerCalled, false);
});

test("a second different payment cannot replace an already paid payment", async () => {
  await assert.rejects(
    import("./booking-payments.ts").then(({ verifyBookingPayment }) => verifyBookingPayment(
      booking.userId,
      booking.reference,
      {
        orderId: "order_current",
        paymentId: "pay_different",
        signature: "signature",
      },
      {
        provider: provider(),
        loadBookingPayment: async () => ({
          booking,
          payment: payment({ status: "paid", providerReference: "order_current|pay_original" }),
        }),
      },
    )),
    (error: unknown) => error instanceof BookingConflictError && /already been paid/i.test(error.message),
  );
});

test("payment verification rejects amount and currency mismatches before persistence", async () => {
  const mismatchProvider = provider({
    verifyPayment: () => true,
    getPayment: async () => ({
      id: "pay_current",
      orderId: "order_current",
      amount: 99_900,
      currency: "USD",
      status: "captured",
      captured: true,
      notes: {},
    }),
  });

  await assert.rejects(
    import("./booking-payments.ts").then(({ verifyBookingPayment }) => verifyBookingPayment(
      booking.userId,
      booking.reference,
      { orderId: "order_current", paymentId: "pay_current", signature: "signature" },
      {
        provider: mismatchProvider,
        loadBookingPayment: async () => ({ booking, payment: payment() }),
      },
    )),
    (error: unknown) => error instanceof BookingConflictError && /do not match/i.test(error.message),
  );
});