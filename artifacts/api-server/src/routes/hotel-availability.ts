import { getHotelCatalogRecord } from "./hotel-catalog.ts";
import { and, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";
import { bookingItems, bookings, db, hotelRooms, hotels, roomAvailability } from "@workspace/db";
import {
  developmentInventoryProvenance,
  inventoryOffersEnabled,
  unavailableInventoryProvenance,
  vendorInventoryProvenance,
} from "./hotel-inventory-policy.ts";

export type HotelAvailabilityInput = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
};

type DevelopmentRoom = {
  id: string;
  name: string;
  imageKey: string;
  bedType: string;
  capacity: number;
  amenities: string[];
  availableUnits: number;
  nightlyRate: number;
  currency: string;
};

export const availabilityDevelopmentNotice =
  "Development availability preview only. It is server-owned sample inventory, not a live supplier offer or booking confirmation.";

const developmentInventory: Record<string, DevelopmentRoom[]> = {
  "01": [
    {
      id: "01-garden-room",
      name: "Garden Room",
      imageKey: "coastline",
      bedType: "1 king bed",
      capacity: 2,
      amenities: ["Breakfast", "Garden view", "Wi-Fi"],
      availableUnits: 3,
      nightlyRate: 7800,
      currency: "INR",
    },
    {
      id: "01-family-suite",
      name: "Family Suite",
      imageKey: "coastline",
      bedType: "1 king bed · 2 single beds",
      capacity: 4,
      amenities: ["Breakfast", "Living area", "Wi-Fi"],
      availableUnits: 2,
      nightlyRate: 12200,
      currency: "INR",
    },
  ],
  "02": [],
};

export function getDevelopmentRoom(hotelId: string, roomId: string) {
  return developmentInventory[hotelId]?.find((room) => room.id === roomId) ?? null;
}

function isRealCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayIso(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function calculateNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function parseHotelAvailabilityInput(
  rawQuery: Record<string, unknown>,
  now = new Date(),
): HotelAvailabilityInput | { error: string } {
  const checkIn = typeof rawQuery.checkIn === "string" ? rawQuery.checkIn : "";
  const checkOut = typeof rawQuery.checkOut === "string" ? rawQuery.checkOut : "";
  const adults = Number(rawQuery.adults);
  const children = Number(rawQuery.children);
  const rooms = Number(rawQuery.rooms);

  if (!checkIn || !checkOut) return { error: "Check-in and check-out dates are required." };
  if (!isRealCalendarDate(checkIn) || !isRealCalendarDate(checkOut)) {
    return { error: "Dates must be real YYYY-MM-DD calendar dates." };
  }
  if (checkOut <= checkIn) return { error: "Check-out must be after check-in." };
  if (checkIn < todayIso(now)) return { error: "Check-in must be a future date." };
  if (checkOut < todayIso(now)) return { error: "Check-out must be a future date." };
  if (!Number.isInteger(adults) || adults < 1) return { error: "Adults must be at least 1." };
  if (!Number.isInteger(children) || children < 0) return { error: "Children cannot be negative." };
  if (!Number.isInteger(rooms) || rooms < 1) return { error: "Rooms must be at least 1." };
  if (adults + children > 40) return { error: "The traveller count is too high for one request." };

  return { checkIn, checkOut, adults, children, rooms };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function getHotelAvailability(
  id: string,
  input: HotelAvailabilityInput,
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
) {
  const hotel = getHotelCatalogRecord(id);
  if (!hotel) return null;

  const nights = calculateNights(input.checkIn, input.checkOut);
  if (!inventoryOffersEnabled(env)) {
    return {
      hotelId: id,
      status: "unavailable" as const,
      notice: "Live supplier availability is not configured. No rooms or prices are being offered.",
      source: "unavailable" as const,
      sourceLabel: "Live inventory unavailable",
      sourceNotice: "A managed live inventory connection is required before production availability can be offered.",
      provenance: unavailableInventoryProvenance(now),
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults: input.adults,
      children: input.children,
      rooms: input.rooms,
      items: [],
      roomSubtotal: 0,
      total: 0,
      currency: "INR",
    };
  }

  const inventory = developmentInventory[id];
  const source = inventory ? "development" as const : "unavailable" as const;
  const sourceLabel = inventory ? "Development inventory preview" : "No inventory provider";
  const sourceNotice = inventory
    ? availabilityDevelopmentNotice
    : "No availability provider is configured for this hotel. No room availability or price is being claimed.";
  const provenance = inventory
    ? developmentInventoryProvenance()
    : unavailableInventoryProvenance(now);

  if (!inventory) {
    return {
      hotelId: id,
      status: "unavailable" as const,
      notice: "Availability is not configured for this catalog hotel.",
      source,
      sourceLabel,
      sourceNotice,
      provenance,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults: input.adults,
      children: input.children,
      rooms: input.rooms,
      items: [],
      roomSubtotal: 0,
      total: 0,
      currency: "INR",
    };
  }

  const items = inventory
    .filter((room) => room.availableUnits >= input.rooms && room.capacity * input.rooms >= input.adults + input.children)
    .map((room) => ({
      ...room,
      nights,
      roomTotal: roundCurrency(room.nightlyRate * nights),
      source,
      sourceLabel,
      sourceNotice,
      provenance,
    }));

  if (!items.length) {
    return {
      hotelId: id,
      status: "no_availability" as const,
      notice: "No rooms in this development inventory match the requested travellers and dates.",
      source,
      sourceLabel,
      sourceNotice,
      provenance,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults: input.adults,
      children: input.children,
      rooms: input.rooms,
      items: [],
      roomSubtotal: 0,
      total: 0,
      currency: "INR",
    };
  }

  const lowestRate = Math.min(...items.map((room) => room.nightlyRate));
  const roomSubtotal = roundCurrency(lowestRate * nights * input.rooms);
  return {
    hotelId: id,
    status: "available" as const,
    notice: "Sample room availability is shown for planning only. Select rooms below; no booking is created.",
    source,
    sourceLabel,
    sourceNotice,
    provenance,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    adults: input.adults,
    children: input.children,
    rooms: input.rooms,
    items,
    roomSubtotal,
    total: roomSubtotal,
    currency: items[0].currency,
  };
}

export async function getManagedHotelAvailability(
  id: string,
  input: HotelAvailabilityInput,
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
) {
  if (!inventoryOffersEnabled(env)) return null;

  const hotel = await db.query.hotels.findFirst({
    where: and(
      eq(hotels.catalogId, id),
      eq(hotels.status, "published"),
      eq(hotels.approvalStatus, "approved"),
    ),
  });
  if (!hotel) return null;
  const rooms = await db.query.hotelRooms.findMany({
    where: and(eq(hotelRooms.hotelId, hotel.id), eq(hotelRooms.status, "active")),
  });
  if (!rooms.length) return null;
  const nights = calculateNights(input.checkIn, input.checkOut);
  const provenance = vendorInventoryProvenance();
  const dates = Array.from({ length: nights }, (_, index) => {
    const date = new Date(`${input.checkIn}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const items = [];
  for (const room of rooms) {
    const dailyRows = await db.select().from(roomAvailability)
      .where(and(eq(roomAvailability.roomId, room.id), inArray(roomAvailability.date, dates)));
    const byDate = new Map(dailyRows.map((row) => [row.date, row]));
    const nightlyRates: number[] = [];
    let availableUnits = room.totalUnits;
    let blocked = false;
    for (const date of dates) {
      const row = byDate.get(date);
      if (row?.status === "blackout") blocked = true;
      availableUnits = Math.min(availableUnits, row?.availableUnits ?? room.totalUnits);
      nightlyRates.push(row?.priceOverride === null || row?.priceOverride === undefined ? Number(room.nightlyRate) : Number(row.priceOverride));
      const [reserved] = await db.select({ quantity: sql<number>`coalesce(sum(${bookingItems.quantity}), 0)` })
        .from(bookingItems)
        .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
        .where(and(
          eq(bookingItems.roomId, room.id),
          inArray(bookings.status, ["pending_payment", "confirmed"]),
          lte(bookings.startsOn, date),
          gt(bookings.endsOn, date),
        ));
      availableUnits = Math.min(availableUnits, room.totalUnits - Number(reserved?.quantity ?? 0));
    }
    if (blocked || availableUnits < input.rooms || room.capacity * input.rooms < input.adults + input.children) continue;
    const nightlyRate = roundCurrency(nightlyRates.reduce((sum, rate) => sum + rate, 0) / nightlyRates.length);
    items.push({
      id: room.catalogRoomId ?? room.id,
      name: room.name,
      imageKey: "coastline",
      bedType: room.bedType ?? "Room",
      capacity: room.capacity,
      amenities: jsonStrings(room.amenities),
      availableUnits,
      nightlyRate,
      currency: room.currency,
      nights,
      roomTotal: roundCurrency(nightlyRate * nights),
      source: "vendor" as const,
      sourceLabel: "Vendor-managed inventory",
      sourceNotice: "Availability and prices were entered by an approved vendor and rechecked against local reservations. This is not live supplier inventory.",
      provenance,
    });
  }
  const base = {
    hotelId: id,
    notice: "Vendor-managed availability is shown for planning only. Select rooms below; no booking is created.",
    source: "vendor" as const,
    sourceLabel: "Vendor-managed inventory",
    sourceNotice: "Availability and prices were entered by an approved vendor and rechecked against local reservations. This is not live supplier inventory.",
    provenance,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    adults: input.adults,
    children: input.children,
    rooms: input.rooms,
    items,
    roomSubtotal: items.length ? roundCurrency(Math.min(...items.map((room) => room.nightlyRate)) * nights * input.rooms) : 0,
    total: items.length ? roundCurrency(Math.min(...items.map((room) => room.nightlyRate)) * nights * input.rooms) : 0,
    currency: rooms[0]?.currency ?? "INR",
  };
  return items.length
    ? { ...base, status: "available" as const }
    : { ...base, status: "no_availability" as const, notice: "No vendor-managed rooms match the requested dates and travellers." };
}

function jsonStrings(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
}
