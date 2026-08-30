import { Router, type IRouter, type Request, type RequestHandler, type Response } from "express";
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, sql } from "drizzle-orm";
import {
  bookingItems,
  bookings,
  db,
  destinations,
  hotelRooms,
  hotels,
  roomAvailability,
  vendorAuditLogs,
  vendorProfiles,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth.ts";
import { requireApprovedVendor, requireRole } from "../middlewares/authorization.ts";
import { dateRange, isDate, parseInteger, parseNumber, parseString, parseStringArray } from "./vendor-portal-logic.ts";

export { dateRange, isDate, parseInteger, parseNumber, parseString, parseStringArray } from "./vendor-portal-logic.ts";

const vendorPortalRoutes: IRouter = Router();

function value(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function bodyRecord(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
}

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function jsonStrings(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
}

function serializeHotel(hotel: typeof hotels.$inferSelect) {
  return {
    id: hotel.id,
    catalogId: hotel.catalogId,
    name: hotel.name,
    description: hotel.description,
    propertyType: hotel.propertyType ?? "hotel",
    address: hotel.address,
    city: hotel.city,
    state: hotel.state,
    country: hotel.country,
    postalCode: hotel.postalCode,
    latitude: hotel.latitude === null ? null : Number(hotel.latitude),
    longitude: hotel.longitude === null ? null : Number(hotel.longitude),
    contactPhone: hotel.contactPhone,
    contactEmail: hotel.contactEmail,
    website: hotel.website,
    amenities: jsonStrings(hotel.amenities),
    imageUrls: jsonStrings(hotel.imageUrls),
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    status: hotel.status,
    approvalStatus: hotel.approvalStatus,
    createdAt: hotel.createdAt.toISOString(),
    updatedAt: hotel.updatedAt.toISOString(),
  };
}

function serializeRoom(room: typeof hotelRooms.$inferSelect) {
  return {
    id: room.id,
    hotelId: room.hotelId,
    catalogRoomId: room.catalogRoomId,
    name: room.name,
    bedType: room.bedType,
    capacity: room.capacity,
    totalUnits: room.totalUnits,
    nightlyRate: Number(room.nightlyRate),
    currency: room.currency,
    amenities: jsonStrings(room.amenities),
    imageUrls: jsonStrings(room.imageUrls),
    status: room.status,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

type HotelInput = {
  name: string;
  description: string | null;
  propertyType: string | null;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  amenities: string[];
  imageUrls: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
};

function parseHotelInput(input: unknown, partial = false): HotelInput | Partial<HotelInput> | null {
  const body = bodyRecord(input);
  if (!body) return null;
  const parsed: Partial<HotelInput> = {};
  const requiredStrings = ["name", "address"] as const;
  for (const field of requiredStrings) {
    if (body[field] !== undefined) {
      const parsedValue = parseString(body[field], field === "name" ? 200 : 500);
      if (parsedValue === undefined || parsedValue === null) return null;
      parsed[field] = parsedValue;
    }
  }
  const nullableStrings = [
    ["description", 4000],
    ["propertyType", 80],
    ["city", 120],
    ["state", 120],
    ["country", 120],
    ["postalCode", 30],
    ["contactPhone", 40],
    ["contactEmail", 320],
    ["website", 500],
    ["checkInTime", 20],
    ["checkOutTime", 20],
  ] as const;
  for (const [field, maxLength] of nullableStrings) {
    if (body[field] !== undefined) {
      const parsedValue = parseString(body[field], maxLength, true);
      if (parsedValue === undefined) return null;
      parsed[field] = parsedValue;
    }
  }
  if (body.latitude !== undefined || body.longitude !== undefined) {
    const latitude = parseNumber(body.latitude, -90, 90);
    const longitude = parseNumber(body.longitude, -180, 180);
    if (body.latitude !== null && latitude === undefined) return null;
    if (body.longitude !== null && longitude === undefined) return null;
    if (body.latitude !== undefined) parsed.latitude = body.latitude === null ? null : latitude!;
    if (body.longitude !== undefined) parsed.longitude = body.longitude === null ? null : longitude!;
  }
  if (body.amenities !== undefined) {
    const amenities = parseStringArray(body.amenities);
    if (!amenities) return null;
    parsed.amenities = amenities;
  }
  if (body.imageUrls !== undefined) {
    const imageUrls = parseStringArray(body.imageUrls, 20);
    if (!imageUrls) return null;
    parsed.imageUrls = imageUrls;
  }
  if (!partial && (
    !parsed.name ||
    !parsed.address
  )) return null;
  if (partial && Object.keys(parsed).length === 0) return null;
  return parsed;
}

type RoomInput = {
  name: string;
  bedType: string | null;
  capacity: number;
  totalUnits: number;
  nightlyRate: number;
  currency: string;
  amenities: string[];
  imageUrls: string[];
};

function parseRoomInput(input: unknown, partial = false): RoomInput | Partial<RoomInput> | null {
  const body = bodyRecord(input);
  if (!body) return null;
  const parsed: Partial<RoomInput> = {};
  if (body.name !== undefined) {
    const name = parseString(body.name, 160);
    if (name === undefined || name === null) return null;
    parsed.name = name;
  }
  if (body.bedType !== undefined) {
    const bedType = parseString(body.bedType, 120, true);
    if (bedType === undefined) return null;
    parsed.bedType = bedType;
  }
  if (body.capacity !== undefined) {
    const capacity = parseInteger(body.capacity, 1, 50);
    if (capacity === undefined) return null;
    parsed.capacity = capacity;
  }
  if (body.totalUnits !== undefined) {
    const totalUnits = parseInteger(body.totalUnits, 1, 10000);
    if (totalUnits === undefined) return null;
    parsed.totalUnits = totalUnits;
  }
  if (body.nightlyRate !== undefined) {
    const nightlyRate = parseNumber(body.nightlyRate, 0, 10_000_000);
    if (nightlyRate === undefined) return null;
    parsed.nightlyRate = Math.round(nightlyRate * 100) / 100;
  }
  if (body.currency !== undefined) {
    const currency = parseString(body.currency, 3);
    if (!currency || !/^[A-Za-z]{3}$/.test(currency)) return null;
    parsed.currency = currency.toUpperCase();
  }
  if (body.amenities !== undefined) {
    const amenities = parseStringArray(body.amenities);
    if (!amenities) return null;
    parsed.amenities = amenities;
  }
  if (body.imageUrls !== undefined) {
    const imageUrls = parseStringArray(body.imageUrls, 20);
    if (!imageUrls) return null;
    parsed.imageUrls = imageUrls;
  }
  if (!partial && (!parsed.name || parsed.capacity === undefined || parsed.totalUnits === undefined || parsed.nightlyRate === undefined)) return null;
  if (partial && Object.keys(parsed).length === 0) return null;
  return parsed;
}

async function ownedHotel(req: Request, id: string) {
  return db.query.hotels.findFirst({ where: and(eq(hotels.id, id), eq(hotels.ownerId, req.localUser!.id)) });
}

async function ownedRoom(req: Request, id: string) {
  const result = await db
    .select({ room: hotelRooms, hotel: hotels })
    .from(hotelRooms)
    .innerJoin(hotels, eq(hotels.id, hotelRooms.hotelId))
    .where(and(eq(hotelRooms.id, id), eq(hotels.ownerId, req.localUser!.id)));
  return result[0] ?? null;
}

async function audit(vendorId: string, entityType: string, entityId: string, action: string, metadata?: Record<string, unknown>) {
  await db.insert(vendorAuditLogs).values({ vendorId, entityType, entityId, action, metadata: metadata ?? null });
}

vendorPortalRoutes.get("/v1/vendor/dashboard", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const vendorId = req.localUser!.id;
  const [hotelCount, publishedCount, roomCount, bookingCount, profile] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(hotels).where(eq(hotels.ownerId, vendorId)),
    db.select({ count: sql<number>`count(*)` }).from(hotels).where(and(eq(hotels.ownerId, vendorId), eq(hotels.status, "published"), eq(hotels.approvalStatus, "approved"))),
    db.select({ count: sql<number>`count(*)` }).from(hotelRooms).innerJoin(hotels, eq(hotelRooms.hotelId, hotels.id)).where(and(eq(hotels.ownerId, vendorId), eq(hotelRooms.status, "active"))),
    db.select({ count: sql<number>`count(distinct ${bookings.id})` }).from(bookings).innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id)).innerJoin(hotelRooms, eq(hotelRooms.id, bookingItems.roomId)).innerJoin(hotels, eq(hotels.id, hotelRooms.hotelId)).where(and(eq(hotels.ownerId, vendorId), inArray(bookings.status, ["pending_payment", "confirmed"]))),
    db.query.vendorProfiles.findFirst({ where: eq(vendorProfiles.userId, vendorId) }),
  ]);
  res.json({
    role: "vendor",
    status: profile?.status ?? "pending",
    title: "Vendor dashboard",
    message: "Manage your approved accommodation inventory and keep availability accurate.",
    stats: {
      hotels: Number(hotelCount[0]?.count ?? 0),
      publishedHotels: Number(publishedCount[0]?.count ?? 0),
      activeRooms: Number(roomCount[0]?.count ?? 0),
      activeBookings: Number(bookingCount[0]?.count ?? 0),
    },
  });
});

vendorPortalRoutes.get("/v1/vendor/profile", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const profile = await db.query.vendorProfiles.findFirst({ where: eq(vendorProfiles.userId, req.localUser!.id) });
  if (!profile) {
    sendError(res, 404, "VENDOR_PROFILE_NOT_FOUND", "A vendor profile has not been submitted.");
    return;
  }
  res.json({
    ...profile,
    status: profile.status,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
});

vendorPortalRoutes.patch("/v1/vendor/profile", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const body = bodyRecord(req.body);
  if (!body) {
    sendError(res, 400, "INVALID_PROFILE", "Profile details need attention.");
    return;
  }
  const fields = ["businessName", "businessType", "contactName", "phone", "email", "description", "address", "city", "state", "country"] as const;
  const updates: Record<string, string> = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      const parsed = parseString(body[field], field === "description" ? 4000 : field === "email" ? 320 : 240);
      if (!parsed) {
        sendError(res, 400, "INVALID_PROFILE", `${field} must be a non-empty value.`);
        return;
      }
      updates[field] = parsed;
    }
  }
  if (!Object.keys(updates).length) {
    sendError(res, 400, "INVALID_PROFILE", "Provide at least one profile field to update.");
    return;
  }
  const [updated] = await db.update(vendorProfiles).set({ ...updates, updatedAt: new Date() }).where(eq(vendorProfiles.userId, req.localUser!.id)).returning();
  if (!updated) {
    sendError(res, 404, "VENDOR_PROFILE_NOT_FOUND", "A vendor profile has not been submitted.");
    return;
  }
  await audit(req.localUser!.id, "vendor_profile", updated.id, "updated", { fields: Object.keys(updates) });
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

vendorPortalRoutes.get("/v1/vendor/hotels", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const page = parseInteger(req.query.page, 1, 100000) ?? 1;
  const limit = parseInteger(req.query.limit, 1, 50) ?? 20;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const conditions = [eq(hotels.ownerId, req.localUser!.id)];
  if (status && ["draft", "published", "archived"].includes(status)) conditions.push(eq(hotels.status, status));
  const [items, total] = await Promise.all([
    db.select().from(hotels).where(and(...conditions)).orderBy(desc(hotels.updatedAt)).limit(limit).offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)` }).from(hotels).where(and(...conditions)),
  ]);
  res.json({ items: items.map(serializeHotel), page, limit, total: Number(total[0]?.count ?? 0) });
});

vendorPortalRoutes.post("/v1/vendor/hotels", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const input = parseHotelInput(req.body);
  if (!input || !("name" in input) || !("address" in input)) {
    sendError(res, 400, "INVALID_HOTEL", "Hotel name and address are required.");
    return;
  }
  const hotelInput = input as HotelInput;
  const [hotel] = await db.insert(hotels).values({
    name: hotelInput.name,
    description: hotelInput.description,
    propertyType: hotelInput.propertyType,
    address: hotelInput.address,
    city: hotelInput.city,
    state: hotelInput.state,
    country: hotelInput.country,
    postalCode: hotelInput.postalCode,
    latitude: hotelInput.latitude === null ? null : String(hotelInput.latitude),
    longitude: hotelInput.longitude === null ? null : String(hotelInput.longitude),
    contactPhone: hotelInput.contactPhone,
    contactEmail: hotelInput.contactEmail,
    website: hotelInput.website,
    amenities: hotelInput.amenities,
    imageUrls: hotelInput.imageUrls,
    checkInTime: hotelInput.checkInTime,
    checkOutTime: hotelInput.checkOutTime,
    ownerId: req.localUser!.id,
    status: "draft",
    approvalStatus: "pending",
  }).returning();
  await audit(req.localUser!.id, "hotel", hotel.id, "created");
  res.status(201).json(serializeHotel(hotel));
});

vendorPortalRoutes.get("/v1/vendor/hotels/:id", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const hotel = await ownedHotel(req, value(req.params.id));
  if (!hotel) {
    sendError(res, 404, "HOTEL_NOT_FOUND", "Hotel not found.");
    return;
  }
  res.json(serializeHotel(hotel));
});

vendorPortalRoutes.patch("/v1/vendor/hotels/:id", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const hotel = await ownedHotel(req, value(req.params.id));
  if (!hotel) {
    sendError(res, 404, "HOTEL_NOT_FOUND", "Hotel not found.");
    return;
  }
  if (hotel.status === "archived") {
    sendError(res, 409, "HOTEL_STATE_INVALID", "Archived hotels cannot be edited.");
    return;
  }
  const input = parseHotelInput(req.body, true);
  if (!input) {
    sendError(res, 400, "INVALID_HOTEL", "Provide at least one valid hotel field.");
    return;
  }
  const hotelUpdate = input as Partial<HotelInput>;
  const updateValues = {
    ...hotelUpdate,
    ...(hotelUpdate.latitude !== undefined ? { latitude: hotelUpdate.latitude === null ? null : String(hotelUpdate.latitude) } : {}),
    ...(hotelUpdate.longitude !== undefined ? { longitude: hotelUpdate.longitude === null ? null : String(hotelUpdate.longitude) } : {}),
    updatedAt: new Date(),
  };
  const [updated] = await db.update(hotels).set(updateValues as any).where(and(eq(hotels.id, hotel.id), eq(hotels.ownerId, req.localUser!.id))).returning();
  await audit(req.localUser!.id, "hotel", hotel.id, "updated", { fields: Object.keys(input) });
  res.json(serializeHotel(updated));
});

vendorPortalRoutes.post("/v1/vendor/hotels/:id/submit", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const hotel = await ownedHotel(req, value(req.params.id));
  if (!hotel) {
    sendError(res, 404, "HOTEL_NOT_FOUND", "Hotel not found.");
    return;
  }
  if (hotel.status !== "draft" || hotel.approvalStatus === "approved") {
    sendError(res, 409, "HOTEL_STATE_INVALID", "Only draft hotels awaiting review can be submitted.");
    return;
  }
  const [updated] = await db.update(hotels).set({ approvalStatus: "pending", updatedAt: new Date() }).where(and(eq(hotels.id, hotel.id), eq(hotels.ownerId, req.localUser!.id))).returning();
  await audit(req.localUser!.id, "hotel", hotel.id, "submitted_for_approval");
  res.json(serializeHotel(updated));
});

vendorPortalRoutes.post("/v1/vendor/hotels/:id/archive", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const hotel = await ownedHotel(req, value(req.params.id));
  if (!hotel) {
    sendError(res, 404, "HOTEL_NOT_FOUND", "Hotel not found.");
    return;
  }
  const [updated] = await db.update(hotels).set({ status: "archived", updatedAt: new Date() }).where(and(eq(hotels.id, hotel.id), eq(hotels.ownerId, req.localUser!.id))).returning();
  await audit(req.localUser!.id, "hotel", hotel.id, "archived");
  res.json(serializeHotel(updated));
});

vendorPortalRoutes.get("/v1/vendor/rooms", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const conditions = [eq(hotels.ownerId, req.localUser!.id)];
  if (typeof req.query.hotelId === "string") conditions.push(eq(hotelRooms.hotelId, req.query.hotelId));
  if (typeof req.query.status === "string" && ["active", "inactive"].includes(req.query.status)) conditions.push(eq(hotelRooms.status, req.query.status));
  const rows = await db.select({ room: hotelRooms }).from(hotelRooms).innerJoin(hotels, eq(hotels.id, hotelRooms.hotelId)).where(and(...conditions)).orderBy(desc(hotelRooms.updatedAt));
  res.json({ items: rows.map(({ room }) => serializeRoom(room)) });
});

vendorPortalRoutes.post("/v1/vendor/hotels/:hotelId/rooms", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const hotel = await ownedHotel(req, value(req.params.hotelId));
  if (!hotel) {
    sendError(res, 404, "HOTEL_NOT_FOUND", "Hotel not found.");
    return;
  }
  const input = parseRoomInput(req.body);
  if (!input || !("name" in input) || input.capacity === undefined || input.totalUnits === undefined || input.nightlyRate === undefined) {
    sendError(res, 400, "INVALID_ROOM", "Room name, capacity, total units, and nightly rate are required.");
    return;
  }
  const roomInput = input as RoomInput;
  const [room] = await db.insert(hotelRooms).values({
    name: roomInput.name,
    bedType: roomInput.bedType,
    capacity: roomInput.capacity,
    totalUnits: roomInput.totalUnits,
    nightlyRate: String(roomInput.nightlyRate),
    currency: roomInput.currency ?? "INR",
    amenities: roomInput.amenities ?? [],
    imageUrls: roomInput.imageUrls ?? [],
    hotelId: hotel.id,
    status: "active",
  }).returning();
  await audit(req.localUser!.id, "room", room.id, "created", { hotelId: hotel.id });
  res.status(201).json(serializeRoom(room));
});

vendorPortalRoutes.get("/v1/vendor/rooms/:id", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const result = await ownedRoom(req, value(req.params.id));
  if (!result) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found.");
    return;
  }
  res.json(serializeRoom(result.room));
});

vendorPortalRoutes.patch("/v1/vendor/rooms/:id", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const result = await ownedRoom(req, value(req.params.id));
  if (!result) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found.");
    return;
  }
  const input = parseRoomInput(req.body, true);
  if (!input) {
    sendError(res, 400, "INVALID_ROOM", "Provide at least one valid room field.");
    return;
  }
  const roomUpdate = input as Partial<RoomInput>;
  const updateValues = {
    ...roomUpdate,
    ...(roomUpdate.nightlyRate !== undefined ? { nightlyRate: String(roomUpdate.nightlyRate) } : {}),
    updatedAt: new Date(),
  };
  const [updated] = await db.update(hotelRooms).set(updateValues as any).where(eq(hotelRooms.id, result.room.id)).returning();
  await audit(req.localUser!.id, "room", result.room.id, "updated", { fields: Object.keys(input) });
  res.json(serializeRoom(updated));
});

async function updateRoomStatus(req: Request, res: Response, status: "active" | "inactive"): Promise<void> {
  if (!(await requireApprovedVendor(req, res))) return;
  const result = await ownedRoom(req, value(req.params.id));
  if (!result) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found.");
    return;
  }
  const [updated] = await db.update(hotelRooms).set({ status, updatedAt: new Date() }).where(eq(hotelRooms.id, result.room.id)).returning();
  await audit(req.localUser!.id, "room", result.room.id, status === "inactive" ? "deactivated" : "activated");
  res.json(serializeRoom(updated));
}

vendorPortalRoutes.post("/v1/vendor/rooms/:id/activate", (req, res) => updateRoomStatus(req, res, "active"));
vendorPortalRoutes.post("/v1/vendor/rooms/:id/deactivate", (req, res) => updateRoomStatus(req, res, "inactive"));

vendorPortalRoutes.get("/v1/vendor/availability", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const roomId = typeof req.query.roomId === "string" ? req.query.roomId : "";
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";
  if (!roomId || !isDate(from) || !isDate(to) || from >= to || dateRange(from, to).length > 90) {
    sendError(res, 400, "INVALID_AVAILABILITY_RANGE", "Provide a valid date range of up to 90 nights.");
    return;
  }
  const result = await ownedRoom(req, roomId);
  if (!result) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found.");
    return;
  }
  const rows = await db.select().from(roomAvailability).where(and(eq(roomAvailability.roomId, roomId), gte(roomAvailability.date, from), lt(roomAvailability.date, to))).orderBy(asc(roomAvailability.date));
  const records = new Map(rows.map((row) => [row.date, row]));
  const items = dateRange(from, to).map((dateValue) => {
    const row = records.get(dateValue);
    return {
      date: dateValue,
      availableUnits: row?.availableUnits ?? result.room.totalUnits,
      totalUnits: result.room.totalUnits,
      priceOverride: row?.priceOverride === null || row?.priceOverride === undefined ? null : Number(row.priceOverride),
      status: row?.status ?? "available",
      blackoutReason: row?.blackoutReason ?? null,
    };
  });
  res.json({ roomId, hotelId: result.room.hotelId, from, to, items });
});

vendorPortalRoutes.put("/v1/vendor/availability", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const body = bodyRecord(req.body);
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const dateValue = typeof body?.date === "string" ? body.date : "";
  const result = roomId ? await ownedRoom(req, roomId) : null;
  if (!result) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found.");
    return;
  }
  if (!isDate(dateValue)) {
    sendError(res, 400, "INVALID_AVAILABILITY", "Availability date must be a real YYYY-MM-DD date.");
    return;
  }
  const status = body?.status === "blackout" ? "blackout" : "available";
  const availableUnits = status === "blackout" ? 0 : parseInteger(body?.availableUnits, 0, result.room.totalUnits);
  if (availableUnits === undefined) {
    sendError(res, 400, "INVALID_AVAILABILITY", `Available units must be between 0 and ${result.room.totalUnits}.`);
    return;
  }
  const priceOverride = body?.priceOverride === null || body?.priceOverride === undefined ? null : parseNumber(body.priceOverride, 0, 10_000_000);
  if (body?.priceOverride !== null && body?.priceOverride !== undefined && priceOverride === undefined) {
    sendError(res, 400, "INVALID_AVAILABILITY", "Price override must be a non-negative amount.");
    return;
  }
  const blackoutReason = status === "blackout" ? parseString(body?.blackoutReason, 240, true) ?? "Unavailable" : null;
  const saved = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${roomId}), hashtext(${dateValue}))`);
    const [reserved] = await tx.select({ quantity: sql<number>`coalesce(sum(${bookingItems.quantity}), 0)` })
      .from(bookingItems)
      .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
      .where(and(
        eq(bookingItems.roomId, roomId),
        inArray(bookings.status, ["pending_payment", "confirmed"]),
        lte(bookings.startsOn, dateValue),
        gt(bookings.endsOn, dateValue),
      ));
    const reservedCount = Number(reserved?.quantity ?? 0);
    if (availableUnits < reservedCount) throw new Error(`This date already has ${reservedCount} reserved unit(s).`);
    const [upserted] = await tx.insert(roomAvailability).values({
      roomId,
      date: dateValue,
      availableUnits,
      priceOverride: priceOverride === null ? null : String(priceOverride),
      status,
      blackoutReason,
    }).onConflictDoUpdate({
      target: [roomAvailability.roomId, roomAvailability.date],
      set: { availableUnits, priceOverride: priceOverride === null ? null : String(priceOverride), status, blackoutReason, updatedAt: new Date() },
    }).returning();
    return { upserted, reservedCount };
  }).catch((error) => {
    sendError(res, 409, "AVAILABILITY_CONFLICT", error instanceof Error ? error.message : "Availability changed before it could be saved.");
    return null;
  });
  if (!saved) return;
  await audit(req.localUser!.id, "room_availability", saved.upserted.id, "updated", { roomId, date: dateValue, status });
  res.json({
    date: saved.upserted.date,
    availableUnits: saved.upserted.availableUnits,
    totalUnits: result.room.totalUnits,
    priceOverride: saved.upserted.priceOverride === null ? null : Number(saved.upserted.priceOverride),
    status: saved.upserted.status,
    blackoutReason: saved.upserted.blackoutReason,
    reservedUnits: saved.reservedCount,
  });
});

vendorPortalRoutes.get("/v1/vendor/bookings", async (req, res): Promise<void> => {
  if (!(await requireApprovedVendor(req, res))) return;
  const page = parseInteger(req.query.page, 1, 100000) ?? 1;
  const limit = parseInteger(req.query.limit, 1, 50) ?? 20;
  const conditions = [eq(hotels.ownerId, req.localUser!.id)];
  if (typeof req.query.status === "string" && ["pending_payment", "confirmed", "cancelled"].includes(req.query.status)) conditions.push(eq(bookings.status, req.query.status));
  if (typeof req.query.hotelId === "string") conditions.push(eq(hotels.id, req.query.hotelId));
  const rows = await db.select({ booking: bookings, item: bookingItems, room: hotelRooms, hotel: hotels })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(hotelRooms, eq(hotelRooms.id, bookingItems.roomId))
    .innerJoin(hotels, eq(hotels.id, hotelRooms.hotelId))
    .where(and(...conditions))
    .orderBy(desc(bookings.startsOn), desc(bookings.createdAt))
    .limit(limit * 10)
    .offset((page - 1) * limit * 10);
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) grouped.set(row.booking.id, [...(grouped.get(row.booking.id) ?? []), row]);
  const items = [...grouped.values()].slice(0, limit).map((group) => {
    const first = group[0];
    return {
      reference: first.booking.reference,
      hotel: { id: first.hotel.id, name: first.hotel.name },
      startsOn: first.booking.startsOn,
      endsOn: first.booking.endsOn,
      adults: first.booking.adults,
      children: first.booking.children,
      guestCount: first.booking.guestCount,
      roomCount: first.booking.roomCount,
      guest: { name: first.booking.guestName, email: first.booking.guestEmail },
      items: group.map((row) => ({ roomName: row.room.name, quantity: row.item.quantity })),
      total: Number(first.booking.totalAmount),
      currency: first.booking.currency,
      status: first.booking.status,
      createdAt: first.booking.createdAt.toISOString(),
    };
  });
  res.json({ items, page, limit, total: items.length });
});

export function createVendorPortalRouter(authMiddleware: RequestHandler = requireAuth): IRouter {
  const vendorPortalRouter: IRouter = Router();
  vendorPortalRouter.use(authMiddleware, requireRole("vendor"), vendorPortalRoutes);
  return vendorPortalRouter;
}

export default createVendorPortalRouter();