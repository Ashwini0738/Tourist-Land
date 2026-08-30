import { destinations, hotels, nearby, homeNotice } from "./catalog-data.ts";
import { developmentInventoryProvenance, type InventoryProvenance } from "./hotel-inventory-policy.ts";

export type HotelCatalogRecord = (typeof hotels)[number];
export type HotelSort = "recommended" | "rating" | "price_asc" | "price_desc" | "distance";

export type HotelSearchInput = {
  q?: string;
  location?: string;
  destinationId?: string;
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  rooms: number;
  minRating?: number;
  maxPrice?: number;
  hotelType?: string;
  amenity?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page: number;
  limit: number;
  sort: HotelSort;
};

type HotelSummary = {
  id: string;
  name: string;
  location: string;
  summary: string;
  destinationId: string;
  hotelType: string;
  rating: number;
  ratingLabel: string;
  priceValue: number;
  priceLabel: string;
  imageKey: string;
  amenities: string[];
  coordinates: HotelCatalogRecord["coordinates"];
  source: "development";
  sourceLabel: string;
  sourceNotice: string;
  provenance: InventoryProvenance;
};

type HotelWithDistance = HotelSummary & { distanceKm?: number };

export const hotelDevelopmentNotice = homeNotice;

function parseRating(label: string) {
  return Number(label.match(/4\.\d/)?.[0] ?? 0);
}

function parsePrice(label: string) {
  const digits = label.replace(/[^\d]/g, "");
  return Number(digits) || 0;
}

function calculateDistanceKm(
  origin: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(point.latitude - origin.latitude);
  const longitudeDelta = toRadians(point.longitude - origin.longitude);
  const latitude = toRadians(origin.latitude);
  const pointLatitude = toRadians(point.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude) * Math.cos(pointLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function destinationName(destinationId: string) {
  return destinations.find((destination) => destination.id === destinationId)?.name ?? "";
}

export function toHotelSummary(hotel: HotelCatalogRecord): HotelSummary {
  return {
    id: hotel.id,
    name: hotel.name,
    location: hotel.location,
    summary: hotel.summary,
    destinationId: hotel.destinationId,
    hotelType: hotel.hotelType,
    rating: parseRating(hotel.ratingLabel),
    ratingLabel: hotel.ratingLabel,
    priceValue: parsePrice(hotel.priceLabel),
    priceLabel: hotel.priceLabel,
    imageKey: hotel.imageKey,
    amenities: [...hotel.amenities],
    coordinates: hotel.coordinates,
    source: "development",
    sourceLabel: "Development preview",
    sourceNotice: hotelDevelopmentNotice,
    provenance: developmentInventoryProvenance(),
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRealCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseHotelSearchInput(rawQuery: Record<string, unknown>): HotelSearchInput | { error: string } {
  const q = text(rawQuery.q) || undefined;
  const location = text(rawQuery.location) || undefined;
  const destinationId = text(rawQuery.destinationId) || undefined;
  const checkIn = typeof rawQuery.checkIn === "string" ? rawQuery.checkIn : undefined;
  const checkOut = typeof rawQuery.checkOut === "string" ? rawQuery.checkOut : undefined;
  const adults = Number(rawQuery.adults ?? 1);
  const children = Number(rawQuery.children ?? 0);
  const rooms = Number(rawQuery.rooms ?? 1);
  const minRating = rawQuery.minRating === undefined ? undefined : Number(rawQuery.minRating);
  const maxPrice = rawQuery.maxPrice === undefined ? undefined : Number(rawQuery.maxPrice);
  const latitude = rawQuery.latitude === undefined ? undefined : Number(rawQuery.latitude);
  const longitude = rawQuery.longitude === undefined ? undefined : Number(rawQuery.longitude);
  const radiusKm = rawQuery.radiusKm === undefined ? undefined : Number(rawQuery.radiusKm);
  const page = Number(rawQuery.page ?? 1);
  const limit = Number(rawQuery.limit ?? 12);
  const requestedSort = text(rawQuery.sort) || "recommended";
  const validSorts: HotelSort[] = ["recommended", "rating", "price_asc", "price_desc", "distance"];

  if (!Number.isInteger(adults) || adults < 1) return { error: "Adults must be at least 1." };
  if (!Number.isInteger(children) || children < 0) return { error: "Children cannot be negative." };
  if (!Number.isInteger(rooms) || rooms < 1) return { error: "Rooms must be at least 1." };
  if (!Number.isFinite(page) || !Number.isInteger(page) || page < 1) return { error: "Page must be at least 1." };
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1 || limit > 50) return { error: "Limit must be between 1 and 50." };
  if (!validSorts.includes(requestedSort as HotelSort)) return { error: "Sort is not supported." };
  if (minRating !== undefined && (!Number.isFinite(minRating) || minRating < 0 || minRating > 5)) return { error: "Minimum rating must be between 0 and 5." };
  if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) return { error: "Maximum price must be non-negative." };
  if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) return { error: "Latitude is invalid." };
  if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return { error: "Longitude is invalid." };
  if ((latitude === undefined) !== (longitude === undefined)) return { error: "Latitude and longitude must be provided together." };
  if (radiusKm !== undefined && (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > 500)) return { error: "Radius must be between 0 and 500 kilometres." };
  if ((checkIn && !isRealCalendarDate(checkIn)) || (checkOut && !isRealCalendarDate(checkOut))) return { error: "Dates must be real YYYY-MM-DD calendar dates." };
  if (checkIn && checkOut && checkOut <= checkIn) return { error: "Check-out must be after check-in." };
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn && checkIn < today) return { error: "Check-in must be a future date." };
  if (checkOut && checkOut < today) return { error: "Check-out must be a future date." };

  return {
    q,
    location,
    destinationId,
    checkIn,
    checkOut,
    adults,
    children,
    rooms,
    minRating,
    maxPrice,
    hotelType: text(rawQuery.hotelType) || undefined,
    amenity: text(rawQuery.amenity) || undefined,
    latitude,
    longitude,
    radiusKm,
    page,
    limit,
    sort: requestedSort as HotelSort,
  };
}

export function searchHotelCatalog(input: HotelSearchInput) {
  const origin = input.latitude !== undefined && input.longitude !== undefined
    ? { latitude: input.latitude, longitude: input.longitude }
    : undefined;
  const query = input.q;
  const filtered = hotels
    .map((hotel): HotelWithDistance => {
      const summary = toHotelSummary(hotel);
      const distanceKm = origin ? calculateDistanceKm(origin, hotel.coordinates) : undefined;
      return distanceKm === undefined ? summary : { ...summary, distanceKm };
    })
    .filter((hotel) => {
      const searchable = `${hotel.name} ${hotel.location} ${hotel.summary} ${hotel.hotelType} ${destinationName(hotel.destinationId)}`.toLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (input.location && !hotel.location.toLowerCase().includes(input.location)) return false;
      if (input.destinationId && hotel.destinationId !== input.destinationId) return false;
      if (input.minRating !== undefined && hotel.rating < input.minRating) return false;
      if (input.maxPrice !== undefined && hotel.priceValue > input.maxPrice) return false;
      if (input.hotelType && hotel.hotelType.toLowerCase() !== input.hotelType) return false;
      if (input.amenity && !hotel.amenities.some((amenity) => amenity.toLowerCase() === input.amenity)) return false;
      if (input.radiusKm !== undefined && (hotel.distanceKm === undefined || hotel.distanceKm > input.radiusKm)) return false;
      return true;
    })
    .sort((left, right) => {
      if (input.sort === "rating") return right.rating - left.rating;
      if (input.sort === "price_asc") return left.priceValue - right.priceValue;
      if (input.sort === "price_desc") return right.priceValue - left.priceValue;
      if (input.sort === "distance") return (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER);
      return right.rating - left.rating;
    });

  const offset = (input.page - 1) * input.limit;
  const items = filtered.slice(offset, offset + input.limit).map(({ distanceKm, ...hotel }) => ({
    ...hotel,
    ...(distanceKm === undefined ? {} : { distanceKm: Number(distanceKm.toFixed(1)) }),
  }));

  return {
    notice: hotelDevelopmentNotice,
    page: input.page,
    limit: input.limit,
    total: filtered.length,
    hasMore: offset + items.length < filtered.length,
    items,
  };
}

export function getHotelCatalogRecord(id: string) {
  return hotels.find((hotel) => hotel.id === id);
}

export function getHotelDetail(id: string) {
  const hotel = getHotelCatalogRecord(id);
  if (!hotel) return null;
  return {
    hotel: toHotelSummary(hotel),
    description: hotel.summary,
    address: hotel.address,
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    galleryImageKeys: [...hotel.galleryImageKeys],
    sourceNotice: hotelDevelopmentNotice,
  };
}

export function getHotelRooms(id: string) {
  if (!getHotelCatalogRecord(id)) return null;
  return {
    hotelId: id,
    notice: "Room details are not available in this development catalog. This is not a statement about live availability.",
    items: [],
  };
}

export function getHotelNearby(id: string) {
  const hotel = getHotelCatalogRecord(id);
  if (!hotel) return null;
  return {
    hotelId: id,
    notice: hotelDevelopmentNotice,
    items: nearby
      .filter((place) => place.destinationId === hotel.destinationId)
      .map((place) => ({
        id: place.id,
        name: place.name,
        category: place.category,
        location: place.location,
        summary: place.summary,
        destinationId: place.destinationId,
        imageKey: place.imageKey,
        coordinates: place.coordinates,
      })),
  };
}