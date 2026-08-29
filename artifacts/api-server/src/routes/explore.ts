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
};

const notice = "Development discovery content only. It is not live availability, booking, pricing, or location data.";
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
  ...destinations.map((item, index): ExploreItem => ({
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
  ...nearby.map((item, index): ExploreItem => ({
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
  ...temples.map((item, index): ExploreItem => ({
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
  ...attractions.map((item, index): ExploreItem => ({
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
  ...events.map((item, index): ExploreItem => ({
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
  ...foods.map((item, index): ExploreItem => ({
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
  ...hotels.map((item, index): ExploreItem => ({
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
  ...properties.map((item, index): ExploreItem => ({
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
];

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

export function searchExploreItems(rawQuery: Record<string, unknown>) {
  const query = asText(rawQuery.q).toLowerCase();
  const category = resolveCategory(rawQuery.category);
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
    itemIndex.filter((item) => {
      if (category !== "all" && item.type !== category) return false;
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
    notice,
    page,
    limit,
    total: filtered.length,
    hasMore: offset + items.length < filtered.length,
    items,
    suggestions,
  };
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
  res.json(searchExploreItems(req.query as Record<string, unknown>));
});

exploreRouter.get("/v1/explore/categories", (_req, res) => {
  res.json({
    notice,
    items: categoryLabels.map((item) => ({
      ...item,
      count: itemIndex.filter((candidate) => candidate.type === item.id).length,
    })),
  });
});

exploreRouter.get("/v1/explore/filters", (req, res) => {
  res.json({ notice, ...getExploreFilters(req.query.category) });
});

export default exploreRouter;