import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, bookings, payments } from "@workspace/db";
import { logger } from "./logger.ts";
import { getUncachableStripeClient } from "./stripeClient.ts";
import { BookingConflictError, BookingNotFoundError, findBooking } from "../routes/booking.ts";

const MINOR_UNIT_CURRENCIES = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

function toMinorUnits(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new BookingConflictError("This booking has an invalid payment amount.");
  return Math.round(value * (MINOR_UNIT_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100));
}

function appReturnUrl(reference: string, result: "success" | "cancel") {
  return `travel-land-app://booking/${encodeURIComponent(reference)}?checkout=${result}`;
}

async function createBookingPrice(stripe: Stripe, booking: typeof bookings.$inferSelect, idempotencyKey: string) {
  const product = await stripe.products.create(
    {
      name: `Travel & Land booking ${booking.reference}`,
      metadata: { bookingReference: booking.reference, bookingId: booking.id, kind: "hotel_booking" },
    },
    { idempotencyKey: `${idempotencyKey}-product` },
  );
  return stripe.prices.create(
    {
      product: product.id,
      unit_amount: toMinorUnits(String(booking.totalAmount), booking.currency),
      currency: booking.currency.toLowerCase(),
      metadata: { bookingReference: booking.reference, bookingId: booking.id },
    },
    { idempotencyKey: `${idempotencyKey}-price` },
  );
}

export async function startBookingCheckout(userId: string, reference: string, idempotencyKey: string) {
  const [row] = await db
    .select({ booking: bookings, payment: payments })
    .from(bookings)
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.userId, userId), eq(bookings.reference, reference)));
  if (!row) throw new BookingNotFoundError("Booking not found.");
  if (row.booking.status === "cancelled") throw new BookingConflictError("This booking has been cancelled.");
  if (row.payment?.status === "paid" || row.booking.status === "confirmed") {
    throw new BookingConflictError("This booking has already been paid.");
  }
  if (!row.payment) throw new BookingNotFoundError("The booking payment could not be found.");

  const stripe = await getUncachableStripeClient();
  if (row.payment.status === "processing" && row.payment.providerReference) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(row.payment.providerReference);
      if (existing.status === "open" && existing.url) {
        const booking = await findBooking(userId, reference);
        if (!booking) throw new BookingNotFoundError("Booking not found.");
        return { checkoutUrl: existing.url, booking };
      }
      if (existing.status === "complete") {
        throw new BookingConflictError("This payment is still being confirmed. Refresh the booking before trying again.");
      }
    } catch (error) {
      logger.warn({ err: error, bookingReference: reference }, "Existing Stripe checkout session could not be reused");
    }
  }

  const price = await createBookingPrice(stripe, row.booking, idempotencyKey);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: row.booking.guestEmail,
      client_reference_id: row.booking.reference,
      metadata: { bookingId: row.booking.id, bookingReference: row.booking.reference, userId },
      payment_intent_data: {
        metadata: { bookingId: row.booking.id, bookingReference: row.booking.reference, userId },
      },
      success_url: appReturnUrl(row.booking.reference, "success"),
      cancel_url: appReturnUrl(row.booking.reference, "cancel"),
    },
    { idempotencyKey },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");

  await db
    .update(payments)
    .set({ provider: "stripe", providerReference: session.id, status: "processing", updatedAt: new Date() })
    .where(and(eq(payments.id, row.payment.id), eq(payments.userId, userId)));

  const booking = await findBooking(userId, reference);
  if (!booking) throw new BookingNotFoundError("Booking not found.");
  return { checkoutUrl: session.url, booking };
}

function eventMetadata(event: Stripe.Event) {
  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  return {
    object,
    metadata: object.metadata ?? {},
  };
}

function paidDetails(event: Stripe.Event, object: Stripe.Checkout.Session | Stripe.PaymentIntent) {
  if (object.object === "checkout.session") {
    return { amount: object.amount_total, currency: object.currency };
  }
  return { amount: object.amount_received || object.amount, currency: object.currency };
}

export async function applyStripePaymentEvent(event: Stripe.Event) {
  const supported = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
  ]);
  if (!supported.has(event.type)) return;

  const { object, metadata } = eventMetadata(event);
  const reference = metadata.bookingReference;
  const bookingId = metadata.bookingId;
  if (!reference && !bookingId) return;

  const outcome = event.type.endsWith("succeeded") || (event.type === "checkout.session.completed" && (object as Stripe.Checkout.Session).payment_status === "paid")
    ? "paid"
    : event.type.endsWith("failed")
      ? "failed"
      : event.type === "checkout.session.expired"
        ? "cancelled"
        : "processing";

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ booking: bookings, payment: payments })
      .from(bookings)
      .leftJoin(payments, eq(payments.bookingId, bookings.id))
      .where(bookingId ? eq(bookings.id, bookingId) : eq(bookings.reference, reference!));
    if (!row?.payment) return;

    if (outcome === "paid") {
      const details = paidDetails(event, object);
      const expectedAmount = toMinorUnits(String(row.booking.totalAmount), row.booking.currency);
      if (details.amount !== expectedAmount || details.currency?.toLowerCase() !== row.booking.currency.toLowerCase()) {
        logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring Stripe payment with mismatched amount or currency");
        return;
      }
      if (object.object === "checkout.session" && row.payment.providerReference && row.payment.providerReference !== object.id) {
        logger.info({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring an event for an older Stripe checkout session");
        return;
      }
      if (row.payment.status === "paid") return;
      if (row.booking.status === "cancelled") {
        logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring payment for a cancelled booking");
        return;
      }
      await tx.update(payments).set({ status: "paid", provider: "stripe", updatedAt: new Date() }).where(eq(payments.id, row.payment.id));
      await tx.update(bookings).set({ status: "confirmed", updatedAt: new Date() }).where(and(eq(bookings.id, row.booking.id), eq(bookings.status, "pending_payment")));
      return;
    }

    if (row.payment.status === "paid") return;
    if (outcome === "processing" && row.payment.status !== "unpaid" && row.payment.status !== "processing") return;
    const nextStatus = outcome === "failed" ? "failed" : outcome === "cancelled" ? "cancelled" : "processing";
    if (row.payment.status === nextStatus) return;
    await tx.update(payments).set({ status: nextStatus, provider: "stripe", updatedAt: new Date() }).where(eq(payments.id, row.payment.id));
  });
}