import { and, eq, inArray, sql } from "drizzle-orm";
import { db, hotels, reviews } from "@workspace/db";
import { demoModeEnabled } from "./demo-mode.ts";

export type PublishedHotelReviewAggregate = {
  ratingAverage: number;
  reviewCount: number;
};

function aggregateRow(row: { entityId: string; count: number; average: number | null }) {
  const reviewCount = Number(row.count);
  if (reviewCount === 0 || row.average == null) return null;
  return {
    ratingAverage: Number(Number(row.average).toFixed(1)),
    reviewCount,
  };
}

export async function getPublishedHotelReviewAggregate(entityId: string) {
  return (await getPublishedHotelReviewAggregates([entityId])).get(entityId) ?? null;
}

export async function getPublishedHotelReviewAggregates(entityIds: string[]) {
  if (entityIds.length === 0 || !demoModeEnabled()) return new Map<string, PublishedHotelReviewAggregate>();

  const persistedHotels = await db.select({ catalogId: hotels.catalogId })
    .from(hotels)
    .where(and(
      inArray(hotels.catalogId, entityIds),
      eq(hotels.status, "published"),
      eq(hotels.approvalStatus, "approved"),
    ));
  const persistedHotelIds = persistedHotels.flatMap((hotel) => hotel.catalogId ? [hotel.catalogId] : []);
  if (persistedHotelIds.length === 0) return new Map<string, PublishedHotelReviewAggregate>();

  const rows = await db.select({
    entityId: reviews.entityId,
    count: sql<number>`count(*)`,
    average: sql<number | null>`avg(${reviews.rating})`,
  })
    .from(reviews)
    .where(and(
      eq(reviews.entityType, "hotel"),
      inArray(reviews.entityId, persistedHotelIds),
      eq(reviews.status, "published"),
    ))
    .groupBy(reviews.entityId);

  return new Map(
    rows.flatMap((row) => {
      const aggregate = aggregateRow(row);
      return aggregate ? [[row.entityId, aggregate] as const] : [];
    }),
  );
}