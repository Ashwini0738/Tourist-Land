import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test from "node:test";
import express from "express";
import { eq, inArray, sql } from "drizzle-orm";
import {
  db,
  destinations,
  events,
  featuredContent,
  hotels,
  offers,
  users,
} from "@workspace/db";
import { getDestinationDetail } from "./catalog-detail.ts";
import {
  createCatalogRouter,
  createFeaturedContentRouter,
  getFeaturedContent,
  type FeaturedContentList,
} from "./catalog.ts";

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

test("featured endpoint returns a safe 503 when the resolver fails", async (t) => {
  let resolverCalled = false;
  const app = express();
  app.use(createFeaturedContentRouter(async () => {
    resolverCalled = true;
    throw new Error("simulated database failure");
  }));

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/home/featured`);
  const body = await response.json();

  assert.equal(resolverCalled, true);
  assert.equal(response.status, 503);
  assert.deepEqual(body, {
    error: {
      code: "FEATURED_CONTENT_UNAVAILABLE",
      message: "Featured content is temporarily unavailable.",
    },
  });
});

test("home endpoint returns a safe 503 when the featured resolver fails", async (t) => {
  let resolverCalled = false;
  const app = express();
  app.use(createCatalogRouter(async () => {
    resolverCalled = true;
    throw new Error("simulated database failure");
  }));

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/home`);
  const body = await response.json();

  assert.equal(resolverCalled, true);
  assert.equal(response.status, 503);
  assert.deepEqual(body, {
    error: {
      code: "FEATURED_CONTENT_UNAVAILABLE",
      message: "Featured content is temporarily unavailable.",
    },
  });
});

test("featured endpoint returns the resolver notice and ordered items over HTTP", async (t) => {
  const fixture: FeaturedContentList = {
    notice: "Featured content is curated for your next journey.",
    items: [
      {
        id: "featured-selection-early",
        entityType: "destination",
        entityId: "destination-early",
        sortOrder: 10,
        title: "Early Destination",
        subtitle: "Early Region",
        location: "Early Region, India",
        summary: "The first featured destination.",
        imageKey: null,
        destinationId: "destination-early",
        dateLabel: null,
        ratingLabel: null,
        priceLabel: null,
      },
      {
        id: "featured-selection-late",
        entityType: "hotel",
        entityId: "hotel-late",
        sortOrder: 20,
        title: "Late Hotel",
        subtitle: "Boutique hotel",
        location: "Late City, India",
        summary: "The second featured stay.",
        imageKey: null,
        destinationId: "destination-early",
        dateLabel: null,
        ratingLabel: null,
        priceLabel: null,
      },
    ],
  };
  let resolverCalled = false;
  const app = express();
  app.use(createFeaturedContentRouter(async () => {
    resolverCalled = true;
    return fixture;
  }));

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/home/featured`);
  const body = await response.json();

  assert.equal(resolverCalled, true);
  assert.equal(response.status, 200);
  assert.deepEqual(body, fixture);
});

test("home endpoint preserves the resolver notice and ordered featured items", async (t) => {
  const fixture: FeaturedContentList = {
    notice: "Featured content is curated for your next journey.",
    items: [
      {
        id: "featured-selection-first",
        entityType: "event",
        entityId: "event-first",
        sortOrder: 5,
        title: "First Event",
        subtitle: "Event · Dec 1, 2026",
        location: "First Region, India",
        summary: "The first featured event.",
        imageKey: null,
        destinationId: "destination-first",
        dateLabel: "Dec 1, 2026",
        ratingLabel: null,
        priceLabel: null,
      },
      {
        id: "featured-selection-second",
        entityType: "offer",
        entityId: "offer-second",
        sortOrder: 15,
        title: "Second Offer",
        subtitle: "Offer",
        location: "Second City, India",
        summary: "The second featured offer.",
        imageKey: null,
        destinationId: "destination-second",
        dateLabel: null,
        ratingLabel: null,
        priceLabel: "10% off",
      },
    ],
  };
  let resolverCalled = false;
  const app = express();
  app.use(createCatalogRouter(async () => {
    resolverCalled = true;
    return fixture;
  }));

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/home`);
  const body = await response.json() as {
    notice: string;
    banners: unknown[];
    destinations: unknown[];
    nearby: unknown[];
    events: unknown[];
    hotels: unknown[];
    properties: unknown[];
    featuredDestinations: unknown[];
    featuredProperties: unknown[];
    featured: FeaturedContentList["items"];
  };

  assert.equal(resolverCalled, true);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body).sort(), [
    "banners",
    "destinations",
    "events",
    "featured",
    "featuredDestinations",
    "featuredProperties",
    "hotels",
    "nearby",
    "notice",
    "properties",
  ]);
  assert.equal(body.notice, fixture.notice);
  assert.deepEqual(body.featured, fixture.items);
  assert.deepEqual(
    body.featured.map((item) => item.id),
    ["featured-selection-first", "featured-selection-second"],
  );
});

type FeaturedFixture = {
  userId: string;
  destinationId: string;
  draftDestinationId: string;
  inactiveDestinationId: string;
  hotelId: string;
  draftHotelId: string;
  eventId: string;
  cancelledEventId: string;
  offerId: string;
  draftOfferId: string;
  selectionIds: string[];
};

async function featuredSchemaReady(): Promise<boolean> {
  const requiredColumns = [
    "users.id",
    "destinations.status",
    "events.status",
    "hotels.approval_status",
    "offers.status",
    "featured_content.entity_type",
    "featured_content.entity_id",
    "featured_content.sort_order",
    "featured_content.status",
    "featured_content.created_by",
  ];
  const schemaRows = await db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('users', 'destinations', 'events', 'hotels', 'offers', 'featured_content')
  `);
  const availableColumns = new Set(schemaRows.rows.map((row) => `${row.table_name}.${row.column_name}`));
  return requiredColumns.every((column) => availableColumns.has(column));
}

function fixtureUser(id: string) {
  return {
    id,
    clerkUserId: `catalog-featured-test-${id}`,
    email: `catalog-featured-${id}@example.test`,
    displayName: "Featured catalog test user",
    status: "active" as const,
  };
}

async function createFeaturedFixture(): Promise<FeaturedFixture> {
  const fixture: FeaturedFixture = {
    userId: randomUUID(),
    destinationId: randomUUID(),
    draftDestinationId: randomUUID(),
    inactiveDestinationId: randomUUID(),
    hotelId: randomUUID(),
    draftHotelId: randomUUID(),
    eventId: randomUUID(),
    cancelledEventId: randomUUID(),
    offerId: randomUUID(),
    draftOfferId: randomUUID(),
    selectionIds: Array.from({ length: 8 }, () => randomUUID()),
  };

  await db.insert(users).values(fixtureUser(fixture.userId));
  await db.insert(destinations).values([
    {
      id: fixture.destinationId,
      slug: `featured-test-destination-${fixture.destinationId}`,
      name: "Featured Test Destination",
      country: "India",
      region: "Featured Region",
      summary: "A destination used by the featured catalog test.",
      status: "published",
    },
    {
      id: fixture.draftDestinationId,
      slug: `featured-test-draft-destination-${fixture.draftDestinationId}`,
      name: "Draft Test Destination",
      country: "India",
      status: "draft",
    },
    {
      id: fixture.inactiveDestinationId,
      slug: `featured-test-inactive-destination-${fixture.inactiveDestinationId}`,
      name: "Inactive Test Destination",
      country: "India",
      status: "published",
    },
  ]);
  await db.insert(hotels).values([
    {
      id: fixture.hotelId,
      name: "Featured Test Hotel",
      address: "Featured Hotel Street",
      city: "Featured City",
      country: "India",
      destinationId: fixture.destinationId,
      status: "published",
      approvalStatus: "approved",
    },
    {
      id: fixture.draftHotelId,
      name: "Pending Test Hotel",
      address: "Pending Hotel Street",
      city: "Pending City",
      country: "India",
      destinationId: fixture.destinationId,
      status: "published",
      approvalStatus: "pending",
    },
  ]);
  await db.insert(events).values([
    {
      id: fixture.eventId,
      name: "Featured Test Event",
      description: "A scheduled event used by the featured catalog test.",
      destinationId: fixture.destinationId,
      startsAt: new Date("2026-12-01T10:00:00Z"),
      status: "scheduled",
    },
    {
      id: fixture.cancelledEventId,
      name: "Cancelled Test Event",
      destinationId: fixture.destinationId,
      startsAt: new Date("2026-12-02T10:00:00Z"),
      status: "cancelled",
    },
  ]);
  await db.insert(offers).values([
    {
      id: fixture.offerId,
      title: "Featured Test Offer",
      description: "A published offer used by the featured catalog test.",
      destinationId: fixture.destinationId,
      discountType: "percentage",
      discountValue: "15",
      status: "published",
    },
    {
      id: fixture.draftOfferId,
      title: "Draft Test Offer",
      destinationId: fixture.destinationId,
      status: "draft",
    },
  ]);

  await db.insert(featuredContent).values([
    { id: fixture.selectionIds[0], entityType: "offer", entityId: fixture.offerId, sortOrder: 10, createdBy: fixture.userId },
    { id: fixture.selectionIds[1], entityType: "destination", entityId: fixture.destinationId, sortOrder: 20, createdBy: fixture.userId },
    { id: fixture.selectionIds[2], entityType: "hotel", entityId: fixture.hotelId, sortOrder: 30, createdBy: fixture.userId },
    { id: fixture.selectionIds[3], entityType: "event", entityId: fixture.eventId, sortOrder: 40, createdBy: fixture.userId },
    { id: fixture.selectionIds[4], entityType: "destination", entityId: fixture.draftDestinationId, sortOrder: 1, createdBy: fixture.userId },
    { id: fixture.selectionIds[5], entityType: "hotel", entityId: fixture.draftHotelId, sortOrder: 2, createdBy: fixture.userId },
    { id: fixture.selectionIds[6], entityType: "event", entityId: fixture.cancelledEventId, sortOrder: 3, createdBy: fixture.userId },
    { id: fixture.selectionIds[7], entityType: "destination", entityId: fixture.inactiveDestinationId, sortOrder: 0, status: "inactive", createdBy: fixture.userId },
  ]);

  await db.insert(featuredContent).values({
    entityType: "offer",
    entityId: fixture.draftOfferId,
    sortOrder: 4,
    createdBy: fixture.userId,
  });

  return fixture;
}

async function deleteFeaturedFixture(fixture: FeaturedFixture): Promise<void> {
  await db.delete(featuredContent).where(eq(featuredContent.createdBy, fixture.userId));
  await db.delete(offers).where(inArray(offers.id, [fixture.offerId, fixture.draftOfferId]));
  await db.delete(events).where(inArray(events.id, [fixture.eventId, fixture.cancelledEventId]));
  await db.delete(hotels).where(inArray(hotels.id, [fixture.hotelId, fixture.draftHotelId]));
  await db.delete(destinations).where(inArray(destinations.id, [fixture.destinationId, fixture.draftDestinationId, fixture.inactiveDestinationId]));
  await db.delete(users).where(eq(users.id, fixture.userId));
}

test("featured content keeps editorial order across entity types and omits inactive or ineligible sources", async (t) => {
  if (!(await featuredSchemaReady())) {
    t.skip("development database schema is pending post-merge application");
    return;
  }

  const fixture = await createFeaturedFixture();
  t.after(() => deleteFeaturedFixture(fixture));

  const response = await getFeaturedContent();

  assert.deepEqual(
    response.items.map(({ entityType, entityId, sortOrder }) => ({ entityType, entityId, sortOrder })),
    [
      { entityType: "offer", entityId: fixture.offerId, sortOrder: 10 },
      { entityType: "destination", entityId: fixture.destinationId, sortOrder: 20 },
      { entityType: "hotel", entityId: fixture.hotelId, sortOrder: 30 },
      { entityType: "event", entityId: fixture.eventId, sortOrder: 40 },
    ],
  );
  assert.equal(response.items.some((item) => item.entityId === fixture.draftDestinationId), false);
  assert.equal(response.items.some((item) => item.entityId === fixture.inactiveDestinationId), false);
  assert.equal(response.items.some((item) => item.entityId === fixture.draftHotelId), false);
  assert.equal(response.items.some((item) => item.entityId === fixture.cancelledEventId), false);
  assert.equal(response.items.some((item) => item.entityId === fixture.draftOfferId), false);
  assert.equal(response.items.some((item) => item.id === fixture.selectionIds[7]), false);
});