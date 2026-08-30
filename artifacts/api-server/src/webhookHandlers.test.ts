import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { WebhookHandlers } from "./webhookHandlers.ts";
import { stripePaymentOutcome } from "./lib/stripe-payment-state.ts";

const webhookSecret = "whsec_test_travel_land";
const signer = new Stripe("sk_test_travel_land");

function event(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    object: "event",
    api_version: "2025-06-30.basil",
    created: 1_000,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event;
}

async function processSignedEvent(input: Stripe.Event) {
  const payload = Buffer.from(JSON.stringify(input));
  const signature = signer.webhooks.generateTestHeaderString({
    payload: payload.toString("utf8"),
    secret: webhookSecret,
  });
  let syncedPayload: Buffer | undefined;
  let syncedSignature: string | undefined;
  let applied: Stripe.Event | undefined;
  await WebhookHandlers.processWebhook(payload, signature, {
    verifyEvent: (signedPayload, signedSignature) =>
      Promise.resolve(signer.webhooks.constructEvent(signedPayload, signedSignature, webhookSecret)),
    getSync: async () =>
      ({
        processWebhook: async (rawPayload: Buffer, rawSignature: string) => {
          syncedPayload = rawPayload;
          syncedSignature = rawSignature;
        },
      }) as any,
    applyPaymentEvent: async (verifiedEvent) => {
      applied = verifiedEvent;
    },
  });
  assert.deepEqual(syncedPayload, payload);
  assert.equal(syncedSignature, signature);
  assert.equal(applied?.id, input.id);
  return stripePaymentOutcome(applied!);
}

test("signed webhooks dispatch paid, failed, cancelled, and processing outcomes", async () => {
  const baseSession = {
    object: "checkout.session",
    id: "cs_current",
    metadata: { bookingId: "booking-1", bookingReference: "TL-1001" },
    amount_total: 23_400,
    currency: "inr",
    payment_status: "paid",
  };
  assert.equal(await processSignedEvent(event("checkout.session.completed", baseSession)), "paid");
  assert.equal(await processSignedEvent(event("checkout.session.async_payment_failed", { ...baseSession, payment_status: "unpaid" })), "failed");
  assert.equal(await processSignedEvent(event("checkout.session.expired", { ...baseSession, payment_status: "unpaid" })), "cancelled");
  assert.equal(
    await processSignedEvent(event("payment_intent.processing", {
      object: "payment_intent",
      id: "pi_current",
      metadata: { bookingId: "booking-1", bookingReference: "TL-1001" },
      amount: 23_400,
      amount_received: 0,
      currency: "inr",
    })),
    "processing",
  );
});

test("invalid webhook signatures stop processing before Stripe sync or payment updates", async () => {
  const payload = Buffer.from(JSON.stringify(event("checkout.session.completed", {
    object: "checkout.session",
    id: "cs_current",
    metadata: { bookingId: "booking-1" },
    amount_total: 23_400,
    currency: "inr",
    payment_status: "paid",
  })));
  const validSignature = signer.webhooks.generateTestHeaderString({
    payload: payload.toString("utf8"),
    secret: webhookSecret,
  });
  let syncCalled = false;
  let applyCalled = false;
  await assert.rejects(
    WebhookHandlers.processWebhook(payload, `${validSignature}tampered`, {
      verifyEvent: (signedPayload, signedSignature) =>
        Promise.resolve(signer.webhooks.constructEvent(signedPayload, signedSignature, webhookSecret)),
      getSync: async () => {
        syncCalled = true;
        return { processWebhook: async () => {} } as any;
      },
      applyPaymentEvent: async () => {
        applyCalled = true;
      },
    }),
    /No signatures found/,
  );
  assert.equal(syncCalled, false);
  assert.equal(applyCalled, false);
});