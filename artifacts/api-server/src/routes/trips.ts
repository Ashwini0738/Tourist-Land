import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, tripItems, trips } from "@workspace/db";
import { CreateTripBody, AddTripItemBody, ReorderTripItemsBody, UpdateTripBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getFavoriteCatalogItem, type FavoriteEntityType } from "./favorite-catalog.ts";

const router: IRouter = Router();
router.use(requireAuth);

const id = { safeParse(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? { success: true as const, data: value } : { success: false as const };
} };
const tripBody = CreateTripBody;
const itemBody = AddTripItemBody;

function invalid(res: any, message: string) {
  res.status(400).json({ error: { code: "INVALID_INPUT", message } });
}
function dbDates<T extends { startsOn?: Date | string | null; endsOn?: Date | string | null }>(value: T) {
  const asDate = (v: Date | string | null | undefined) => v instanceof Date ? v.toISOString().slice(0, 10) : v;
  return { ...value, startsOn: asDate(value.startsOn), endsOn: asDate(value.endsOn) };
}
function serializeItem(item: typeof tripItems.$inferSelect) {
  const catalog = getFavoriteCatalogItem(item.entityType as FavoriteEntityType, item.entityId);
  return {
    id: item.id, entityType: item.entityType, entityId: item.entityId,
    sortOrder: item.sortOrder, note: item.note,
    name: catalog?.name ?? null, location: catalog?.location ?? null,
    imageKey: catalog?.imageKey ?? null, route: catalog?.route ?? null,
    available: Boolean(catalog),
  };
}
async function ownedTrip(userId: string, tripId: string) {
  const [trip] = await db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
  return trip;
}
async function response(trip: typeof trips.$inferSelect) {
  const items = await db.select().from(tripItems).where(eq(tripItems.tripId, trip.id)).orderBy(asc(tripItems.sortOrder), asc(tripItems.createdAt));
  return { ...trip, items: items.map(serializeItem) };
}

router.get("/v1/trips", async (req, res): Promise<void> => {
  const rows = await db.select().from(trips).where(eq(trips.userId, req.localUser!.id)).orderBy(asc(trips.createdAt));
  res.json({ items: await Promise.all(rows.map(response)) });
});

router.post("/v1/trips", async (req, res): Promise<void> => {
  const parsed = tripBody.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.message);
  const [trip] = await db.insert(trips).values({ ...dbDates(parsed.data), userId: req.localUser!.id }).returning();
  res.status(201).json(await response(trip));
});

router.put("/v1/trips/:id", async (req, res): Promise<void> => {
  const params = id.safeParse(req.params.id);
  const parsed = UpdateTripBody.safeParse(req.body);
  if (!params.success || !parsed.success) return invalid(res, "Invalid trip id or update body");
  const trip = await ownedTrip(req.localUser!.id, params.data);
  if (!trip) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } }); return; }
  if (trip.status === "archived") { res.status(409).json({ error: { code: "CONFLICT", message: "Archived trips cannot be changed" } }); return; }
  const [updated] = await db.update(trips).set({ ...dbDates(parsed.data), updatedAt: new Date() }).where(eq(trips.id, trip.id)).returning();
  res.json(await response(updated));
});

router.delete("/v1/trips/:id", async (req, res): Promise<void> => {
  const parsed = id.safeParse(req.params.id);
  if (!parsed.success) return invalid(res, "Invalid trip id");
  const deleted = await db.delete(trips).where(and(eq(trips.id, parsed.data), eq(trips.userId, req.localUser!.id))).returning({ id: trips.id });
  if (!deleted.length) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } }); return; }
  res.sendStatus(204);
});

router.post("/v1/trips/:id/archive", async (req, res): Promise<void> => {
  const parsed = id.safeParse(req.params.id);
  if (!parsed.success) return invalid(res, "Invalid trip id");
  const [trip] = await db.update(trips).set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(trips.id, parsed.data), eq(trips.userId, req.localUser!.id))).returning();
  if (!trip) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } }); return; }
  res.json(await response(trip));
});

router.post("/v1/trips/:id/items", async (req, res): Promise<void> => {
  const tripId = id.safeParse(req.params.id);
  const parsed = itemBody.safeParse(req.body);
  if (!tripId.success || !parsed.success) return invalid(res, "Invalid trip item");
  const trip = await ownedTrip(req.localUser!.id, tripId.data);
  if (!trip) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } }); return; }
  if (trip.status === "archived") { res.status(409).json({ error: { code: "CONFLICT", message: "Archived trips cannot be changed" } }); return; }
  if (!getFavoriteCatalogItem(parsed.data.entityType, parsed.data.entityId)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "That catalog item is not available." } }); return;
  }
  const outcome = await db.transaction(async (tx) => {
    const [trip] = await tx
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId.data), eq(trips.userId, req.localUser!.id)))
      .for("update");
    if (!trip) return { type: "not-found" as const };
    if (trip.status === "archived") return { type: "archived" as const };

    const existing = await tx
      .select({ id: tripItems.id })
      .from(tripItems)
      .where(eq(tripItems.tripId, trip.id));
    const [item] = await tx
      .insert(tripItems)
      .values({ ...parsed.data, tripId: trip.id, sortOrder: existing.length })
      .onConflictDoNothing({
        target: [tripItems.tripId, tripItems.entityType, tripItems.entityId],
      })
      .returning();
    return item
      ? { type: "created" as const, item }
      : { type: "duplicate" as const };
  });
  if (outcome.type === "not-found") {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } });
    return;
  }
  if (outcome.type === "archived") {
    res.status(409).json({ error: { code: "CONFLICT", message: "Archived trips cannot be changed" } });
    return;
  }
  if (outcome.type === "duplicate") {
    res.status(409).json({ error: { code: "CONFLICT", message: "That item is already in this trip." } });
    return;
  }
  res.status(201).json(serializeItem(outcome.item));
});

router.delete("/v1/trips/:tripId/items/:itemId", async (req, res): Promise<void> => {
  const tripId = id.safeParse(req.params.tripId); const itemId = id.safeParse(req.params.itemId);
  if (!tripId.success || !itemId.success) return invalid(res, "Invalid trip or item id");
  const trip = await ownedTrip(req.localUser!.id, tripId.data);
  if (!trip) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } }); return; }
  if (trip.status === "archived") { res.status(409).json({ error: { code: "CONFLICT", message: "Archived trips cannot be changed" } }); return; }
  const removed = await db.delete(tripItems).where(and(eq(tripItems.id, itemId.data), eq(tripItems.tripId, trip.id))).returning({ id: tripItems.id });
  if (!removed.length) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Item not found" } }); return; }
  res.sendStatus(204);
});

router.put("/v1/trips/:id/items/reorder", async (req, res): Promise<void> => {
  const tripId = id.safeParse(req.params.id);
  const parsed = ReorderTripItemsBody.safeParse(req.body);
  if (!tripId.success || !parsed.success) return invalid(res, "itemIds must be an array of UUIDs");
  const trip = await ownedTrip(req.localUser!.id, tripId.data);
  if (!trip) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip not found" } }); return; }
  if (trip.status === "archived") { res.status(409).json({ error: { code: "CONFLICT", message: "Archived trips cannot be changed" } }); return; }
  const items = await db.select().from(tripItems).where(eq(tripItems.tripId, trip.id));
  if (items.length !== parsed.data.itemIds.length || new Set(parsed.data.itemIds).size !== items.length ||
      items.some((item) => !parsed.data.itemIds.includes(item.id))) {
    return invalid(res, "itemIds must contain every trip item exactly once");
  }
  await db.transaction(async (tx) => {
    for (const [sortOrder, itemId] of parsed.data.itemIds.entries()) {
      await tx.update(tripItems).set({ sortOrder, updatedAt: new Date() }).where(and(eq(tripItems.id, itemId), eq(tripItems.tripId, trip.id)));
    }
  });
  res.json(await response(trip));
});

export default router;