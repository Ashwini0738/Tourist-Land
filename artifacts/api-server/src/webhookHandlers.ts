import { applyStripePaymentEvent } from "./lib/booking-payments.ts";
import { getStripeSync, verifyStripeEvent } from "./lib/stripeClient.ts";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Stripe webhook payload must be a raw Buffer.");
    }
    const event = await verifyStripeEvent(payload, signature);
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    await applyStripePaymentEvent(event);
  }
}