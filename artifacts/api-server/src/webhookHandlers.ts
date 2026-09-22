import type { PaymentProvider, PaymentWebhookEvent } from "./lib/payment-provider.ts";

export type WebhookDependencies = {
  provider?: PaymentProvider;
  applyPaymentEvent?: (event: PaymentWebhookEvent) => Promise<unknown>;
};

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string,
    dependencies: WebhookDependencies = {},
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) throw new Error("Razorpay webhook payload must be a raw Buffer.");
    const provider = dependencies.provider ?? (await import("./lib/razorpay-provider.ts")).getRazorpayPaymentProvider();
    const applyPaymentEvent = dependencies.applyPaymentEvent ?? (async (event) => {
      const { applyRazorpayPaymentEvent } = await import("./lib/booking-payments.ts");
      return applyRazorpayPaymentEvent(event);
    });
    const event = provider.handleWebhook(payload, signature);
    await applyPaymentEvent(event);
  }
}