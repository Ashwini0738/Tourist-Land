import { Router, type IRouter, type Request, type RequestHandler, type Response } from "express";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import {
  adminAuditLogs,
  attractions,
  bookings,
  destinations,
  events,
  favorites,
  foodPlaces,
  hotelRooms,
  hotels,
  notifications,
  payments,
  properties,
  propertyEnquiries,
  reviews,
  roomAvailability,
  userRoles,
  users,
  vendorProfiles,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth.ts";
import { requireRole } from "../middlewares/authorization.ts";
import { resolvePrimaryRole } from "../lib/roles.ts";
import { db } from "@workspace/db";

export function createAdminRouter(authenticate: RequestHandler = requireAuth): IRouter {
  const router: IRouter = Router();
  router.use(authenticate, requireRole("admin"));

type QueryValue = string | undefined;
type Page = { page: number; limit: number; offset: number };

function queryString(req: Request, name: string): QueryValue {
  const value = req.query[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pageFrom(req: Request): Page {
  const page = Math.max(1, Number.parseInt(queryString(req, "page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(queryString(req, "limit") ?? "20", 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function pageMeta(page: Page, total: number): { page: number; limit: number; total: number; hasMore: boolean } {
  return { page: page.page, limit: page.limit, total, hasMore: page.offset + page.limit < total };
}

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function jsonBody(req: Request): Record<string, unknown> | null {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : null;
}

function id(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
}

async function audit(req: Request, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>): Promise<void> {
  if (!req.localUser) return;
  await db.insert(adminAuditLogs).values({
    adminUserId: req.localUser.id,
    action,
    entityType,
    entityId,
    metadata: metadata ?? {},
  });
}

async function count(table: any, condition?: any): Promise<number> {
  const rows = await db.select({ value: sql<number>`count(*)` }).from(table).where(condition);
  return Number(rows[0]?.value ?? 0);
}

async function roleByUserIds(ids: string[]): Promise<Map<string, "user" | "vendor" | "admin">> {
  if (!ids.length) return new Map();
  const rows = await db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles).where(inArray(userRoles.userId, ids));
  const map = new Map<string, "user" | "vendor" | "admin">();
  for (const userId of ids) {
    map.set(userId, resolvePrimaryRole(rows.filter((row) => row.userId === userId).map((row) => row.role)));
  }
  return map;
}

function serializeUser(user: typeof users.$inferSelect, role: "user" | "vendor" | "admin") {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role,
    status: user.status,
    vendorProfile: null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function serializeDestination(destination: typeof destinations.$inferSelect) {
  return {
    ...destination,
    latitude: numberValue(destination.latitude),
    longitude: numberValue(destination.longitude),
  };
}

function serializeHotel(hotel: typeof hotels.$inferSelect, owner?: typeof users.$inferSelect | null, roomCount = 0) {
  return {
    id: hotel.id,
    name: hotel.name,
    address: hotel.address,
    city: hotel.city,
    country: hotel.country,
    status: hotel.status,
    approvalStatus: hotel.approvalStatus,
    ownerId: hotel.ownerId,
    ownerName: owner?.displayName ?? null,
    ownerEmail: owner?.email ?? null,
    roomCount,
    createdAt: hotel.createdAt,
    updatedAt: hotel.updatedAt,
  };
}

router.get("/v1/admin/dashboard", async (_req, res) => {
  const [totalUsers, activeUsers, totalVendors, pendingVendors, approvedVendors, totalHotels, publishedHotels, pendingHotels, totalBookings, confirmedBookings, pendingBookings, paidPayments, paymentVolume] = await Promise.all([
    count(users),
    count(users, eq(users.status, "active")),
    count(vendorProfiles),
    count(vendorProfiles, eq(vendorProfiles.status, "pending")),
    count(vendorProfiles, eq(vendorProfiles.status, "approved")),
    count(hotels),
    count(hotels, eq(hotels.status, "published")),
    count(hotels, eq(hotels.approvalStatus, "pending")),
    count(bookings),
    count(bookings, eq(bookings.status, "confirmed")),
    count(bookings, eq(bookings.status, "pending_payment")),
    count(payments, eq(payments.status, "paid")),
    db.select({ value: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(eq(payments.status, "paid")),
  ]);
  res.json({
    role: "admin",
    title: "Platform operations",
    generatedAt: new Date().toISOString(),
    users: { total: totalUsers, active: activeUsers, pending: 0, approved: 0, rejected: 0, inactive: totalUsers - activeUsers },
    vendors: { total: totalVendors, active: approvedVendors, pending: pendingVendors, approved: approvedVendors, rejected: await count(vendorProfiles, eq(vendorProfiles.status, "rejected")), inactive: await count(vendorProfiles, eq(vendorProfiles.status, "suspended")) },
    hotels: { total: totalHotels, active: publishedHotels, pending: pendingHotels, approved: await count(hotels, eq(hotels.approvalStatus, "approved")), rejected: await count(hotels, eq(hotels.approvalStatus, "rejected")), inactive: await count(hotels, eq(hotels.status, "archived")) },
    bookings: { total: totalBookings, active: confirmedBookings, pending: pendingBookings, approved: 0, rejected: 0, inactive: await count(bookings, eq(bookings.status, "cancelled")) },
    revenue: { status: "available", successfulPayments: paidPayments, paymentVolume: numberValue(paymentVolume[0]?.value) ?? 0, refundVolume: 0, currency: "INR" },
  });
});

router.get("/v1/admin/users", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const requestedRole = queryString(req, "role");
  const requestedStatus = queryString(req, "status");
  const conditions = [
    q ? or(ilike(users.email, `%${q}%`), ilike(users.displayName, `%${q}%`)) : undefined,
    requestedStatus ? eq(users.status, requestedStatus) : undefined,
  ].filter(Boolean) as any[];
  if (requestedRole) {
    const roleRows = await db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.role, requestedRole));
    conditions.push(roleRows.length ? inArray(users.id, roleRows.map((row) => row.userId)) : eq(users.id, "00000000-0000-0000-0000-000000000000"));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ value: sql<number>`count(*)` }).from(users).where(where),
  ]);
  const roles = await roleByUserIds(rows.map((row) => row.id));
  res.json({ items: rows.map((row) => serializeUser(row, roles.get(row.id) ?? "user")), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.get("/v1/admin/users/:id", async (req, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, id(req)) });
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found.");
  const roles = await roleByUserIds([user.id]);
  const [bookingCount, favoriteCount, reviewCount] = await Promise.all([
    count(bookings, eq(bookings.userId, user.id)),
    count(favorites, eq(favorites.userId, user.id)),
    count(reviews, eq(reviews.userId, user.id)),
  ]);
  res.json({ user: serializeUser(user, roles.get(user.id) ?? "user"), bookingCount, favoriteCount, reviewCount });
});

router.post("/v1/admin/users/:id/status", async (req, res) => {
  const body = jsonBody(req);
  const status = typeof body?.status === "string" ? body.status : undefined;
  if (!status || !["active", "inactive", "suspended"].includes(status)) return fail(res, 400, "INVALID_STATUS", "Provide an active, inactive, or suspended status.");
  if (id(req) === req.localUser?.id && status !== "active") return fail(res, 409, "SELF_LOCKOUT", "You cannot deactivate or suspend your own administrator account.");
  const updated = (await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id(req))).returning())[0];
  if (!updated) return fail(res, 404, "NOT_FOUND", "User not found.");
  await audit(req, "status_updated", "user", updated.id, { status, reason: body?.reason ?? null });
  const roles = await roleByUserIds([updated.id]);
  res.json(serializeUser(updated, roles.get(updated.id) ?? "user"));
});

router.get("/v1/admin/vendors", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const conditions = [
    q ? or(ilike(vendorProfiles.businessName, `%${q}%`), ilike(vendorProfiles.email, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined,
    status ? eq(vendorProfiles.status, status) : undefined,
  ].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select({ profile: vendorProfiles, user: users }).from(vendorProfiles).innerJoin(users, eq(vendorProfiles.userId, users.id)).where(where).orderBy(desc(vendorProfiles.updatedAt)).limit(page.limit).offset(page.offset),
    db.select({ value: sql<number>`count(*)` }).from(vendorProfiles).innerJoin(users, eq(vendorProfiles.userId, users.id)).where(where),
  ]);
  const counts = await Promise.all(rows.map((row) => count(hotels, eq(hotels.ownerId, row.user.id))));
  res.json({ items: rows.map((row, index) => ({ userId: row.user.id, user: serializeUser(row.user, "vendor"), profile: row.profile, hotelCount: counts[index] ?? 0 })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.post("/v1/admin/vendors/:userId/status", async (req, res) => {
  const body = jsonBody(req);
  const status = typeof body?.status === "string" ? body.status : undefined;
  if (!status || !["pending", "approved", "rejected", "suspended"].includes(status)) return fail(res, 400, "INVALID_STATUS", "Provide a valid vendor status.");
  const updated = (await db.update(vendorProfiles).set({ status, updatedAt: new Date() }).where(eq(vendorProfiles.userId, Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId)).returning())[0];
  if (!updated) return fail(res, 404, "NOT_FOUND", "Vendor profile not found.");
  await audit(req, "status_updated", "vendor", updated.userId, { status, reason: body?.reason ?? null });
  res.json(updated);
});

router.get("/v1/admin/hotels", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const approvalStatus = queryString(req, "approvalStatus");
  const conditions = [
    q ? or(ilike(hotels.name, `%${q}%`), ilike(hotels.address, `%${q}%`)) : undefined,
    status ? eq(hotels.status, status) : undefined,
    approvalStatus ? eq(hotels.approvalStatus, approvalStatus) : undefined,
  ].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(hotels).where(where).orderBy(desc(hotels.updatedAt)).limit(page.limit).offset(page.offset),
    db.select({ value: sql<number>`count(*)` }).from(hotels).where(where),
  ]);
  const owners = await db.select().from(users).where(inArray(users.id, rows.flatMap((row) => row.ownerId ? [row.ownerId] : [])));
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));
  const roomCounts = await Promise.all(rows.map((row) => count(hotelRooms, eq(hotelRooms.hotelId, row.id))));
  res.json({ items: rows.map((row, index) => serializeHotel(row, row.ownerId ? ownerMap.get(row.ownerId) : null, roomCounts[index] ?? 0)), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.get("/v1/admin/hotels/:id", async (req, res) => {
  const hotel = await db.query.hotels.findFirst({ where: eq(hotels.id, id(req)) });
  if (!hotel) return fail(res, 404, "NOT_FOUND", "Hotel not found.");
  const rooms = await db.select().from(hotelRooms).where(eq(hotelRooms.hotelId, hotel.id)).orderBy(asc(hotelRooms.name));
  const availability = await db.select().from(roomAvailability).where(inArray(roomAvailability.roomId, rooms.map((room) => room.id))).orderBy(asc(roomAvailability.date)).limit(100);
  res.json({
    hotel: serializeHotel(hotel, hotel.ownerId ? await db.query.users.findFirst({ where: eq(users.id, hotel.ownerId) }) : null, rooms.length),
    rooms: rooms.map((room) => ({ id: room.id, hotelId: room.hotelId, hotelName: hotel.name, name: room.name, capacity: room.capacity, totalUnits: room.totalUnits, nightlyRate: numberValue(room.nightlyRate) ?? 0, currency: room.currency, status: room.status, reservedUnits: null, availableUnits: null })),
    availability: availability.map((entry) => ({ id: entry.id, roomId: entry.roomId, roomName: rooms.find((room) => room.id === entry.roomId)?.name ?? "Room", hotelName: hotel.name, date: entry.date, availableUnits: entry.availableUnits, reservedUnits: null, status: entry.status, blackoutReason: entry.blackoutReason })),
  });
});

router.post("/v1/admin/hotels/:id/status", async (req, res) => {
  const body = jsonBody(req);
  const status = typeof body?.status === "string" ? body.status : undefined;
  const approvalStatus = typeof body?.approvalStatus === "string" ? body.approvalStatus : undefined;
  if ((status !== undefined && !["draft", "published", "archived"].includes(status)) || (approvalStatus !== undefined && !["pending", "approved", "rejected"].includes(approvalStatus)) || (status === undefined && approvalStatus === undefined)) return fail(res, 400, "INVALID_STATUS", "Provide a valid hotel or approval status.");
  const current = await db.query.hotels.findFirst({ where: eq(hotels.id, id(req)) });
  if (!current) return fail(res, 404, "NOT_FOUND", "Hotel not found.");
  const patch = { ...(status ? { status } : {}), ...(approvalStatus ? { approvalStatus } : {}), updatedAt: new Date() };
  const updated = (await db.update(hotels).set(patch).where(eq(hotels.id, current.id)).returning())[0];
  await audit(req, "status_updated", "hotel", current.id, { status: status ?? null, approvalStatus: approvalStatus ?? null, reason: body?.reason ?? null });
  res.json(serializeHotel(updated, updated.ownerId ? await db.query.users.findFirst({ where: eq(users.id, updated.ownerId) }) : null, await count(hotelRooms, eq(hotelRooms.hotelId, updated.id))));
});

router.get("/v1/admin/rooms", async (req, res) => {
  const page = pageFrom(req);
  const hotelId = queryString(req, "hotelId");
  const status = queryString(req, "status");
  const q = queryString(req, "q");
  const conditions = [hotelId ? eq(hotelRooms.hotelId, hotelId) : undefined, status ? eq(hotelRooms.status, status) : undefined, q ? ilike(hotelRooms.name, `%${q}%`) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select({ room: hotelRooms, hotel: hotels }).from(hotelRooms).innerJoin(hotels, eq(hotelRooms.hotelId, hotels.id)).where(where).orderBy(asc(hotels.name), asc(hotelRooms.name)).limit(page.limit).offset(page.offset),
    db.select({ value: sql<number>`count(*)` }).from(hotelRooms).where(where),
  ]);
  res.json({ items: rows.map(({ room, hotel }) => ({ id: room.id, hotelId: room.hotelId, hotelName: hotel.name, name: room.name, capacity: room.capacity, totalUnits: room.totalUnits, nightlyRate: numberValue(room.nightlyRate) ?? 0, currency: room.currency, status: room.status, reservedUnits: null, availableUnits: null })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.get("/v1/admin/availability", async (req, res) => {
  const page = pageFrom(req);
  const from = queryString(req, "from");
  const to = queryString(req, "to");
  const q = queryString(req, "q");
  const conditions = [from ? gte(roomAvailability.date, from) : undefined, to ? lte(roomAvailability.date, to) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db.select({ entry: roomAvailability, room: hotelRooms, hotel: hotels }).from(roomAvailability).innerJoin(hotelRooms, eq(roomAvailability.roomId, hotelRooms.id)).innerJoin(hotels, eq(hotelRooms.hotelId, hotels.id)).where(where).orderBy(asc(roomAvailability.date)).limit(page.limit).offset(page.offset);
  const filtered = q ? rows.filter((row) => `${row.room.name} ${row.hotel.name}`.toLowerCase().includes(q.toLowerCase())) : rows;
  const total = await count(roomAvailability, where);
  res.json({ items: filtered.map(({ entry, room, hotel }) => ({ id: entry.id, roomId: room.id, roomName: room.name, hotelName: hotel.name, date: entry.date, availableUnits: entry.availableUnits, reservedUnits: null, status: entry.status, blackoutReason: entry.blackoutReason })), meta: pageMeta(page, total) });
});

router.get("/v1/admin/destinations", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const conditions = [q ? or(ilike(destinations.name, `%${q}%`), ilike(destinations.country, `%${q}%`), ilike(destinations.slug, `%${q}%`)) : undefined, status ? eq(destinations.status, status) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select().from(destinations).where(where).orderBy(asc(destinations.name)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(destinations).where(where)]);
  res.json({ items: rows.map(serializeDestination), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.post("/v1/admin/destinations", async (req, res) => {
  const body = jsonBody(req);
  if (typeof body?.slug !== "string" || typeof body.name !== "string" || typeof body.country !== "string") return fail(res, 400, "INVALID_INPUT", "Slug, name, and country are required.");
  try {
    const destination = (await db.insert(destinations).values({ slug: body.slug.trim(), name: body.name.trim(), country: body.country.trim(), region: typeof body.region === "string" ? body.region : null, summary: typeof body.summary === "string" ? body.summary : null, latitude: typeof body.latitude === "number" ? String(body.latitude) : null, longitude: typeof body.longitude === "number" ? String(body.longitude) : null, status: typeof body.status === "string" ? body.status : "draft" }).returning())[0];
    await audit(req, "created", "destination", destination.id);
    res.status(201).json(serializeDestination(destination));
  } catch {
    fail(res, 409, "CONFLICT", "A destination with this slug already exists.");
  }
});

router.patch("/v1/admin/destinations/:id", async (req, res) => {
  const body = jsonBody(req);
  if (!body) return fail(res, 400, "INVALID_INPUT", "Provide destination fields to update.");
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["slug", "name", "country", "region", "summary", "status"]) if (typeof body[key] === "string" || body[key] === null) patch[key] = body[key];
  if (typeof body.latitude === "number") patch.latitude = String(body.latitude);
  if (typeof body.longitude === "number") patch.longitude = String(body.longitude);
  const destination = (await db.update(destinations).set(patch as any).where(eq(destinations.id, id(req))).returning())[0];
  if (!destination) return fail(res, 404, "NOT_FOUND", "Destination not found.");
  await audit(req, "updated", "destination", destination.id, { fields: Object.keys(patch).filter((key) => key !== "updatedAt") });
  res.json(serializeDestination(destination));
});

router.get("/v1/admin/places", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q")?.toLowerCase();
  const type = queryString(req, "type");
  const [attractionRows, foodRows] = await Promise.all([db.select({ place: attractions, destination: destinations }).from(attractions).leftJoin(destinations, eq(attractions.destinationId, destinations.id)), db.select({ place: foodPlaces, destination: destinations }).from(foodPlaces).leftJoin(destinations, eq(foodPlaces.destinationId, destinations.id))]);
  const all = [
    ...(type !== "food" ? attractionRows.map(({ place, destination }) => ({ id: place.id, type: "attraction", destinationId: place.destinationId, destinationName: destination?.name ?? null, name: place.name, description: place.description, address: place.address, status: place.status })) : []),
    ...(type !== "attraction" ? foodRows.map(({ place, destination }) => ({ id: place.id, type: "food", destinationId: place.destinationId, destinationName: destination?.name ?? null, name: place.name, description: place.cuisine, address: place.address, status: place.status })) : []),
  ].filter((place) => !q || `${place.name} ${place.destinationName ?? ""}`.toLowerCase().includes(q));
  res.json({ items: all.slice(page.offset, page.offset + page.limit), meta: pageMeta(page, all.length) });
});

router.get("/v1/admin/events", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const conditions = [q ? ilike(events.name, `%${q}%`) : undefined, status ? eq(events.status, status) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select({ event: events, destination: destinations }).from(events).leftJoin(destinations, eq(events.destinationId, destinations.id)).where(where).orderBy(asc(events.startsAt)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(events).where(where)]);
  res.json({ items: rows.map(({ event, destination }) => ({ id: event.id, destinationId: event.destinationId, destinationName: destination?.name ?? null, name: event.name, description: event.description, startsAt: event.startsAt, endsAt: event.endsAt, status: event.status })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.get("/v1/admin/properties", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const verification = queryString(req, "verification");
  const conditions = [q ? or(ilike(properties.title, `%${q}%`), ilike(properties.address, `%${q}%`)) : undefined, status ? eq(properties.status, status) : undefined, verification === "verified" ? eq(properties.isVerified, true) : verification === "unverified" ? eq(properties.isVerified, false) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select({ property: properties, owner: users }).from(properties).innerJoin(users, eq(properties.ownerId, users.id)).where(where).orderBy(desc(properties.createdAt)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(properties).where(where)]);
  const enquiryCounts = await Promise.all(rows.map((row) => count(propertyEnquiries, eq(propertyEnquiries.propertyId, row.property.id))));
  res.json({ items: rows.map(({ property, owner }, index) => ({ id: property.id, title: property.title, propertyType: property.propertyType, address: property.address, areaValue: numberValue(property.areaValue) ?? 0, areaUnit: property.areaUnit, askingPrice: numberValue(property.askingPrice), currency: property.currency, isVerified: property.isVerified, status: property.status, ownerId: property.ownerId, ownerName: owner.displayName, ownerEmail: owner.email, enquiryCount: enquiryCounts[index] ?? 0, createdAt: property.createdAt })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.post("/v1/admin/properties/:id/status", async (req, res) => {
  const body = jsonBody(req);
  const status = typeof body?.status === "string" ? body.status : undefined;
  if (!status || !["pending", "published", "archived"].includes(status)) return fail(res, 400, "INVALID_STATUS", "Provide a valid property status.");
  const updated = (await db.update(properties).set({ status, updatedAt: new Date() }).where(eq(properties.id, id(req))).returning())[0];
  if (!updated) return fail(res, 404, "NOT_FOUND", "Property not found.");
  await audit(req, "status_updated", "property", updated.id, { status, reason: body?.reason ?? null });
  res.json({ id: updated.id, title: updated.title, propertyType: updated.propertyType, address: updated.address, areaValue: numberValue(updated.areaValue) ?? 0, areaUnit: updated.areaUnit, askingPrice: numberValue(updated.askingPrice), currency: updated.currency, isVerified: updated.isVerified, status: updated.status, ownerId: updated.ownerId, ownerName: null, ownerEmail: null, enquiryCount: 0, createdAt: updated.createdAt });
});

router.get("/v1/admin/bookings", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const conditions = [q ? or(ilike(bookings.reference, `%${q}%`), ilike(bookings.guestName, `%${q}%`), ilike(bookings.guestEmail, `%${q}%`)) : undefined, status ? eq(bookings.status, status) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select({ booking: bookings, user: users }).from(bookings).innerJoin(users, eq(bookings.userId, users.id)).where(where).orderBy(desc(bookings.createdAt)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(bookings).where(where)]);
  res.json({ items: rows.map(({ booking, user }) => ({ id: booking.id, reference: booking.reference, userId: booking.userId, userName: user.displayName, userEmail: user.email, hotelName: null, vendorName: null, roomName: null, startsOn: booking.startsOn, endsOn: booking.endsOn, guestName: booking.guestName, guestEmail: booking.guestEmail, totalAmount: numberValue(booking.totalAmount) ?? 0, currency: booking.currency, status: booking.status, paymentStatus: null, createdAt: booking.createdAt })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.get("/v1/admin/bookings/:id", async (req, res) => {
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, id(req)) });
  if (!booking) return fail(res, 404, "NOT_FOUND", "Booking not found.");
  const user = await db.query.users.findFirst({ where: eq(users.id, booking.userId) });
  res.json({ id: booking.id, reference: booking.reference, userId: booking.userId, userName: user?.displayName ?? null, userEmail: user?.email ?? booking.guestEmail, hotelName: null, vendorName: null, roomName: null, startsOn: booking.startsOn, endsOn: booking.endsOn, guestName: booking.guestName, guestEmail: booking.guestEmail, totalAmount: numberValue(booking.totalAmount) ?? 0, currency: booking.currency, status: booking.status, paymentStatus: null, createdAt: booking.createdAt });
});

router.get("/v1/admin/payments", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const conditions = [status ? eq(payments.status, status) : undefined, q ? ilike(payments.providerReference, `%${q}%`) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select({ payment: payments, booking: bookings }).from(payments).leftJoin(bookings, eq(payments.bookingId, bookings.id)).where(where).orderBy(desc(payments.createdAt)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(payments).where(where)]);
  res.json({ items: rows.map(({ payment, booking }) => ({ id: payment.id, bookingReference: booking?.reference ?? null, amount: numberValue(payment.amount) ?? 0, currency: payment.currency, status: payment.status, provider: payment.provider, providerReference: payment.providerReference, createdAt: payment.createdAt })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.get("/v1/admin/reviews", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const status = queryString(req, "status");
  const rating = queryString(req, "rating");
  const conditions = [status ? eq(reviews.status, status) : undefined, rating ? eq(reviews.rating, Number(rating)) : undefined, q ? or(ilike(reviews.title, `%${q}%`), ilike(reviews.body, `%${q}%`)) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select({ review: reviews, user: users }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(where).orderBy(desc(reviews.createdAt)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(reviews).where(where)]);
  res.json({ items: rows.map(({ review, user }) => ({ id: review.id, userName: user.displayName, entityType: review.entityType, entityId: review.entityId, rating: review.rating, title: review.title, body: review.body, status: review.status, createdAt: review.createdAt })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

router.post("/v1/admin/reviews/:id/status", async (req, res) => {
  const body = jsonBody(req);
  const status = typeof body?.status === "string" ? body.status : undefined;
  if (!status || !["pending", "published", "rejected"].includes(status)) return fail(res, 400, "INVALID_STATUS", "Provide a valid review status.");
  const updated = (await db.update(reviews).set({ status, updatedAt: new Date() }).where(eq(reviews.id, id(req))).returning())[0];
  if (!updated) return fail(res, 404, "NOT_FOUND", "Review not found.");
  await audit(req, "status_updated", "review", updated.id, { status, reason: body?.reason ?? null });
  const user = await db.query.users.findFirst({ where: eq(users.id, updated.userId) });
  res.json({ id: updated.id, userName: user?.displayName ?? null, entityType: updated.entityType, entityId: updated.entityId, rating: updated.rating, title: updated.title, body: updated.body, status: updated.status, createdAt: updated.createdAt });
});

router.post("/v1/admin/notifications", async (req, res) => {
  const body = jsonBody(req);
  if (typeof body?.title !== "string" || typeof body.body !== "string" || typeof body.type !== "string") return fail(res, 400, "INVALID_INPUT", "Type, title, and body are required.");
  const recipients = await db.select({ id: users.id }).from(users).where(eq(users.status, "active"));
  if (recipients.length) await db.insert(notifications).values(recipients.map((recipient) => ({ userId: recipient.id, type: body.type as string, title: body.title as string, body: body.body as string, status: "sent" })));
  await audit(req, "created", "notification", "broadcast", { type: body.type, recipientCount: recipients.length });
  res.status(201).json({ created: recipients.length, message: recipients.length ? `Announcement queued for ${recipients.length} active users.` : "No active users were eligible for this announcement." });
});

router.get("/v1/admin/audit-logs", async (req, res) => {
  const page = pageFrom(req);
  const q = queryString(req, "q");
  const conditions = [q ? or(ilike(adminAuditLogs.action, `%${q}%`), ilike(adminAuditLogs.entityType, `%${q}%`), ilike(adminAuditLogs.entityId, `%${q}%`)) : undefined].filter(Boolean) as any[];
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([db.select({ log: adminAuditLogs, admin: users }).from(adminAuditLogs).innerJoin(users, eq(adminAuditLogs.adminUserId, users.id)).where(where).orderBy(desc(adminAuditLogs.createdAt)).limit(page.limit).offset(page.offset), db.select({ value: sql<number>`count(*)` }).from(adminAuditLogs).where(where)]);
  res.json({ items: rows.map(({ log, admin }) => ({ id: log.id, adminUserId: log.adminUserId, adminName: admin.displayName, action: log.action, entityType: log.entityType, entityId: log.entityId, metadata: log.metadata ?? {}, createdAt: log.createdAt })), meta: pageMeta(page, Number(totalRows[0]?.value ?? 0)) });
});

  return router;
}

export default createAdminRouter();