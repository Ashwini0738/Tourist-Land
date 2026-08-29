import assert from "node:assert/strict";
import test from "node:test";
import { getExploreFilters, searchExploreItems, searchExploreItemsLive } from "./explore.ts";

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

test("Explore keeps seeded results marked as development content without providers", () => {
  const result = searchExploreItems({ category: "hotel" });

  assert.equal(result.notice, "Development discovery content only. It is not live availability, booking, pricing, or location data.");
  assert.ok(result.items.every((item) => item.source === "development"));
  assert.ok(result.items.every((item) => item.availability === undefined));
});

test("Explore only returns honest distances when an origin is supplied", () => {
  const withoutOrigin = searchExploreItems({ category: "hotel", limit: 50 });
  const withOrigin = searchExploreItems({
    category: "all",
    latitude: 12.422,
    longitude: 75.739,
    sort: "distance",
    limit: 50,
  });
  const nearbyOnly = searchExploreItems({
    category: "all",
    latitude: 12.422,
    longitude: 75.739,
    radiusKm: 2,
    sort: "distance",
    limit: 50,
  });

  assert.ok(withoutOrigin.items.every((item) => item.distanceKm === undefined));
  const temple = withOrigin.items.find((item) => item.id === "coorg-omkareshwara-temple");
  assert.equal(temple?.coordinates?.precision, "place");
  assert.ok((temple?.distanceKm ?? 99) < 1);
  assert.ok(nearbyOnly.items.length > 0);
  assert.ok(nearbyOnly.items.every((item) => (item.distanceKm ?? 99) <= 2));
});

test("Explore merges live hotel availability and cancelled event schedules", async () => {
  const fetcher = async (input: string | URL) => {
    const url = String(input);
    if (url.startsWith("https://hotels.example")) {
      return new Response(JSON.stringify({
        items: [{ id: "01", status: "available", priceAmount: 9100, currency: "INR", roomType: "Garden room" }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({
      items: [{ id: "konkan-sunset-stories", status: "cancelled", cancellationReason: "Weather advisory" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const result = await searchExploreItemsLive(
    { category: "all", limit: 50 },
    { fetcher, env: { HOTEL_AVAILABILITY_PROVIDER_URL: "https://hotels.example", EVENT_SCHEDULE_PROVIDER_URL: "https://events.example" } },
  );
  const hotel = result.items.find((item) => item.id === "01");
  const event = result.items.find((item) => item.id === "konkan-sunset-stories");

  assert.equal(hotel?.source, "live");
  assert.equal(hotel?.availability?.status, "available");
  assert.equal(hotel?.availability?.priceLabel, "₹9,100 / night");
  assert.equal(event?.source, "live");
  assert.equal(event?.schedule?.status, "cancelled");
  assert.equal(event?.dateLabel, "Cancelled · Weather advisory");
  assert.match(result.notice, /Live hotel availability/);
});

test("Explore isolates a failed hotel provider from a working event provider", async () => {
  const fetcher = async (input: string | URL) => {
    if (String(input).startsWith("https://hotels.example")) throw new Error("hotel provider offline");
    return new Response(JSON.stringify({
      items: [{ id: "coorg-harvest-notes", status: "scheduled", startsAt: "2026-09-12T09:00:00Z" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const result = await searchExploreItemsLive(
    { category: "all", limit: 50 },
    { fetcher, env: { HOTEL_AVAILABILITY_PROVIDER_URL: "https://hotels.example", EVENT_SCHEDULE_PROVIDER_URL: "https://events.example" } },
  );
  const hotel = result.items.find((item) => item.id === "01");
  const event = result.items.find((item) => item.id === "coorg-harvest-notes");

  assert.equal(hotel?.source, "unavailable");
  assert.equal(hotel?.availability?.status, "unavailable");
  assert.equal(hotel?.priceLabel, undefined);
  assert.equal(event?.source, "live");
  assert.equal(event?.schedule?.status, "scheduled");
});