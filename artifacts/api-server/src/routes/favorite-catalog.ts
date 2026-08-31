import {
  attractions,
  destinations,
  events,
  foods,
  hotels,
  properties,
  temples,
} from "./catalog-data.ts";
import { demoModeEnabled } from "../lib/demo-mode.ts";
import { demoDestinations, demoHotels, demoProperties } from "@workspace/db/seed-data";

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

const demoSources: Partial<Record<FavoriteEntityType, readonly CatalogItem[]>> = demoModeEnabled()
  ? {
      destination: demoDestinations.map((item) => ({ id: item.slug, name: item.name, location: `${item.region}, ${item.country}`, imageKey: "coastline" })),
      hotel: demoHotels.map((item) => ({ id: item.catalogId!, name: item.name, location: `${item.city}, ${item.state}`, imageKey: "coastline" })),
      property: demoProperties.map((item) => ({ id: item.slug, title: item.title, location: item.address, imageKey: "highlands" })),
    }
  : {};

export function getFavoriteCatalogItem(entityType: FavoriteEntityType, entityId: string) {
  const item = [...sources[entityType], ...(demoSources[entityType] ?? [])].find((candidate) => candidate.id === entityId);
  if (!item) return null;
  return {
    name: item.name ?? item.title ?? null,
    location: item.location ?? item.region ?? null,
    imageKey: item.imageKey ?? null,
    route: `/${entityType === "destination" ? "destination" : entityType === "property" ? "property" : entityType === "hotel" ? "hotel" : entityType}/${encodeURIComponent(entityId)}`,
  };
}