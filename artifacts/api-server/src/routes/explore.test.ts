import assert from "node:assert/strict";
import test from "node:test";
import { getExploreFilters, searchExploreItems } from "./explore.ts";

test("Explore search matches titles, locations, and categories", () => {
  const result = searchExploreItems({ q: "coorg", limit: 50 });

  assert.ok(result.total >= 5);
  assert.ok(result.items.some((item) => item.title === "Coorg Highlands"));
  assert.ok(result.items.some((item) => item.title === "Pepper Kitchen"));
  assert.ok(result.suggestions.length > 0);
});

test("Explore search filters by category and location", () => {
  const result = searchExploreItems({ category: "Hotels", location: "Coorg" });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.type, "hotel");
  assert.equal(result.items[0]?.title, "Misty Fig Estate");
});

test("Explore search paginates without returning the full catalog", () => {
  const firstPage = searchExploreItems({ page: 1, limit: 3 });
  const secondPage = searchExploreItems({ page: 2, limit: 3 });

  assert.equal(firstPage.items.length, 3);
  assert.equal(secondPage.items.length, 3);
  assert.equal(firstPage.hasMore, true);
  assert.notEqual(firstPage.items[0]?.id, secondPage.items[0]?.id);
});

test("Explore search supports category-specific filters and price sorting", () => {
  const filtered = searchExploreItems({ category: "hotel", amenity: "Breakfast" });
  const sorted = searchExploreItems({ category: "hotel", sort: "price_desc" });

  assert.equal(filtered.total, 2);
  assert.equal(sorted.items[0]?.title, "The Mango House");
  assert.equal(sorted.items[1]?.title, "Misty Fig Estate");
});

test("Explore filters only advertise options relevant to the category", () => {
  const hotelFilters = getExploreFilters("hotel");
  const eventFilters = getExploreFilters("event");
  const propertyFilters = getExploreFilters("property");

  assert.deepEqual(hotelFilters.amenities, ["Nature access", "Breakfast", "Quiet rooms"]);
  assert.deepEqual(eventFilters.types, ["Cultural", "Heritage"]);
  assert.deepEqual(propertyFilters.types, ["Agri-tourism", "Coastal retreat"]);
});