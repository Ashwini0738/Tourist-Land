import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, bookings, payments, reviews, users } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth.ts";
import { getPublishedHotelReviewAggregate } from "../lib/hotel-review-aggregate.ts";
import { getHotelCatalogRecord } from "./hotel-catalog.ts";

const reviewsRouter: IRouter = Router();

function invalid(res: Parameters<Parameters<IRouter["post"]>[1]>[1], message: string) {
  res.status(400).json({ error: { code: "INVALID_INPUT", message } });
}

function reviewPayload(review: typeof reviews.$inferSelect, displayName: string | null) {
  return {
    id: review.id,
    entityType: review.entityType,
    entityId: review.entityId,
    bookingReference: null,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    authorName: displayName || "Traveller",
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

function completedBooking(booking: typeof bookings.$inferSelect) {
  const end = new Date(`${booking.endsOn}T23:59:59Z`);
  return booking.status === "confirmed" && end.getTime() < Date.now();
}

reviewsRouter.get("/v1/hotels/:hotelId/reviews", async (req, res): Promise<void> => {
  const hotelId = String(req.params.hotelId);
  if (!getHotelCatalogRecord(hotelId)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found." } });
    return;
  }
  const page = Math.max(1, Math.min(10_000, Number(req.query.page) || 1));
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const [rows, aggregate] = await Promise.all([
    db.select({ review: reviews, user: users })
      .from(reviews)
      .leftJoin(users, eq(users.id, reviews.userId))
      .where(and(eq(reviews.entityType, "hotel"), eq(reviews.entityId, hotelId), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    getPublishedHotelReviewAggregate(hotelId),
  ]);
  const count = aggregate?.reviewCount ?? 0;
  res.json({
    items: rows.map(({ review, user }) => ({
      ...reviewPayload(review, user?.displayName ?? null),
      bookingReference: null,
    })),
    ratingAverage: aggregate?.ratingAverage ?? null,
    reviewCount: count,
    page,
    limit,
    hasMore: offset + rows.length < count,
  });
});

reviewsRouter.use(requireAuth);

reviewsRouter.get("/v1/reviews", async (req, res): Promise<void> => {
  const rows = await db.select({ review: reviews, booking: bookings })
    .from(reviews)
    .leftJoin(bookings, eq(bookings.id, reviews.bookingId))
    .where(eq(reviews.userId, req.localUser!.id))
    .orderBy(desc(reviews.createdAt));
  res.json({
    items: rows.map(({ review, booking }) => ({
      ...reviewPayload(review, null),
      bookingReference: booking?.reference ?? null,
    })),
  });
});

reviewsRouter.get("/v1/reviews/eligible", async (req, res): Promise<void> => {
  const rows = await db.select({ booking: bookings, payment: payments })
    .from(bookings)
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.userId, req.localUser!.id), eq(bookings.status, "confirmed"), eq(payments.status, "paid")));
  const existing = await db.select({ bookingId: reviews.bookingId }).from(reviews)
    .where(eq(reviews.userId, req.localUser!.id));
  const reviewed = new Set(existing.map((item) => item.bookingId).filter(Boolean));
  res.json({
    items: rows
      .filter(({ booking }) => completedBooking(booking) && !reviewed.has(booking.id))
      .map(({ booking }) => ({
        bookingReference: booking.reference,
        entityType: "hotel",
        entityId: booking.hotelCatalogId,
        hotelName: getHotelCatalogRecord(booking.hotelCatalogId)?.name ?? "Selected hotel",
        stayEndedOn: String(booking.endsOn),
      })),
  });
});

reviewsRouter.post("/v1/reviews", async (req, res): Promise<void> => {
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const entityType = body.entityType;
  const entityId = typeof body.entityId === "string" ? body.entityId.trim() : "";
  const bookingReference = typeof body.bookingReference === "string" ? body.bookingReference.trim() : "";
  const rating = Number(body.rating);
  const title = body.title == null ? null : String(body.title).trim();
  const reviewBody = body.body == null ? null : String(body.body).trim();
  if (entityType !== "hotel" || !entityId || !bookingReference || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      (title != null && title.length > 120) || (reviewBody != null && (reviewBody.length < 10 || reviewBody.length > 2000))) {
    invalid(res, "Choose a hotel, a completed stay, a rating from 1 to 5, and an optional comment of 10 to 2,000 characters.");
    return;
  }
  if (!getHotelCatalogRecord(entityId)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found." } });
    return;
  }
  const [owned] = await db.select({ booking: bookings, payment: payments })
    .from(bookings)
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(
      eq(bookings.userId, req.localUser!.id),
      eq(bookings.reference, bookingReference),
      eq(bookings.hotelCatalogId, entityId),
    ));
  if (!owned || owned.payment?.status !== "paid" || !completedBooking(owned.booking)) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Reviews are available after a paid, completed stay that you own." } });
    return;
  }
  const [created] = await db.insert(reviews).values({
    userId: req.localUser!.id,
    entityType: "hotel",
    entityId,
    bookingId: owned.booking.id,
    rating,
    title: title || null,
    body: reviewBody || null,
    status: "published",
  }).onConflictDoNothing().returning();
  if (!created) {
    res.status(409).json({ error: { code: "CONFLICT", message: "You have already reviewed this stay." } });
    return;
  }
  res.status(201).json({ ...reviewPayload(created, null), bookingReference });
});

reviewsRouter.put("/v1/reviews/:id", async (req, res): Promise<void> => {
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const rating = Number(body.rating);
  const title = body.title == null ? null : String(body.title).trim();
  const reviewBody = body.body == null ? null : String(body.body).trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || (title != null && title.length > 120) ||
      (reviewBody != null && (reviewBody.length < 10 || reviewBody.length > 2000))) {
    invalid(res, "Rating must be from 1 to 5 and the optional comment must be 10 to 2,000 characters.");
    return;
  }
  const [updated] = await db.update(reviews).set({
    rating,
    title: title || null,
    body: reviewBody || null,
    status: "published",
    updatedAt: new Date(),
  }).where(and(eq(reviews.id, req.params.id), eq(reviews.userId, req.localUser!.id))).returning();
  if (!updated) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Review not found." } });
    return;
  }
  res.json({ ...reviewPayload(updated, null), bookingReference: null });
});

reviewsRouter.delete("/v1/reviews/:id", async (req, res): Promise<void> => {
  const deleted = await db.delete(reviews)
    .where(and(eq(reviews.id, req.params.id), eq(reviews.userId, req.localUser!.id)))
    .returning({ id: reviews.id });
  if (!deleted.length) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Review not found." } });
    return;
  }
  res.sendStatus(204);
});

export default reviewsRouter;