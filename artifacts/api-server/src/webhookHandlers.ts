import type Stripe from "stripe";

type StripeWebhookSync = {
  processWebhook(payload: Buffer, signature: string): Promise<unknown>;
};

export type WebhookDependencies = {
  verifyEvent?: (payload: Buffer, signature: string) => Promise<Stripe.Event>;
  getSync?: () => Promise<StripeWebhookSync>;
  applyPaymentEvent?: (event: Stripe.Event) => Promise<unknown>;
};

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, dependencies: WebhookDependencies = {}): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Stripe webhook payload must be a raw Buffer.");
    }
    const verifyEvent = dependencies.verifyEvent ?? (async (rawPayload, rawSignature) => {
      const { verifyStripeEvent } = await import("./lib/stripeClient.ts");
      return verifyStripeEvent(rawPayload, rawSignature);
    });
    const getSync = dependencies.getSync ?? (async () => {
      const { getStripeSync } = await import("./lib/stripeClient.ts");
      return getStripeSync();
    });
    const applyPaymentEvent = dependencies.applyPaymentEvent ?? (async (event) => {
      const { applyStripePaymentEvent } = await import("./lib/booking-payments.ts");
      return applyStripePaymentEvent(event);
    });
    const event = await verifyEvent(payload, signature);
    const sync = await getSync();
    await sync.processWebhook(payload, signature);
    await applyPaymentEvent(event);
  }
}
