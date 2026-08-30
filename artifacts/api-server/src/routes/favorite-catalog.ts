import {
  attractions,
  destinations,
  events,
  foods,
  hotels,
  properties,
  temples,
} from "./catalog-data.ts";

export const favoriteEntityTypes = [
  "destination",
  "place",
  "temple",
  "attraction",
  "event",
  "food",
  "hotel",
  "property",
] as const;

export type FavoriteEntityType = typeof favoriteEntityTypes[number];

type CatalogItem = {
  id: string;
  name?: string;
  title?: string;
  location?: string;
  region?: string;
  imageKey?: string;
};

const sources: Record<FavoriteEntityType, readonly CatalogItem[]> = {
  destination: destinations,
  place: attractions,
  temple: temples,
  attraction: attractions,
  event: events,
  food: foods,
  hotel: hotels,
  property: properties,
};

export function getFavoriteCatalogItem(entityType: FavoriteEntityType, entityId: string) {
  const item = sources[entityType].find((candidate) => candidate.id === entityId);
  if (!item) return null;
  return {
    name: item.name ?? item.title ?? null,
    location: item.location ?? item.region ?? null,
    imageKey: item.imageKey ?? null,
    route: `/${entityType === "destination" ? "destination" : entityType === "property" ? "property" : entityType === "hotel" ? "hotel" : entityType}/${encodeURIComponent(entityId)}`,
  };
}