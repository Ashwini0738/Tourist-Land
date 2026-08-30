import { getHotelCatalogRecord } from "./hotel-catalog.ts";

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

export function getHotelAvailability(id: string, input: HotelAvailabilityInput) {
  const hotel = getHotelCatalogRecord(id);
  if (!hotel) return null;

  const nights = calculateNights(input.checkIn, input.checkOut);
  const inventory = developmentInventory[id];
  const source = inventory ? "development" as const : "unavailable" as const;
  const sourceLabel = inventory ? "Development inventory preview" : "No inventory provider";
  const sourceNotice = inventory
    ? availabilityDevelopmentNotice
    : "No availability provider is configured for this hotel. No room availability or price is being claimed.";

  if (!inventory) {
    return {
      hotelId: id,
      status: "unavailable" as const,
      notice: "Availability is not configured for this catalog hotel.",
      source,
      sourceLabel,
      sourceNotice,
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
    }));

  if (!items.length) {
    return {
      hotelId: id,
      status: "no_availability" as const,
      notice: "No rooms in this development inventory match the requested travellers and dates.",
      source,
      sourceLabel,
      sourceNotice,
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
