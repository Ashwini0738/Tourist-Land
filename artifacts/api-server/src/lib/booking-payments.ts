import { and, eq, inArray, lt, or } from "drizzle-orm";
import { db, bookings, payments } from "@workspace/db";
import { logger } from "./logger.ts";
import {
  sendBookingEmailSafely,
  type BookingEmail,
  type BookingNotificationKind,
} from "./email.ts";
import { createNotification } from "./notifications.ts";
import {
  BookingConflictError,
  BookingNotFoundError,
  BookingProviderUnavailableError,
  findBooking,
} from "../routes/booking.ts";
import { getHotelCatalogRecord } from "../routes/hotel-catalog.ts";
import { inventoryOffersEnabled } from "../routes/hotel-inventory-policy.ts";
import {
  getRazorpayPaymentProvider,
} from "./razorpay-provider.ts";
import type {
  PaymentProvider,
  PaymentWebhookEvent,
  ProviderPayment,
} from "./payment-provider.ts";

const MINOR_UNIT_CURRENCIES = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
const checkoutClaimPrefix = "checkout-pending:";
const checkoutClaimTimeoutMs = 5 * 60 * 1000;
const checkoutLocks = new Map<string, Promise<unknown>>();

type BookingPaymentRow = {
  booking: typeof bookings.$inferSelect;
  payment: typeof payments.$inferSelect | null;
};

export type BookingCheckoutDependencies = {
  provider?: PaymentProvider;
  findBooking?: typeof findBooking;
  loadBookingPayment?: (userId: string, reference: string) => Promise<BookingPaymentRow | null>;
  inventoryEnv?: NodeJS.ProcessEnv;
};

export type VerifyBookingPaymentInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

function toMinorUnits(amount: string, currency: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new BookingConflictError("This booking has an invalid payment amount.");
  return Math.round(value * (MINOR_UNIT_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100));
}

function paymentReference(orderId: string, paymentId?: string): string {
  return paymentId ? `${orderId}|${paymentId}` : orderId;
}

function parsePaymentReference(value: string | null): { orderId: string | null; paymentId: string | null } {
  if (!value || value.startsWith(checkoutClaimPrefix)) return { orderId: null, paymentId: null };
  const [orderId, paymentId] = value.split("|", 2);
  return { orderId: orderId || null, paymentId: paymentId || null };
}

async function defaultLoadBookingPayment(userId: string, reference: string): Promise<BookingPaymentRow | null> {
  const [row] = await db
    .select({ booking: bookings, payment: payments })
    .from(bookings)
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.userId, userId), eq(bookings.reference, reference)));
  return row ?? null;
}

function validateOwnedPayableBooking(row: BookingPaymentRow | null): asserts row is BookingPaymentRow & { payment: NonNullable<BookingPaymentRow["payment"]> } {
  if (!row) throw new BookingNotFoundError("Booking not found.");
  if (row.booking.status === "cancelled") throw new BookingConflictError("This booking has been cancelled.");
  if (row.payment?.status === "paid" || row.booking.status === "confirmed") {
    throw new BookingConflictError("This booking has already been paid.");
  }
  if (!row.payment) throw new BookingNotFoundError("The booking payment could not be found.");
}

function checkoutResponse(
  provider: PaymentProvider,
  order: { id: string; amount: number; currency: string },
  booking: NonNullable<Awaited<ReturnType<typeof findBooking>>>,
) {
  return {
    provider: provider.name,
    keyId: provider.publicKeyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    name: "Travel & Land",
    description: `Booking ${booking.reference}`,
    prefill: {
      name: booking.guest.name,
      email: booking.guest.email,
      contact: booking.guest.phone ?? "",
    },
    booking,
  };
}

async function startBookingCheckoutUnlocked(
  userId: string,
  reference: string,
  idempotencyKey: string,
  dependencies: BookingCheckoutDependencies,
) {
  const loadBookingPayment = dependencies.loadBookingPayment ?? defaultLoadBookingPayment;
  const row = await loadBookingPayment(userId, reference);
  validateOwnedPayableBooking(row);
  if (!inventoryOffersEnabled(dependencies.inventoryEnv)) {
    throw new BookingProviderUnavailableError(
      "A managed live inventory provider is not connected. Checkout was not started.",
    );
  }

  const provider = dependencies.provider ?? getRazorpayPaymentProvider();
  const lookupBooking = dependencies.findBooking ?? findBooking;
  const currentReference = parsePaymentReference(row.payment.providerReference);

  if (
    row.payment.status === "processing" &&
    row.payment.provider === provider.name &&
    currentReference.orderId
  ) {
    const existingOrder = await provider.getOrder(currentReference.orderId);
    if (existingOrder.status === "paid") {
      throw new BookingConflictError("This payment is still being confirmed. Refresh the booking before trying again.");
    }
    const expectedAmount = toMinorUnits(String(row.booking.totalAmount), row.booking.currency);
    if (existingOrder.amount !== expectedAmount || existingOrder.currency !== row.booking.currency.toUpperCase()) {
      throw new BookingConflictError("The existing payment order does not match this booking.");
    }
    const booking = await lookupBooking(userId, reference);
    if (!booking) throw new BookingNotFoundError("Booking not found.");
    return checkoutResponse(provider, existingOrder, booking);
  }

  if (row.payment.status === "processing" && row.payment.providerReference?.startsWith(checkoutClaimPrefix)) {
    const claimAge = Date.now() - row.payment.updatedAt.getTime();
    if (claimAge < checkoutClaimTimeoutMs) {
      throw new BookingConflictError("Checkout is already being started. Please retry in a moment.");
    }
  } else if (row.payment.status === "processing") {
    throw new BookingConflictError("A payment attempt is already being processed. Refresh the booking before trying again.");
  }

  const shouldClaimPayment = !dependencies.loadBookingPayment;
  const claimReference = `${checkoutClaimPrefix}${idempotencyKey}`;
  if (shouldClaimPayment) {
    const staleClaimBefore = new Date(Date.now() - checkoutClaimTimeoutMs);
    const staleClaim = row.payment.providerReference?.startsWith(checkoutClaimPrefix)
      ? and(
          eq(payments.status, "processing"),
          eq(payments.providerReference, row.payment.providerReference),
          lt(payments.updatedAt, staleClaimBefore),
        )
      : undefined;
    const [claimed] = await db
      .update(payments)
      .set({
        provider: provider.name,
        providerReference: claimReference,
        status: "processing",
        updatedAt: new Date(),
      })
      .where(and(
        eq(payments.id, row.payment.id),
        eq(payments.userId, userId),
        or(
          inArray(payments.status, ["created", "unpaid", "failed", "cancelled"]),
          ...(staleClaim ? [staleClaim] : []),
        ),
      ))
      .returning();
    if (!claimed) throw new BookingConflictError("Checkout is already being started. Please retry in a moment.");
  }

  let order;
  try {
    order = await provider.createOrder({
      amount: toMinorUnits(String(row.booking.totalAmount), row.booking.currency),
      currency: row.booking.currency,
      receipt: row.booking.reference,
      notes: {
        bookingId: row.booking.id,
        bookingReference: row.booking.reference,
        userId,
      },
    }, idempotencyKey);
  } catch (error) {
    if (shouldClaimPayment) {
      await db.update(payments)
        .set({ providerReference: null, status: "failed", updatedAt: new Date() })
        .where(and(
          eq(payments.id, row.payment.id),
          eq(payments.userId, userId),
          eq(payments.providerReference, claimReference),
        ));
    }
    throw error;
  }

  if (shouldClaimPayment) {
    const [updatedPayment] = await db
      .update(payments)
      .set({
        provider: provider.name,
        providerReference: paymentReference(order.id),
        status: "processing",
        updatedAt: new Date(),
      })
      .where(and(
        eq(payments.id, row.payment.id),
        eq(payments.userId, userId),
        eq(payments.providerReference, claimReference),
      ))
      .returning();
    if (!updatedPayment) {
      throw new BookingConflictError("Checkout changed before it could be saved. Please refresh your booking.");
    }
  }

  const booking = await lookupBooking(userId, reference);
  if (!booking) throw new BookingNotFoundError("Booking not found.");
  return checkoutResponse(provider, order, booking);
}

export async function startBookingCheckout(
  userId: string,
  reference: string,
  idempotencyKey: string,
  dependencies: BookingCheckoutDependencies = {},
) {
  const lockKey = `${userId}:${reference}`;
  const previous = checkoutLocks.get(lockKey) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => startBookingCheckoutUnlocked(userId, reference, idempotencyKey, dependencies));
  checkoutLocks.set(lockKey, current);
  try {
    return await current;
  } finally {
    if (checkoutLocks.get(lockKey) === current) checkoutLocks.delete(lockKey);
  }
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

function paymentMatchesBooking(payment: ProviderPayment, booking: typeof bookings.$inferSelect): boolean {
  return (
    payment.amount === toMinorUnits(String(booking.totalAmount), booking.currency) &&
    payment.currency === booking.currency.toUpperCase()
  );
}

async function notifyPaymentOutcome(
  eventId: string,
  userId: string,
  reference: string,
  outcome: "paid" | "failed",
  email: BookingEmail | null,
) {
  await createNotification(userId, {
    type: outcome === "paid" ? "payment_successful" : "payment_failed",
    title: outcome === "paid" ? "Payment received" : "Payment failed",
    body: outcome === "paid"
      ? `Payment for booking ${reference} was received and the booking is confirmed.`
      : `Payment for booking ${reference} failed. You can try checkout again.`,
    relatedType: "booking",
    relatedId: reference,
    dedupeKey: `payment-event:${eventId}`,
  });
  if (email) await sendBookingEmailSafely(email);
}

export async function verifyBookingPayment(
  userId: string,
  reference: string,
  input: VerifyBookingPaymentInput,
  dependencies: BookingCheckoutDependencies = {},
) {
  const provider = dependencies.provider ?? getRazorpayPaymentProvider();
  const loadBookingPayment = dependencies.loadBookingPayment ?? defaultLoadBookingPayment;
  const row = await loadBookingPayment(userId, reference);
  if (!row?.payment) throw new BookingNotFoundError("Booking payment not found.");
  if (row.booking.status === "cancelled") throw new BookingConflictError("This booking has been cancelled.");
  const stored = parsePaymentReference(row.payment.providerReference);
  if (
    row.payment.status === "paid" &&
    stored.orderId === input.orderId &&
    stored.paymentId === input.paymentId
  ) {
    const existing = await (dependencies.findBooking ?? findBooking)(userId, reference);
    if (!existing) throw new BookingNotFoundError("Booking not found.");
    return existing;
  }
  if (
    row.payment.provider !== provider.name ||
    stored.orderId !== input.orderId ||
    !provider.verifyPayment(input)
  ) {
    throw new BookingConflictError("Payment verification failed.");
  }

  let payment = await provider.getPayment(input.paymentId);
  if (payment.orderId !== input.orderId || !paymentMatchesBooking(payment, row.booking)) {
    throw new BookingConflictError("Payment details do not match this booking.");
  }
  if (payment.status === "authorized" && !payment.captured) {
    payment = await provider.capturePayment(payment.id, payment.amount, payment.currency);
  }
  if (payment.status !== "captured" || !payment.captured) {
    throw new BookingConflictError("Payment has not been captured.");
  }

  const email = await db.transaction(async (tx) => {
    const [updatedPayment] = await tx.update(payments)
      .set({
        provider: provider.name,
        providerReference: paymentReference(input.orderId, input.paymentId),
        status: "paid",
      })
      .where(and(
        eq(payments.id, row.payment!.id),
        eq(payments.userId, userId),
        eq(payments.providerReference, input.orderId),
        inArray(payments.status, ["processing", "failed"]),
      ))
      .returning();
    if (!updatedPayment) return null;
    if (inventoryOffersEnabled(dependencies.inventoryEnv)) {
      await tx.update(bookings)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(and(eq(bookings.id, row.booking.id), eq(bookings.status, "pending_payment")));
    }
    return paymentEmailInput(row.booking, "payment_confirmed");
  });

  if (email) {
    await notifyPaymentOutcome(`client:${input.paymentId}`, userId, reference, "paid", email);
  }
  const booking = await (dependencies.findBooking ?? findBooking)(userId, reference);
  if (!booking) throw new BookingNotFoundError("Booking not found.");
  return booking;
}

export async function applyRazorpayPaymentEvent(
  event: PaymentWebhookEvent,
  dependencies: { inventoryEnv?: NodeJS.ProcessEnv } = {},
) {
  if (!["payment.captured", "payment.failed"].includes(event.type) || !event.payment) return;
  const providerPayment = event.payment;
  const notes = { ...(event.order?.notes ?? {}), ...(providerPayment.notes ?? {}) };
  const bookingId = notes.bookingId;
  const reference = notes.bookingReference;
  if (!bookingId && !reference) return;

  let outcome: "paid" | "failed" | null = null;
  const email = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ booking: bookings, payment: payments })
      .from(bookings)
      .leftJoin(payments, eq(payments.bookingId, bookings.id))
      .where(bookingId ? eq(bookings.id, bookingId) : eq(bookings.reference, reference!));
    if (!row?.payment || row.payment.provider !== "razorpay") return null;
    if (
      (bookingId && bookingId !== row.booking.id) ||
      (reference && reference !== row.booking.reference) ||
      (notes.userId && notes.userId !== row.booking.userId)
    ) {
      logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring Razorpay event with mismatched booking metadata");
      return null;
    }
    const stored = parsePaymentReference(row.payment.providerReference);
    if (stored.orderId !== providerPayment.orderId) {
      logger.info({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring an event for an older Razorpay order");
      return null;
    }

    if (event.type === "payment.captured") {
      if (!paymentMatchesBooking(providerPayment, row.booking) || row.booking.status === "cancelled") {
        logger.warn({ bookingReference: row.booking.reference, eventId: event.id }, "Ignoring Razorpay payment with invalid booking state, amount, or currency");
        return null;
      }
      const [updatedPayment] = await tx.update(payments)
        .set({
          providerReference: paymentReference(providerPayment.orderId, providerPayment.id),
          status: "paid",
        })
        .where(and(
          eq(payments.id, row.payment.id),
          inArray(payments.status, ["processing", "failed"]),
        ))
        .returning();
      if (!updatedPayment) return null;
      if (inventoryOffersEnabled(dependencies.inventoryEnv)) {
        await tx.update(bookings)
          .set({ status: "confirmed", updatedAt: new Date() })
          .where(and(eq(bookings.id, row.booking.id), eq(bookings.status, "pending_payment")));
      }
      outcome = "paid";
      return paymentEmailInput(row.booking, "payment_confirmed");
    }

    const [updatedPayment] = await tx.update(payments)
      .set({ status: "failed" })
      .where(and(eq(payments.id, row.payment.id), eq(payments.status, "processing")))
      .returning();
    if (!updatedPayment) return null;
    outcome = "failed";
    return paymentEmailInput(row.booking, "payment_failed");
  });

  if (outcome) {
    await notifyPaymentOutcome(event.id, notes.userId ?? "", reference ?? "", outcome, email);
  }
  return email;
}