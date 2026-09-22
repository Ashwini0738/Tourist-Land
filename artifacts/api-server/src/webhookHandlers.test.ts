import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { RazorpayPaymentProvider } from "./lib/razorpay-provider.ts";
import type { PaymentWebhookEvent } from "./lib/payment-provider.ts";
import { WebhookHandlers } from "./webhookHandlers.ts";

const env = {
  RAZORPAY_KEY_ID: "rzp_test_public",
  RAZORPAY_KEY_SECRET: "razorpay_test_secret",
  RAZORPAY_WEBHOOK_SECRET: "razorpay_webhook_secret",
} as NodeJS.ProcessEnv;

function signedPayload() {
  const payload = Buffer.from(JSON.stringify({
    event: "payment.captured",
    created_at: 1_000,
    payload: {
      payment: {
        entity: {
          id: "pay_current",
          order_id: "order_current",
          amount: 23_400,
          currency: "INR",
          status: "captured",
          captured: true,
          notes: { bookingId: "booking-1", bookingReference: "TL-1001", userId: "traveller-1" },
        },
      },
    },
  }));
  return {
    payload,
    signature: createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET!).update(payload).digest("hex"),
  };
}

test("signed Razorpay webhooks dispatch only the verified normalized event", async () => {
  const { payload, signature } = signedPayload();
  let applied: PaymentWebhookEvent | undefined;
  await WebhookHandlers.processWebhook(payload, signature, {
    provider: new RazorpayPaymentProvider(env),
    applyPaymentEvent: async (event) => {
      applied = event;
    },
  });

  assert.equal(applied?.type, "payment.captured");
  assert.equal(applied?.payment?.id, "pay_current");
  assert.equal(applied?.payment?.orderId, "order_current");
});

test("invalid webhook signatures stop processing before payment updates", async () => {
  const { payload, signature } = signedPayload();
  let applyCalled = false;
  await assert.rejects(
    WebhookHandlers.processWebhook(payload, `${signature}0`, {
      provider: new RazorpayPaymentProvider(env),
      applyPaymentEvent: async () => {
        applyCalled = true;
      },
    }),
    /Invalid Razorpay webhook signature/,
  );
  assert.equal(applyCalled, false);
});