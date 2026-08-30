import Stripe from "stripe";

export type StripePaymentOutcome = "paid" | "failed" | "cancelled" | "processing";
export type PaymentStatus = "created" | "unpaid" | "processing" | "paid" | "failed" | "cancelled";

const SUPPORTED_STRIPE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.processing",
]);

export function stripePaymentOutcome(event: Stripe.Event): StripePaymentOutcome | null {
  if (!SUPPORTED_STRIPE_EVENTS.has(event.type)) return null;

  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  if (
    event.type.endsWith("succeeded") ||
    (event.type === "checkout.session.completed" && object.object === "checkout.session" && object.payment_status === "paid")
  ) {
    return "paid";
  }
  if (event.type.endsWith("failed")) return "failed";
  if (event.type === "checkout.session.expired") return "cancelled";
  return "processing";
}

export function stripePaymentDetails(event: Stripe.Event): { amount: number | null; currency: string | null } {
  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  if (object.object === "checkout.session") {
    return { amount: object.amount_total, currency: object.currency };
  }
  return { amount: object.amount_received || object.amount, currency: object.currency };
}

export function stripePaymentAmountMatches(
  details: { amount: number | null; currency: string | null },
  expectedAmount: number,
  expectedCurrency: string,
): boolean {
  return details.amount === expectedAmount && details.currency?.toLowerCase() === expectedCurrency.toLowerCase();
}

export function nextStripePaymentStatus(
  currentStatus: PaymentStatus,
  outcome: StripePaymentOutcome,
): PaymentStatus | null {
  if (currentStatus === "paid") return null;
  if (outcome === "paid") return "paid";
  if (currentStatus === "failed" || currentStatus === "cancelled") return null;
  if (outcome === "processing" && !["created", "unpaid", "processing"].includes(currentStatus)) return null;

  const nextStatus = outcome === "failed" ? "failed" : outcome === "cancelled" ? "cancelled" : "processing";
  return currentStatus === nextStatus ? null : nextStatus;
}

export function isCurrentStripeCheckoutAttempt(
  event: Stripe.Event,
  providerReference: string | null,
  paymentStatus: PaymentStatus,
  paymentUpdatedAt: Date | null,
): boolean {
  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  if (object.object === "checkout.session" && providerReference && providerReference !== object.id) {
    return false;
  }

  // PaymentIntent events do not carry their Checkout Session ID. A retry moves
  // the payment back to processing, so an event created before that retry is
  // stale even when its metadata still points at the same booking.
  if (object.object === "payment_intent" && paymentStatus === "processing" && paymentUpdatedAt) {
    return event.created >= Math.floor(paymentUpdatedAt.getTime() / 1000);
  }
  return true;
}