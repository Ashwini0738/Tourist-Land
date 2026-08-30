import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
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
import { getFeaturedContent } from "./catalog.ts";

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