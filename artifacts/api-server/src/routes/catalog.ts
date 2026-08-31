import { Router, type IRouter, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  destinations as destinationRecords,
  events as eventRecords,
  featuredContent,
  hotels as hotelRecords,
  offers as offerRecords,
  properties as propertyRecords,
  propertyEnquiries,
  propertyEnquiryHistory,
} from "@workspace/db";
import { eq as dbEq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.ts";
import { demoModeEnabled } from "../lib/demo-mode.ts";
import { createNotification } from "../lib/notifications.ts";
import { demoAttractions, demoDestinations, demoEvents, demoFoodPlaces, demoHotels, demoProperties } from "@workspace/db/seed-data";
import { getDestinationDetail } from "./catalog-detail.ts";
import {
  attractions,
  banners,
  destinations,
  events,
  foods,
  homeNotice,
  hotels,
  nearby,
  properties,
  temples,
} from "./catalog-data.ts";

export {
  attractions,
  banners,
  destinations,
  events,
  foods,
  homeNotice,
  hotels,
  nearby,
  properties,
  temples,
} from "./catalog-data.ts";

export { getDestinationDetail } from "./catalog-detail.ts";

export type FeaturedContentType = "destination" | "hotel" | "event" | "offer";

export type FeaturedContentItem = {
  id: string;
  entityType: FeaturedContentType;
  entityId: string;
  sortOrder: number;
  title: string;
  subtitle: string;
  location: string;
  summary: string;
  imageKey: string | null;
  destinationId: string | null;
  dateLabel: string | null;
  ratingLabel: string | null;
  priceLabel: string | null;
};

export type FeaturedContentList = {
  notice: string;
  items: FeaturedContentItem[];
};

function demoPropertyPayload(property: typeof propertyRecords.$inferSelect) {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    location: property.address,
    area: `${property.areaValue} ${property.areaUnit}`,
    propertyType: property.propertyType,
    ...(property.latitude !== null && property.longitude !== null
      ? { coordinates: { latitude: Number(property.latitude), longitude: Number(property.longitude), precision: "area" as const, source: "demo-seed" } }
      : {}),
    verified: property.isVerified,
    description: property.description ?? "A published demo property listing.",
    discoveryLabel: "Demo property record",
    priceLabel: property.askingPrice ? `Demo asking price · ₹${Number(property.askingPrice).toLocaleString("en-IN")}` : "Price available on enquiry",
    imageKey: "highlands",
  };
}

function parseDemoEnquiryBody(value: unknown): { message: string; preferredContactMethod: "email" | "phone" } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.message !== "string" || body.message.length > 2000) return null;
  if (body.preferredContactMethod !== "email" && body.preferredContactMethod !== "phone") return null;
  return { message: body.message, preferredContactMethod: body.preferredContactMethod };
}

const demoHomeData = {
  destinations: demoDestinations.map((item) => ({
    id: item.slug,
    slug: item.slug,
    name: item.name,
    region: item.region,
    country: item.country,
    summary: item.summary,
    imageKey: "coastline",
  })),
  nearby: demoAttractions.map((item, index) => ({
    id: item.id,
    name: item.name,
    category: "Attraction",
    location: item.address,
    summary: item.description ?? "A demo attraction.",
    destinationId: demoDestinations[index].slug,
    imageKey: index % 2 ? "highlands" : "coastline",
  })),
  events: demoEvents.map((item, index) => ({
    id: item.id,
    title: item.name,
    dateLabel: new Date(item.startsAt).toISOString(),
    location: demoDestinations[index].name,
    summary: item.description ?? "A future demo event.",
    destinationId: demoDestinations[index].slug,
    imageKey: index % 2 ? "highlands" : "coastline",
  })),
  hotels: demoHotels.map((item, index) => ({
    id: item.catalogId!,
    name: item.name,
    location: `${item.city}, ${item.state}`,
    summary: item.description ?? "An approved demo accommodation.",
    destinationId: demoDestinations[index].slug,
    ratingLabel: "Demo guest note · 4.8",
    priceLabel: `Demo nightly rate · ₹${Number(index % 2 ? 9800 : 6500).toLocaleString("en-IN")}`,
    imageKey: index % 2 ? "highlands" : "coastline",
  })),
  properties: demoProperties.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    location: item.address,
    area: `${item.areaValue} ${item.areaUnit}`,
    propertyType: item.propertyType,
    verified: item.isVerified,
    description: item.description ?? "A published demo property listing.",
    discoveryLabel: "Demo property record",
    priceLabel: `Demo asking price · ₹${Number(item.askingPrice).toLocaleString("en-IN")}`,
    imageKey: "highlands",
  })),
};

function homeCatalog() {
  return demoModeEnabled() ? demoHomeData : { destinations, nearby, events, hotels, properties };
}

type FeaturedContentResolver = () => Promise<FeaturedContentList>;

function locationFor(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(", ");
}

function dateLabelFor(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Resolve the persisted editorial selection against the currently eligible
 * source records. Missing, inactive, or no-longer-eligible records are
 * intentionally omitted instead of being represented by sample content.
 */
export async function getFeaturedContent(): Promise<FeaturedContentList> {
  const [selections, destinationRows, hotelRows, eventRows, offerRows] = await Promise.all([
    db.select().from(featuredContent)
      .where(eq(featuredContent.status, "active"))
      .orderBy(asc(featuredContent.sortOrder), asc(featuredContent.createdAt)),
    db.select().from(destinationRecords).where(eq(destinationRecords.status, "published")),
    db.select().from(hotelRecords),
    db.select().from(eventRecords).where(eq(eventRecords.status, "scheduled")),
    db.select().from(offerRecords).where(eq(offerRecords.status, "published")),
  ]);

  const eligibleHotels = hotelRows.filter(
    (hotel) => hotel.status === "published" && hotel.approvalStatus === "approved",
  );
  const destinationsById = new Map(destinationRows.map((destination) => [destination.id, destination]));
  const hotelsById = new Map(eligibleHotels.map((hotel) => [hotel.id, hotel]));
  const eventsById = new Map(eventRows.map((event) => [event.id, event]));
  const offersById = new Map(offerRows.map((offer) => [offer.id, offer]));

  return {
    notice: homeNotice,
    items: selections.flatMap((selection): FeaturedContentItem[] => {
      const entityType = selection.entityType as FeaturedContentType;
      if (entityType === "destination") {
        const destination = destinationsById.get(selection.entityId);
        if (!destination) return [];
        return [{
          id: selection.id,
          entityType,
          entityId: destination.id,
          sortOrder: selection.sortOrder,
          title: destination.name,
          subtitle: destination.region ?? destination.country,
          location: locationFor([destination.region, destination.country]),
          summary: destination.summary ?? "Explore this published destination.",
          imageKey: null,
          destinationId: destination.id,
          dateLabel: null,
          ratingLabel: null,
          priceLabel: null,
        }];
      }

      if (entityType === "hotel") {
        const hotel = hotelsById.get(selection.entityId);
        if (!hotel) return [];
        return [{
          id: selection.id,
          entityType,
          entityId: hotel.id,
          sortOrder: selection.sortOrder,
          title: hotel.name,
          subtitle: hotel.propertyType ?? "Hotel",
          location: locationFor([hotel.city, hotel.state, hotel.country]) || hotel.address,
          summary: hotel.description ?? "Explore this published stay.",
          imageKey: null,
          destinationId: hotel.destinationId,
          dateLabel: null,
          ratingLabel: null,
          priceLabel: null,
        }];
      }

      if (entityType === "event") {
        const event = eventsById.get(selection.entityId);
        if (!event) return [];
        const destination = event.destinationId ? destinationsById.get(event.destinationId) : undefined;
        return [{
          id: selection.id,
          entityType,
          entityId: event.id,
          sortOrder: selection.sortOrder,
          title: event.name,
          subtitle: `Event · ${dateLabelFor(event.startsAt)}`,
          location: locationFor([destination?.region, destination?.country]) || "Location to be announced",
          summary: event.description ?? "Explore this scheduled event.",
          imageKey: null,
          destinationId: event.destinationId,
          dateLabel: dateLabelFor(event.startsAt),
          ratingLabel: null,
          priceLabel: null,
        }];
      }

      const offer = offersById.get(selection.entityId);
      if (!offer) return [];
      const destination = offer.destinationId ? destinationsById.get(offer.destinationId) : undefined;
      const hotel = offer.hotelId ? hotelsById.get(offer.hotelId) : undefined;
      return [{
        id: selection.id,
        entityType,
        entityId: offer.id,
        sortOrder: selection.sortOrder,
        title: offer.title,
        subtitle: "Offer",
        location: locationFor([
          hotel?.city,
          hotel?.state,
          hotel?.country,
          destination?.region,
          destination?.country,
        ]) || "Details available",
        summary: offer.description ?? "Explore this published offer.",
        imageKey: null,
        destinationId: offer.destinationId ?? hotel?.destinationId ?? null,
        dateLabel: offer.endsAt ? `Until ${dateLabelFor(offer.endsAt)}` : null,
        ratingLabel: null,
        priceLabel: offer.discountValue
          ? `${offer.discountType === "percentage" ? `${offer.discountValue}% off` : `Save ${offer.discountValue}`}`
          : null,
      }];
    }),
  };
}

async function featuredContentOrUnavailable(
  res: Response,
  resolveFeaturedContent: FeaturedContentResolver,
): Promise<FeaturedContentList | null> {
  try {
    return await resolveFeaturedContent();
  } catch {
    res.status(503).json({
      error: {
        code: "FEATURED_CONTENT_UNAVAILABLE",
        message: "Featured content is temporarily unavailable.",
      },
    });
    return null;
  }
}

export function createFeaturedContentRouter(
  resolveFeaturedContent: FeaturedContentResolver = getFeaturedContent,
): IRouter {
  const router: IRouter = Router();
  router.get("/v1/home/featured", async (_req, res) => {
    const featured = await featuredContentOrUnavailable(res, resolveFeaturedContent);
    if (featured) res.json(featured);
  });
  return router;
}

export function createCatalogRouter(
  resolveFeaturedContent: FeaturedContentResolver = getFeaturedContent,
): IRouter {
  const router: IRouter = Router();

  router.get("/v1/home", async (_req, res) => {
    const featured = await featuredContentOrUnavailable(res, resolveFeaturedContent);
    if (!featured) return;
    const catalog = homeCatalog();
    res.json({
      notice: featured.notice,
      banners: [],
      ...catalog,
      featuredDestinations: [],
      featuredProperties: [],
      featured: featured.items,
    });
  });

  router.use(createFeaturedContentRouter(resolveFeaturedContent));

  router.get("/v1/home/banners", (_req, res) => {
    res.json({ items: [] });
  });

  router.get("/v1/home/destinations", (_req, res) => {
    res.json({ items: homeCatalog().destinations });
  });

  router.get("/v1/home/nearby", (_req, res) => {
    res.json({ items: homeCatalog().nearby });
  });

  router.get("/v1/home/events", (_req, res) => {
    res.json({ items: homeCatalog().events });
  });

  router.get("/v1/home/hotels", (_req, res) => {
    res.json({ items: homeCatalog().hotels });
  });

  router.get("/v1/home/properties", (_req, res) => {
    res.json({ items: homeCatalog().properties });
  });

  router.get("/v1/destinations", (_req, res) => {
    res.json({ items: homeCatalog().destinations });
  });

  router.get("/v1/destinations/:id", (req, res) => {
    const detail = getDestinationDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Destination not found" } });
      return;
    }
    res.json(detail);
  });

  router.get("/v1/properties", async (_req, res): Promise<void> => {
    if (demoModeEnabled()) {
      const rows = await db.select().from(propertyRecords).where(dbEq(propertyRecords.status, "published"));
      res.json({ items: rows.map(demoPropertyPayload) });
      return;
    }
    res.json({ items: properties });
  });

  router.get("/v1/properties/:id", async (req, res): Promise<void> => {
    if (demoModeEnabled()) {
      const propertyId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const [record] = await db.select().from(propertyRecords).where(
        propertyId.startsWith("demo-")
          ? dbEq(propertyRecords.slug, propertyId)
          : dbEq(propertyRecords.id, propertyId),
      );
      if (record) {
        res.json(demoPropertyPayload(record));
        return;
      }
    }
    const property = properties.find((item) => item.id === req.params.id);
    if (!property) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found" } });
      return;
    }
    res.json(property);
  });

  router.post("/v1/properties/:id/enquiries", requireAuth, async (req, res): Promise<void> => {
    if (demoModeEnabled()) {
      const propertyId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = parseDemoEnquiryBody(req.body);
      if (!body) {
        res.status(400).json({ error: { code: "INVALID_INPUT", message: "A message and preferred contact method are required." } });
        return;
      }
      const [property] = await db.select().from(propertyRecords).where(
        propertyId.startsWith("demo-")
          ? dbEq(propertyRecords.slug, propertyId)
          : dbEq(propertyRecords.id, propertyId),
      );
      if (!property) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found" } });
        return;
      }
      const [enquiry] = await db.insert(propertyEnquiries).values({
        propertyId: property.id,
        userId: req.localUser!.id,
        message: body.message,
        preferredContactMethod: body.preferredContactMethod,
        status: "new",
      }).returning();
      if (!enquiry) {
        res.status(500).json({ error: { code: "ENQUIRY_CREATE_FAILED", message: "The enquiry could not be recorded." } });
        return;
      }
      await db.insert(propertyEnquiryHistory).values({
        enquiryId: enquiry.id,
        status: "new",
        note: "Demo enquiry received.",
        changedBy: req.localUser!.id,
      });
      if (property.ownerId) {
        await createNotification(property.ownerId, {
          type: "land_enquiry_updated",
          title: "New property enquiry",
          body: "A traveller sent an enquiry for a demo property.",
          relatedType: "property",
          relatedId: property.id,
          dedupeKey: `demo-enquiry-${enquiry.id}`,
        });
      }
      res.status(202).json({
        id: enquiry.id,
        status: enquiry.status,
        message: "Your demo enquiry was recorded for local testing. No property transaction has been created.",
      });
      return;
    }
    const property = properties.find((item) => item.id === req.params.id);
    if (!property) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found" } });
      return;
    }
    req.log.info({ propertyId: property.id }, "Development property enquiry accepted");
    res.status(202).json({
      id: `dev-enquiry-${Date.now()}`,
      status: "received",
      message: "A sourcing specialist will follow up after the service is configured.",
    });
  });

  return router;
}

export default createCatalogRouter();