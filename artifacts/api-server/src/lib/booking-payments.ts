import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, bookings, payments } from "@workspace/db";
import { logger } from "./logger.ts";
import {
  sendBookingEmailSafely,
  type BookingEmail,
  type BookingNotificationKind,
} from "./email.ts";
import { getUncachableStripeClient } from "./stripeClient.ts";
import { createNotification } from "./notifications.ts";
import { BookingConflictError, BookingNotFoundError, findBooking } from "../routes/booking.ts";
import { getHotelCatalogRecord } from "../routes/hotel-catalog.ts";
import {
  isCurrentStripeCheckoutAttempt,
  nextStripePaymentStatus,
  stripePaymentAmountMatches,
  stripePaymentDetails,
  stripePaymentOutcome,
  type PaymentStatus,
} from "./stripe-payment-state.ts";

const MINOR_UNIT_CURRENCIES = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
export type BookingCheckoutDependencies = {
  stripe?: Stripe;
  findBooking?: typeof findBooking;
  loadBookingPayment?: (userId: string, reference: string) => Promise<BookingPaymentRow | null>;
};

type BookingPaymentRow = {
  booking: typeof bookings.$inferSelect;
  payment: typeof payments.$inferSelect | null;
};

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

export async function startBookingCheckout(
  userId: string,
  reference: string,
  idempotencyKey: string,
  dependencies: BookingCheckoutDependencies = {},
) {
  const loadBookingPayment = dependencies.loadBookingPayment ?? (async (requestedUserId: string, requestedReference: string) => {
    const [row] = await db
      .select({ booking: bookings, payment: payments })
      .from(bookings)
      .leftJoin(payments, eq(payments.bookingId, bookings.id))
      .where(and(eq(bookings.userId, requestedUserId), eq(bookings.reference, requestedReference)));
    return row ?? null;
  });
  const row = await loadBookingPayment(userId, reference);
  if (!row) throw new BookingNotFoundError("Booking not found.");
  if (row.booking.status === "cancelled") throw new BookingConflictError("This booking has been cancelled.");
  if (row.payment?.status === "paid" || row.booking.status === "confirmed") {
    throw new BookingConflictError("This booking has already been paid.");
  }
  if (!row.payment) throw new BookingNotFoundError("The booking payment could not be found.");

  const stripe = dependencies.stripe ?? await getUncachableStripeClient();
  const lookupBooking = dependencies.findBooking ?? findBooking;
  if (row.payment.status === "processing" && row.payment.providerReference) {
    let existing: Stripe.Checkout.Session | undefined;
    try {
      existing = await stripe.checkout.sessions.retrieve(row.payment.providerReference);
      if (existing.status === "open" && existing.url) {
        const booking = await lookupBooking(userId, reference);
        if (!booking) throw new BookingNotFoundError("Booking not found.");
        return { checkoutUrl: existing.url, booking };
      }
    } catch (error) {
      if (error instanceof BookingConflictError) throw error;
      logger.warn({ err: error, bookingReference: reference }, "Existing Stripe checkout session could not be reused");
    }
    if (existing?.status === "complete") {
      throw new BookingConflictError("This payment is still being confirmed. Refresh the booking before trying again.");
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

  const booking = await lookupBooking(userId, reference);
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

function paymentEmailInput(
  booking: typeof bookings.$inferSelect,
  kind: BookingNotificationKind,
): BookingEmail {
  return {
    to: booking.guestEmail,
    guestName: booking.guestName,
    reference: booking.reference,
    hotelName: getHotelCatalogRecord(booking.hotelCatalogId)?.name ?? "Selected hotel",
    startsOn: String(booking.startsOn),
    endsOn: String(booking.endsOn),
    total: Number(booking.totalAmount),
    currency: booking.currency,
    kind,
  };
}

export async function applyStripePaymentEvent(event: Stripe.Event) {
  const { object, metadata } = eventMetadata(event);
  const outcome = stripePaymentOutcome(event);
  if (!outcome) return;
  const reference = metadata.bookingReference;
  const bookingId = metadata.bookingId;
  if (!reference && !bookingId) return;

  let eventNotification: { userId: string; reference: string; type: "payment_successful" | "payment_failed" | "payment_pending"; title: string; body: string } | null = null;
  const notification = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ booking: bookings, payment: payments })
      .from(bookings)
      .leftJoin(payments, eq(payments.bookingId, bookings.id))
      .where(bookingId ? eq(bookings.id, bookingId) : eq(bookings.reference, reference!));
    if (!row?.payment) return null;
    if (
      (metadata.bookingId && metadata.bookingId !== row.booking.id) ||
      (metadata.bookingReference && metadata.bookingReference !== row.booking.reference) ||
      (metadata.userId && metadata.userId !== row.booking.userId)
    ) {
      logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring Stripe event with mismatched booking metadata");
      return null;
    }
    if (
      !isCurrentStripeCheckoutAttempt(
        event,
        row.payment.providerReference,
        row.payment.status as PaymentStatus,
        row.payment.updatedAt,
      )
    ) {
      logger.info({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring an event for an older Stripe checkout attempt");
      return null;
    }

    if (outcome === "paid") {
      const details = stripePaymentDetails(event);
      const expectedAmount = toMinorUnits(String(row.booking.totalAmount), row.booking.currency);
      if (!stripePaymentAmountMatches(details, expectedAmount, row.booking.currency)) {
        logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring Stripe payment with mismatched amount or currency");
        return null;
      }
      if (row.booking.status === "cancelled") {
        logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring payment for a cancelled booking");
        return null;
      }
      const [updatedPayment] = await tx
        .update(payments)
        // Keep updatedAt as the checkout-attempt start marker. A webhook can
        // arrive out of order, so refreshing it here would make a delayed
        // event from the same attempt look newer than it really is.
        .set({ status: "paid", provider: "stripe" })
        .where(and(eq(payments.id, row.payment.id), eq(payments.status, row.payment.status)))
        .returning();
      if (!updatedPayment) return null;
      await tx.update(bookings).set({ status: "confirmed", updatedAt: new Date() }).where(and(eq(bookings.id, row.booking.id), eq(bookings.status, "pending_payment")));
      eventNotification = {
        userId: row.booking.userId,
        reference: row.booking.reference,
        type: "payment_successful",
        title: "Payment received",
        body: `Payment for booking ${row.booking.reference} was received and the booking is confirmed.`,
      };
      return paymentEmailInput(row.booking, "payment_confirmed");
    }

    const nextStatus = nextStripePaymentStatus(row.payment.status as PaymentStatus, outcome);
    if (!nextStatus) return null;
    const [updatedPayment] = await tx
      .update(payments)
      .set({ status: nextStatus, provider: "stripe" })
      .where(and(eq(payments.id, row.payment.id), eq(payments.status, row.payment.status)))
      .returning();
    if (!updatedPayment) return null;
    const notificationKind: BookingNotificationKind =
      outcome === "failed"
        ? "payment_failed"
        : outcome === "cancelled"
          ? "payment_expired"
          : "payment_processing";
    eventNotification = {
      userId: row.booking.userId,
      reference: row.booking.reference,
      type: outcome === "failed" ? "payment_failed" : "payment_pending",
      title: outcome === "failed" ? "Payment failed" : "Payment update",
      body: outcome === "failed"
        ? `Payment for booking ${row.booking.reference} failed. You can try checkout again.`
        : `Payment for booking ${row.booking.reference} is still being processed.`,
    };
    return paymentEmailInput(row.booking, notificationKind);
  });
  const completedEventNotification: {
    userId: string;
    reference: string;
    type: "payment_successful" | "payment_failed" | "payment_pending";
    title: string;
    body: string;
  } | null = eventNotification as {
    userId: string;
    reference: string;
    type: "payment_successful" | "payment_failed" | "payment_pending";
    title: string;
    body: string;
  } | null;
  if (notification) {
    if (completedEventNotification) {
      await createNotification(completedEventNotification.userId, {
        type: completedEventNotification.type,
        title: completedEventNotification.title,
        body: completedEventNotification.body,
        relatedType: "booking",
        relatedId: completedEventNotification.reference,
        dedupeKey: `payment-event:${event.id}`,
      });
    }
    await sendBookingEmailSafely(notification);
  }
  return notification;
}