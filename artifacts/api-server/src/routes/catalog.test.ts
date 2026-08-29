import assert from "node:assert/strict";
import test from "node:test";
import { getDestinationDetail } from "./catalog-detail.ts";

test("destination details compose only related catalog content", () => {
  const result = getDestinationDetail("coorg");

  assert.ok(result);
  assert.equal(result.destination.name, "Coorg Highlands");
  assert.ok(result.places.some((item) => item.name === "Omkareshwara Temple"));
  assert.ok(result.places.some((item) => item.name === "Coffee Estate Trail"));
  assert.ok(result.events.every((item) => item.destinationId === "coorg"));
  assert.ok(result.foods.every((item) => item.destinationId === "coorg"));
  assert.ok(result.hotels.every((item) => item.destinationId === "coorg"));
  assert.ok(result.nearby.every((item) => item.destinationId === "coorg"));
  assert.match(result.sourceNotice, /Development discovery content/);
});

test("unknown destination details return no fabricated fallback", () => {
  assert.equal(getDestinationDetail("not-a-real-destination"), null);
});