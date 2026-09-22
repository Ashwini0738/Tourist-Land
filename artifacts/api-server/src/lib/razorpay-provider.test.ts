import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  RazorpayPaymentProvider,
  razorpayConfigured,
} from "./razorpay-provider.ts";
import {
  PaymentProviderConfigurationError,
  PaymentProviderRequestError,
} from "./payment-provider.ts";

const env = {
  RAZORPAY_KEY_ID: "rzp_test_public",
  RAZORPAY_KEY_SECRET: "razorpay_test_secret",
  RAZORPAY_WEBHOOK_SECRET: "razorpay_webhook_secret",
} as NodeJS.ProcessEnv;

test("Razorpay configuration is optional at startup but required by the provider", () => {
  assert.equal(razorpayConfigured({}), false);
  assert.equal(razorpayConfigured(env), true);
  assert.throws(() => new RazorpayPaymentProvider({}), PaymentProviderConfigurationError);
});

test("Razorpay payment signatures accept valid details and reject mismatches", () => {
  const provider = new RazorpayPaymentProvider(env);
  const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
    .update("order_current|pay_current")
    .digest("hex");

  assert.equal(provider.verifyPayment({
    orderId: "order_current",
    paymentId: "pay_current",
    signature,
  }), true);
  assert.equal(provider.verifyPayment({
    orderId: "order_other",
    paymentId: "pay_current",
    signature,
  }), false);
});

test("Razorpay order creation sends only trusted order fields", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requestBody: unknown;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "order_current",
      amount: 23_400,
      amount_paid: 0,
      currency: "INR",
      receipt: "TL-1001",
      status: "created",
      notes: { bookingId: "booking-1" },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const order = await new RazorpayPaymentProvider(env).createOrder({
    amount: 23_400,
    currency: "INR",
    receipt: "TL-1001",
    notes: { bookingId: "booking-1" },
  }, "checkout-key");

  assert.equal(order.id, "order_current");
  assert.deepEqual(requestBody, {
    amount: 23_400,
    currency: "INR",
    receipt: "TL-1001",
    notes: { bookingId: "booking-1" },
  });
});

test("Razorpay provider failures return safe errors without response bodies", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: { description: "private provider detail" } }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );

  await assert.rejects(
    new RazorpayPaymentProvider(env).getOrder("order_current"),
    (error: unknown) =>
      error instanceof PaymentProviderRequestError &&
      error.message === "Razorpay request failed with status 401.",
  );
});