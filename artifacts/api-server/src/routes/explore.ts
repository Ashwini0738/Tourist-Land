import { Router, type IRouter } from "express";
import {
  attractions,
  destinations,
  events,
  foods,
  hotels,
  nearby,
  properties,
  temples,
} from "./catalog-data.ts";
import { fetchLiveProviders, type FetchLike, type LiveEventRecord, type LiveHotelRecord, type ProviderResult } from "./live-data.ts";

export type ExploreCategoryKey =
  | "all"
  | "destination"
  | "place"
  | "temple"
  | "attraction"
  | "event"
  | "food"
  | "hotel"
  | "property";

type ExploreItem = {
  id: string;
  type: Exclude<ExploreCategoryKey, "all">;
  title: string;
  location: string;
  summary: string;
  category: string;
  imageKey: string;
  destinationId?: string;
  dateLabel?: string;
  ratingLabel?: string;
  priceLabel?: string;
  area?: string;
  propertyType?: string;
  amenities?: string[];
  popularity: number;
  distanceKm: number;
  rating: number;
  priceValue?: number;
  areaValue?: number;
  source: "development" | "live" | "unavailable";
  sourceLabel: string;
  sourceNotice: string;
  checkedAt?: string;
  availability?: {
    status: "available" | "unavailable";
    priceAmount?: number;
    currency?: string;
    priceLabel?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
  };
  schedule?: {
    status: "scheduled" | "cancelled" | "unavailable";
    startsAt?: string;
    endsAt?: string;
    dateLabel?: string;
    venue?: string;
    cancellationReason?: string;
  };
};
type BaseExploreItem = Omit<ExploreItem, "source" | "sourceLabel" | "sourceNotice">;

const developmentNotice = "Development discovery content only. It is not live availability, booking, pricing, or location data.";
const MAX_LIMIT = 50;
const defaultLimit = 12;
const validSorts = ["relevance", "popularity", "distance", "rating", "price_asc", "price_desc"] as const;
type ExploreSort = (typeof validSorts)[number];

const categoryLabels: Array<{ id: ExploreCategoryKey; label: string; icon: string; description: string }> = [
  { id: "destination", label: "Destinations", icon: "map-pin", description: "Regions worth taking the scenic way" },
  { id: "place", label: "Places", icon: "compass", description: "Slow walks and local stops" },
  { id: "temple", label: "Temples", icon: "sun", description: "Heritage and quiet reflection" },
  { id: "attraction", label: "Attractions", icon: "layers", description: "Landmarks and things to see" },
  { id: "event", label: "Events", icon: "calendar", description: "Development programme previews" },
  { id: "food", label: "Food", icon: "coffee", description: "Local flavours and tables" },
  { id: "hotel", label: "Hotels", icon: "home", description: "Seed stays for discovery" },
  { id: "property", label: "Land", icon: "map", description: "Development property previews" },
];

const categoryAliases: Record<string, ExploreCategoryKey> = {
  all: "all",
  destination: "destination",
  destinations: "destination",
  place: "place",
  places: "place",
  temple: "temple",
  temples: "temple",
  attraction: "attraction",
  attractions: "attraction",
  event: "event",
  events: "event",
  food: "food",
  foods: "food",
  hotel: "hotel",
  hotels: "hotel",
  property: "property",
  properties: "property",
  land: "property",
};

const itemIndex: ExploreItem[] = [
  ...destinations.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "destination",
    title: item.name,
    location: item.region,
    summary: item.summary,
    category: "Destination",
    imageKey: item.imageKey,
    popularity: 100 - index,
    distanceKm: index + 1,
    rating: 4.8 - index * 0.1,
  })),
  ...nearby.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "place",
    title: item.name,
    location: item.location,
    summary: item.summary,
    category: item.category,
    imageKey: item.imageKey,
    destinationId: item.destinationId,
    popularity: 78 - index,
    distanceKm: index + 2,
    rating: 4.6 + index * 0.2,
    ratingLabel: `Sample visitor note · ${(4.6 + index * 0.2).toFixed(1)}`,
  })),
  ...temples.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "temple",
    title: item.name,
    location: item.location,
    summary: item.summary,
    category: item.category,
    imageKey: item.imageKey,
    destinationId: item.destinationId,
    popularity: 74 - index,
    distanceKm: Number(item.distanceLabel?.match(/\d+/)?.[0] ?? index + 3),
    rating: Number(item.ratingLabel?.match(/4\.\d/)?.[0] ?? 4.6),
    ratingLabel: item.ratingLabel,
  })),
  ...attractions.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "attraction",
    title: item.name,
    location: item.location,
    summary: item.summary,
    category: item.category,
    imageKey: item.imageKey,
    destinationId: item.destinationId,
    popularity: 82 - index,
    distanceKm: Number(item.distanceLabel?.match(/\d+/)?.[0] ?? index + 2),
    rating: Number(item.ratingLabel?.match(/4\.\d/)?.[0] ?? 4.6),
    ratingLabel: item.ratingLabel,
  })),
  ...events.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "event",
    title: item.title,
    location: item.location,
    summary: item.summary,
    category: index === 0 ? "Cultural" : "Heritage",
    imageKey: item.imageKey,
    destinationId: item.destinationId,
    dateLabel: item.dateLabel,
    popularity: 70 - index,
    distanceKm: index + 4,
    rating: 4.5,
  })),
  ...foods.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "food",
    title: item.name,
    location: item.location,
    summary: item.summary,
    category: item.category,
    imageKey: item.imageKey,
    destinationId: item.destinationId,
    popularity: 76 - index,
    distanceKm: index + 3,
    rating: Number(item.ratingLabel?.match(/4\.\d/)?.[0] ?? 4.6),
    ratingLabel: item.ratingLabel,
  })),
  ...hotels.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "hotel",
    title: item.name,
    location: item.location,
    summary: item.summary,
    category: "Hotel",
    imageKey: item.imageKey,
    destinationId: item.destinationId,
    popularity: 88 - index,
    distanceKm: index + 2,
    rating: Number(item.ratingLabel.match(/4\.\d/)?.[0] ?? 4.5),
    ratingLabel: item.ratingLabel,
    priceLabel: item.priceLabel,
    priceValue: index === 0 ? 7800 : 6400,
    amenities: ["Nature access", "Breakfast", "Quiet rooms"],
  })),
  ...properties.map((item, index): BaseExploreItem => ({
    id: item.id,
    type: "property",
    title: item.title,
    location: item.location,
    summary: item.description,
    category: item.propertyType,
    imageKey: item.imageKey,
    propertyType: item.propertyType,
    priceLabel: item.priceLabel,
    area: item.area,
    popularity: 66 - index,
    distanceKm: index + 5,
    rating: item.verified ? 4.7 : 4.3,
    priceValue: index === 0 ? 18500000 : 9200000,
    areaValue: index === 0 ? 2.4 : 1.1,
  })),
].map((item) => ({
  ...item,
  source: "development" as const,
  sourceLabel: "Development preview",
  sourceNotice: developmentNotice,
}));

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

function asNumber(value: unknown, fallback: number): number {
  const text = asText(value);
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveCategory(value: unknown): ExploreCategoryKey {
  return categoryAliases[asText(value).toLowerCase()] ?? "all";
}

function parseSort(value: unknown): ExploreSort {
  const normalized = asText(value).toLowerCase();
  if (normalized === "recommended" || normalized === "nearby") return normalized === "nearby" ? "distance" : "relevance";
  if (normalized === "price-low-high") return "price_asc";
  if (normalized === "price-high-low") return "price_desc";
  return validSorts.includes(normalized as ExploreSort) ? (normalized as ExploreSort) : "relevance";
}

function scoreRelevance(item: ExploreItem, query: string): number {
  if (!query) return item.popularity;
  const title = item.title.toLowerCase();
  const searchable = `${title} ${item.location.toLowerCase()} ${item.summary.toLowerCase()} ${item.category.toLowerCase()}`;
  if (title === query) return 1000;
  if (title.startsWith(query)) return 900;
  if (title.includes(query)) return 800;
  return searchable.includes(query) ? 500 : 0;
}

function sortItems(items: ExploreItem[], sort: ExploreSort, query: string): ExploreItem[] {
  return [...items].sort((a, b) => {
    if (sort === "distance") return a.distanceKm - b.distanceKm;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "price_asc") return (a.priceValue ?? Number.MAX_SAFE_INTEGER) - (b.priceValue ?? Number.MAX_SAFE_INTEGER);
    if (sort === "price_desc") return (b.priceValue ?? 0) - (a.priceValue ?? 0);
    if (sort === "popularity") return b.popularity - a.popularity;
    return scoreRelevance(b, query) - scoreRelevance(a, query);
  });
}

function getResponseNotice(items: ExploreItem[]) {
  const sources = new Set(items.map((item) => item.source));
  if (sources.size === 0 || (sources.size === 1 && sources.has("development"))) return developmentNotice;
  if (sources.has("unavailable")) {
    return "Live hotel availability and event schedules are shown where providers respond. Unavailable results are marked; other results are development previews.";
  }
  return "Live hotel availability and event schedules are shown where providers respond. Other results are development previews.";
}

function formatCurrency(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

function formatEventDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function unavailableHotel(item: ExploreItem, checkedAt: string, reason: string): ExploreItem {
  return {
    ...item,
    source: "unavailable",
    sourceLabel: "Live availability unavailable",
    sourceNotice: reason,
    checkedAt,
    priceLabel: undefined,
    priceValue: undefined,
    availability: { status: "unavailable" },
  };
}

function unavailableEvent(item: ExploreItem, checkedAt: string, reason: string): ExploreItem {
  return {
    ...item,
    source: "unavailable",
    sourceLabel: "Live schedule unavailable",
    sourceNotice: reason,
    checkedAt,
    dateLabel: undefined,
    schedule: { status: "unavailable" },
  };
}

function applyLiveProviders(
  items: ExploreItem[],
  providers: {
    hotels: ProviderResult<LiveHotelRecord>;
    events: ProviderResult<LiveEventRecord>;
  },
  checkedAt: string,
) {
  return items.map((item) => {
    if (item.type === "hotel" && providers.hotels.configured) {
      const record = providers.hotels.records.get(item.id);
      if (!record) {
        return unavailableHotel(
          item,
          checkedAt,
          providers.hotels.error
            ? "Live availability could not be reached. Current rooms and pricing are unavailable."
            : "The live provider did not report rooms for this stay.",
        );
      }
      const priceLabel = record.priceAmount !== undefined
        ? `${formatCurrency(record.priceAmount, record.currency)} / night`
        : undefined;
      return {
        ...item,
        source: "live" as const,
        sourceLabel: "Live availability",
        sourceNotice: "Availability and pricing supplied by the live inventory provider.",
        checkedAt,
        priceLabel,
        priceValue: record.priceAmount,
        availability: {
          status: record.status,
          ...(record.priceAmount !== undefined ? { priceAmount: record.priceAmount } : {}),
          ...(record.currency ? { currency: record.currency } : {}),
          ...(priceLabel ? { priceLabel } : {}),
          ...(record.roomType ? { roomType: record.roomType } : {}),
          ...(record.checkIn ? { checkIn: record.checkIn } : {}),
          ...(record.checkOut ? { checkOut: record.checkOut } : {}),
        },
      };
    }

    if (item.type === "event" && providers.events.configured) {
      const record = providers.events.records.get(item.id);
      if (!record) {
        return unavailableEvent(
          item,
          checkedAt,
          providers.events.error
            ? "Live schedules could not be reached. The current event status is unavailable."
            : "The live provider did not report a current schedule for this event.",
        );
      }
      const dateLabel = record.status === "cancelled"
        ? `Cancelled${record.cancellationReason ? ` · ${record.cancellationReason}` : ""}`
        : record.status === "scheduled"
          ? formatEventDate(record.startsAt)
          : undefined;
      return {
        ...item,
        source: "live" as const,
        sourceLabel: record.status === "cancelled" ? "Live schedule · cancelled" : "Live schedule",
        sourceNotice: record.status === "cancelled"
          ? "The live event provider has marked this event as cancelled."
          : "Schedule supplied by the live event provider.",
        checkedAt,
        dateLabel,
        schedule: {
          status: record.status,
          ...(record.startsAt ? { startsAt: record.startsAt } : {}),
          ...(record.endsAt ? { endsAt: record.endsAt } : {}),
          ...(dateLabel ? { dateLabel } : {}),
          ...(record.venue ? { venue: record.venue } : {}),
          ...(record.cancellationReason ? { cancellationReason: record.cancellationReason } : {}),
        },
      };
    }

    return item;
  });
}

function searchExploreItemsFromIndex(rawQuery: Record<string, unknown>, sourceIndex: ExploreItem[]) {
  const query = asText(rawQuery.q).toLowerCase();
  const category = resolveCategory(rawQuery.category);
  const id = asText(rawQuery.id);
  const location = asText(rawQuery.location).toLowerCase();
  const propertyType = asText(rawQuery.propertyType).toLowerCase();
  const eventType = asText(rawQuery.eventType).toLowerCase();
  const amenity = asText(rawQuery.amenity).toLowerCase();
  const minRating = asNumber(rawQuery.minRating, 0);
  const minPrice = asNumber(rawQuery.minPrice, 0);
  const maxPrice = asNumber(rawQuery.maxPrice, Number.MAX_SAFE_INTEGER);
  const minArea = asNumber(rawQuery.minArea, 0);
  const maxArea = asNumber(rawQuery.maxArea, Number.MAX_SAFE_INTEGER);
  const requestedLimit = asNumber(rawQuery.limit, defaultLimit);
  const requestedPage = asNumber(rawQuery.page, 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(requestedLimit)));
  const page = Math.max(1, Math.floor(requestedPage));
  const sort = parseSort(rawQuery.sort);

  const filtered = sortItems(
    sourceIndex.filter((item) => {
      if (category !== "all" && item.type !== category) return false;
      if (id && item.id !== id) return false;
      if (location && !item.location.toLowerCase().includes(location)) return false;
      if (query && scoreRelevance(item, query) === 0) return false;
      if (item.rating < minRating) return false;
      if (propertyType && item.propertyType?.toLowerCase() !== propertyType) return false;
      if (eventType && item.category.toLowerCase() !== eventType) return false;
      if (amenity && !item.amenities?.some((value) => value.toLowerCase() === amenity)) return false;
      if (item.priceValue !== undefined && (item.priceValue < minPrice || item.priceValue > maxPrice)) return false;
      if (item.type === "property" && item.areaValue !== undefined && (item.areaValue < minArea || item.areaValue > maxArea)) return false;
      return true;
    }),
    sort,
    query,
  );

  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit).map(({ popularity, distanceKm, rating, priceValue, areaValue, ...item }) => item);
  const suggestionSource = query ? filtered.slice(0, 5) : [];
  const suggestions = suggestionSource.map((item) => ({
    id: `${item.type}:${item.id}`,
    type: item.type,
    title: item.title,
    subtitle: `${item.category} · ${item.location}`,
    imageKey: item.imageKey,
  }));

  return {
    notice: getResponseNotice(filtered),
    page,
    limit,
    total: filtered.length,
    hasMore: offset + items.length < filtered.length,
    items,
    suggestions,
  };
}

export function searchExploreItems(rawQuery: Record<string, unknown>) {
  return searchExploreItemsFromIndex(rawQuery, itemIndex);
}

export async function searchExploreItemsLive(
  rawQuery: Record<string, unknown>,
  options: { fetcher?: FetchLike; env?: NodeJS.ProcessEnv } = {},
) {
  const checkedAt = new Date().toISOString();
  const providers = await fetchLiveProviders(itemIndex.map((item) => item.id), options.fetcher, options.env);
  const enrichedItems = applyLiveProviders(itemIndex, providers, checkedAt);
  return searchExploreItemsFromIndex(rawQuery, enrichedItems);
}

export function getExploreFilters(categoryValue: unknown) {
  const category = resolveCategory(categoryValue);
  const scoped = category === "all" ? itemIndex : itemIndex.filter((item) => item.type === category);
  return {
    category,
    locations: [...new Set(scoped.map((item) => item.location))],
    ratings: ["4.0+", "4.5+", "4.8+"],
    priceRanges: ["under-5000", "5000-10000", "over-10000"],
    amenities: category === "hotel" ? ["Nature access", "Breakfast", "Quiet rooms"] : [],
    types: category === "property"
      ? [...new Set(scoped.map((item) => item.propertyType).filter((value): value is string => Boolean(value)))]
      : category === "event"
        ? [...new Set(scoped.map((item) => item.category))]
        : [],
    sorts: validSorts.map((value) => ({ value, label: value === "price_asc" ? "Price low to high" : value === "price_desc" ? "Price high to low" : value[0].toUpperCase() + value.slice(1) })),
  };
}

const exploreRouter: IRouter = Router();

exploreRouter.get("/v1/explore/search", (req, res) => {
  void searchExploreItemsLive(req.query as Record<string, unknown>)
    .then((result) => res.json(result))
    .catch((error) => {
      req.log.error({ error }, "Explore search failed");
      res.status(500).json({ error: { code: "EXPLORE_SEARCH_FAILED", message: "Explore results are temporarily unavailable." } });
    });
});

exploreRouter.get("/v1/explore/categories", (_req, res) => {
  res.json({
    notice: developmentNotice,
    items: categoryLabels.map((item) => ({
      ...item,
      count: itemIndex.filter((candidate) => candidate.type === item.id).length,
    })),
  });
});

exploreRouter.get("/v1/explore/filters", (req, res) => {
  res.json({ notice: developmentNotice, ...getExploreFilters(req.query.category) });
});

export default exploreRouter;