import { Router, type IRouter, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  destinations as destinationRecords,
  events as eventRecords,
  featuredContent,
  hotels as hotelRecords,
  offers as offerRecords,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth.ts";
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

const catalogRouter: IRouter = Router();
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

catalogRouter.get("/v1/home", async (_req, res) => {
  const featured = await getFeaturedContent().catch(() => null);
  if (!featured) {
    res.status(503).json({
      error: {
        code: "FEATURED_CONTENT_UNAVAILABLE",
        message: "Featured content is temporarily unavailable.",
      },
    });
    return;
  }
  res.json({
    notice: homeNotice,
    banners: [],
    destinations,
    nearby,
    events,
    hotels,
    properties,
    featuredDestinations: [],
    featuredProperties: [],
    featured: featured.items,
  });
});

catalogRouter.use(createFeaturedContentRouter());

catalogRouter.get("/v1/home/banners", (_req, res) => {
  res.json({ items: [] });
});

catalogRouter.get("/v1/home/destinations", (_req, res) => {
  res.json({ items: destinations });
});

catalogRouter.get("/v1/home/nearby", (_req, res) => {
  res.json({ items: nearby });
});

catalogRouter.get("/v1/home/events", (_req, res) => {
  res.json({ items: events });
});

catalogRouter.get("/v1/home/hotels", (_req, res) => {
  res.json({ items: hotels });
});

catalogRouter.get("/v1/home/properties", (_req, res) => {
  res.json({ items: properties });
});

catalogRouter.get("/v1/destinations", (_req, res) => {
  res.json({ items: destinations });
});

catalogRouter.get("/v1/destinations/:id", (req, res) => {
  const detail = getDestinationDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Destination not found" } });
    return;
  }
  res.json(detail);
});

catalogRouter.get("/v1/properties", (_req, res) => {
  res.json({ items: properties });
});

catalogRouter.get("/v1/properties/:id", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found" } });
    return;
  }
  res.json(property);
});

catalogRouter.post("/v1/properties/:id/enquiries", requireAuth, (req, res) => {
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

export default catalogRouter;