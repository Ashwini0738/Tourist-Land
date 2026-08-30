import test from "node:test";
import assert from "node:assert/strict";
import {
  getHotelDetail,
  getHotelNearby,
  getHotelRooms,
  parseHotelSearchInput,
  searchHotelCatalog,
} from "./hotel-catalog.ts";

test("hotel search matches names, locations, and destination names", () => {
  const result = parseHotelSearchInput({ q: "coorg", limit: "10" });
  assert.equal("error" in result, false);
  if ("error" in result) return;
  const response = searchHotelCatalog(result);
  assert.deepEqual(response.items.map((item) => item.id), ["02"]);
  assert.equal(response.notice.includes("not live availability"), true);
});

test("hotel search filters, sorts, and paginates catalog records", () => {
  const result = parseHotelSearchInput({
    amenity: "Breakfast",
    minRating: "4.8",
    sort: "price_asc",
    page: "1",
    limit: "1",
  });
  assert.equal("error" in result, false);
  if ("error" in result) return;
  const response = searchHotelCatalog(result);
  assert.equal(response.total, 2);
  assert.equal(response.items.length, 1);
  assert.equal(response.items[0]?.id, "02");
  assert.equal(response.hasMore, true);
});

test("hotel search calculates honest distance only with a complete origin", () => {
  const invalid = parseHotelSearchInput({ latitude: "12.4" });
  assert.deepEqual(invalid, { error: "Latitude and longitude must be provided together." });
  const valid = parseHotelSearchInput({ latitude: "12.42", longitude: "75.74", sort: "distance", limit: "50" });
  assert.equal("error" in valid, false);
  if ("error" in valid) return;
  const response = searchHotelCatalog(valid);
  assert.equal(response.items[0]?.id, "02");
  assert.equal(response.items[0]?.distanceKm, 0);
});

test("hotel search rejects invalid dates without pretending to check availability", () => {
  assert.deepEqual(
    parseHotelSearchInput({ checkIn: "2026-08-30", checkOut: "2026-08-29" }),
    { error: "Check-out must be after check-in." },
  );
  assert.equal(getHotelDetail("missing-hotel"), null);
});

test("hotel detail, rooms, and nearby endpoints expose only catalog-backed records", () => {
  const detail = getHotelDetail("01");
  assert.equal(detail?.hotel.source, "development");
  assert.deepEqual(detail?.galleryImageKeys, ["coastline", "coastline"]);
  assert.deepEqual(getHotelRooms("01")?.items, []);
  assert.equal(getHotelRooms("missing-hotel"), null);
  assert.equal(getHotelNearby("01")?.items[0]?.destinationId, "konkan");
});