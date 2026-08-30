import test from "node:test";
import assert from "node:assert/strict";
import { favoriteEntityTypes, getFavoriteCatalogItem } from "./favorite-catalog.ts";
import { attractions, destinations, events, foods, hotels, properties, temples } from "./catalog-data.ts";

test("favorite catalog resolves every supported entity type from the real catalog", () => {
  const firstIds = {
    destination: destinations[0].id,
    place: attractions[0].id,
    temple: temples[0].id,
    attraction: attractions[0].id,
    event: events[0].id,
    food: foods[0].id,
    hotel: hotels[0].id,
    property: properties[0].id,
  } as const;

  for (const entityType of favoriteEntityTypes) {
    const item = getFavoriteCatalogItem(entityType, firstIds[entityType]);
    assert.ok(item);
    assert.equal(typeof item.route, "string");
    assert.notEqual(item.name, null);
  }
});

test("favorite catalog does not fabricate unavailable references", () => {
  assert.equal(getFavoriteCatalogItem("hotel", "not-in-catalog"), null);
});