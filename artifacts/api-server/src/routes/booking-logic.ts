export type BookingRequest = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  items: Array<{ roomId: string; quantity: number }>;
  guest: { name: string; email: string; phone: string | null };
};

export type BookingValidationResult =
  | { success: true; data: BookingRequest }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function isRealCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayIso(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function calculateBookingNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateString(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return "";
}

export function parseBookingInput(raw: unknown, now = new Date()): BookingValidationResult {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const guest = value.guest && typeof value.guest === "object" ? value.guest as Record<string, unknown> : {};
  const hotelId = text(value.hotelId);
  const checkIn = dateString(value.checkIn);
  const checkOut = dateString(value.checkOut);
  const adults = Number(value.adults);
  const children = Number(value.children);
  const rooms = Number(value.rooms);
  const items = Array.isArray(value.items)
    ? value.items.map((item) => {
      const candidate = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return { roomId: text(candidate.roomId), quantity: Number(candidate.quantity) };
    })
    : [];
  const guestName = text(guest.name);
  const guestEmail = text(guest.email).toLowerCase();
  const guestPhone = guest.phone === null || guest.phone === undefined ? null : text(guest.phone);
  const fieldErrors: Record<string, string> = {};

  if (!hotelId) fieldErrors.hotelId = "Hotel is required.";
  if (!isRealCalendarDate(checkIn)) fieldErrors.checkIn = "Check-in must be a real YYYY-MM-DD date.";
  if (!isRealCalendarDate(checkOut)) fieldErrors.checkOut = "Check-out must be a real YYYY-MM-DD date.";
  if (isRealCalendarDate(checkIn) && isRealCalendarDate(checkOut) && checkOut <= checkIn) {
    fieldErrors.checkOut = "Check-out must be after check-in.";
  }
  if (isRealCalendarDate(checkIn) && checkIn < todayIso(now)) fieldErrors.checkIn = "Check-in must be a future date.";
  if (isRealCalendarDate(checkOut) && checkOut < todayIso(now) && !fieldErrors.checkOut) fieldErrors.checkOut = "Check-out must be a future date.";
  if (!Number.isInteger(adults) || adults < 1 || adults > 40) fieldErrors.adults = "Adults must be between 1 and 40.";
  if (!Number.isInteger(children) || children < 0 || children > 40) fieldErrors.children = "Children must be between 0 and 40.";
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 20) fieldErrors.rooms = "Rooms must be between 1 and 20.";
  if (!items.length) fieldErrors.items = "Select at least one room.";
  if (items.some((item) => !item.roomId)) fieldErrors.items = "Every selected room must be valid.";
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    fieldErrors.items = "Room quantities must be positive whole numbers.";
  }
  if (new Set(items.map((item) => item.roomId)).size !== items.length) fieldErrors.items = "A room may only be selected once.";
  if (Number.isInteger(rooms) && items.reduce((sum, item) => sum + item.quantity, 0) !== rooms) {
    fieldErrors.rooms = "Selected room quantities must match the requested room count.";
  }
  if (guestName.length < 2 || guestName.length > 120) fieldErrors["guest.name"] = "Guest name must be between 2 and 120 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) || guestEmail.length > 320) fieldErrors["guest.email"] = "Enter a valid guest email.";
  if (guestPhone && guestPhone.length > 40) fieldErrors["guest.phone"] = "Phone number is too long.";

  if (Object.keys(fieldErrors).length) {
    return { success: false, error: "Booking details need attention.", fieldErrors };
  }

  return {
    success: true,
    data: {
      hotelId,
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
      items,
      guest: { name: guestName, email: guestEmail, phone: guestPhone },
    },
  };
}

export type BookingRoomPrice = {
  roomId: string;
  name: string;
  capacity: number;
  nightlyRate: number;
  currency: string;
  quantity: number;
};

export function calculateBookingPricing(input: BookingRequest, rooms: BookingRoomPrice[]) {
  const nights = calculateBookingNights(input.checkIn, input.checkOut);
  const byId = new Map(rooms.map((room) => [room.roomId, room]));
  const items = input.items.map((item) => {
    const room = byId.get(item.roomId);
    if (!room) throw new Error("Selected room is no longer available.");
    const roomTotal = Math.round(room.nightlyRate * nights * item.quantity * 100) / 100;
    return {
      roomId: room.roomId,
      name: room.name,
      quantity: item.quantity,
      nightlyRate: room.nightlyRate,
      roomTotal,
      currency: room.currency,
    };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.roomTotal, 0) * 100) / 100;
  return { nights, items, total, currency: items[0]?.currency ?? "INR" };
}

export function canCancelBooking(status: string, startsOn: string, now = new Date()) {
  return status === "pending_payment" && startsOn > todayIso(now);
}