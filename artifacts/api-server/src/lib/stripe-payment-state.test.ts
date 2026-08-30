import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import {
  isCurrentStripeCheckoutAttempt,
  nextStripePaymentStatus,
  stripePaymentAmountMatches,
  stripePaymentDetails,
  stripePaymentOutcome,
} from "./stripe-payment-state.ts";

function event(type: string, object: Record<string, unknown>, created = 1_000): Stripe.Event {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    object: "event",
    api_version: "2025-06-30.basil",
    created,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event;
}

function sessionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return event(type, {
    object: "checkout.session",
    id: "cs_current",
    metadata: { bookingId: "booking-1", bookingReference: "TL-1001" },
    amount_total: 23_400,
    currency: "inr",
    payment_status: "paid",
    ...overrides,
  });
}

test("classifies paid, failed, cancelled, and processing Stripe outcomes", () => {
  assert.equal(stripePaymentOutcome(sessionEvent("checkout.session.completed")), "paid");
  assert.equal(stripePaymentOutcome(sessionEvent("checkout.session.async_payment_succeeded")), "paid");
  assert.equal(stripePaymentOutcome(sessionEvent("checkout.session.async_payment_failed")), "failed");
  assert.equal(stripePaymentOutcome(sessionEvent("checkout.session.expired")), "cancelled");
  assert.equal(
    stripePaymentOutcome(sessionEvent("checkout.session.completed", { payment_status: "unpaid" })),
    "processing",
  );
  assert.equal(
    stripePaymentOutcome(event("payment_intent.processing", {
      object: "payment_intent",
      id: "pi_current",
      metadata: { bookingId: "booking-1" },
      amount: 23_400,
      amount_received: 0,
      currency: "inr",
    })),
    "processing",
  );
  assert.equal(stripePaymentOutcome(event("charge.succeeded", {})), null);
});

test("paid events require the exact amount and currency", () => {
  const paidSession = sessionEvent("checkout.session.completed");
  assert.equal(stripePaymentAmountMatches(stripePaymentDetails(paidSession), 23_400, "INR"), true);
  assert.equal(
    stripePaymentAmountMatches(stripePaymentDetails(sessionEvent("checkout.session.completed", { amount_total: 23_401 })), 23_400, "INR"),
    false,
  );
  assert.equal(
    stripePaymentAmountMatches(stripePaymentDetails(sessionEvent("checkout.session.completed", { currency: "usd" })), 23_400, "INR"),
    false,
  );
  assert.equal(
    stripePaymentAmountMatches(
      stripePaymentDetails(event("payment_intent.succeeded", {
        object: "payment_intent",
        id: "pi_current",
        amount: 23_400,
        amount_received: 23_400,
        currency: "INR",
      })),
      23_400,
      "inr",
    ),
    true,
  );
});

test("payment status transitions are idempotent and cannot regress terminal outcomes", () => {
  assert.equal(nextStripePaymentStatus("unpaid", "processing"), "processing");
  assert.equal(nextStripePaymentStatus("processing", "processing"), null);
  assert.equal(nextStripePaymentStatus("processing", "paid"), "paid");
  assert.equal(nextStripePaymentStatus("paid", "failed"), null);
  assert.equal(nextStripePaymentStatus("paid", "cancelled"), null);
  assert.equal(nextStripePaymentStatus("failed", "processing"), null);
  assert.equal(nextStripePaymentStatus("cancelled", "processing"), null);
  assert.equal(nextStripePaymentStatus("failed", "paid"), "paid");
  assert.equal(nextStripePaymentStatus("cancelled", "paid"), "paid");
  assert.equal(nextStripePaymentStatus("created", "failed"), "failed");
});

test("stale checkout sessions and old payment-intent events are ignored", () => {
  assert.equal(isCurrentStripeCheckoutAttempt(sessionEvent("checkout.session.completed"), "cs_current", "processing", new Date()), true);
  assert.equal(isCurrentStripeCheckoutAttempt(sessionEvent("checkout.session.expired", { id: "cs_old" }), "cs_current", "processing", new Date()), false);

  const retryStartedAt = new Date("2026-08-30T08:00:05.000Z");
  const oldIntent = event("payment_intent.payment_failed", {
    object: "payment_intent",
    id: "pi_old",
    metadata: { bookingId: "booking-1" },
  }, Math.floor(retryStartedAt.getTime() / 1000) - 1);
  const currentIntent = event("payment_intent.processing", {
    object: "payment_intent",
    id: "pi_current",
    metadata: { bookingId: "booking-1" },
  }, Math.floor(retryStartedAt.getTime() / 1000));
  assert.equal(isCurrentStripeCheckoutAttempt(oldIntent, "cs_current", "processing", retryStartedAt), false);
  assert.equal(isCurrentStripeCheckoutAttempt(currentIntent, "cs_current", "processing", retryStartedAt), true);
});