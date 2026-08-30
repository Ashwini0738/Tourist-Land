import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { db, bookingItems, bookings, hotels, hotelRooms, payments } from "@workspace/db";
import { getHotelCatalogRecord } from "./hotel-catalog.ts";
import { getDevelopmentRoom, availabilityDevelopmentNotice } from "./hotel-availability.ts";
import {
  calculateBookingNights,
  calculateBookingPricing as calculatePureBookingPricing,
  canCancelBooking,
  parseBookingInput,
  type BookingRequest,
  type BookingRoomPrice,
  type BookingValidationResult,
} from "./booking-logic.ts";

export type { BookingRequest, BookingRoomPrice, BookingValidationResult } from "./booking-logic.ts";

export class BookingNotFoundError extends Error {}
export class BookingConflictError extends Error {}

export const bookingDevelopmentNotice =
  "Development booking preview only. Your booking is unpaid and does not confirm a live supplier reservation.";

export { calculateBookingNights, canCancelBooking, parseBookingInput } from "./booking-logic.ts";

function calculateBookingPricing(input: BookingRequest, rooms: BookingRoomPrice[]) {
  try {
    return calculatePureBookingPricing(input, rooms);
  } catch (error) {
    throw new BookingNotFoundError(error instanceof Error ? error.message : "Selected room is no longer available.");
  }
}

function createReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TL-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${random}`;
}

type BookingRow = typeof bookings.$inferSelect;
type BookingItemRow = typeof bookingItems.$inferSelect;
type BookingHotelRow = typeof hotels.$inferSelect;

function hotelPayload(booking: BookingRow, hotel: BookingHotelRow | null) {
  const catalog = getHotelCatalogRecord(booking.hotelCatalogId);
  return {
    id: booking.hotelCatalogId,
    name: catalog?.name ?? hotel?.name ?? "Selected hotel",
    location: catalog?.location ?? hotel?.address ?? "Selected place",
    imageKey: catalog?.imageKey ?? "coastline",
  };
}

function bookingPayload(
  booking: BookingRow,
  itemRows: Array<{ item: BookingItemRow; room: typeof hotelRooms.$inferSelect }>,
  hotel: BookingHotelRow | null,
  paymentStatus = "unpaid" as const,
) {
  const items = itemRows.map(({ item, room }) => ({
    roomId: room.catalogRoomId ?? item.id,
    name: room.name,
    quantity: item.quantity,
    nightlyRate: Number(item.unitAmount),
    roomTotal: Math.round(Number(item.unitAmount) * calculateBookingNights(booking.startsOn, booking.endsOn) * item.quantity * 100) / 100,
    currency: booking.currency,
  }));
  return {
    reference: booking.reference,
    hotel: hotelPayload(booking, hotel),
    startsOn: booking.startsOn,
    endsOn: booking.endsOn,
    nights: calculateBookingNights(booking.startsOn, booking.endsOn),
    adults: booking.adults,
    children: booking.children,
    guestCount: booking.guestCount,
    roomCount: booking.roomCount,
    guest: { name: booking.guestName, email: booking.guestEmail, phone: booking.guestPhone },
    items,
    total: Number(booking.totalAmount),
    currency: booking.currency,
    status: booking.status === "cancelled" ? "cancelled" as const : "pending_payment" as const,
    paymentStatus,
    sourceNotice: bookingDevelopmentNotice,
    canCancel: canCancelBooking(booking.status, booking.startsOn),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

async function getBookingRows(tx: any, userId: string, reference: string) {
  return tx
    .select({ booking: bookings, item: bookingItems, room: hotelRooms, hotel: hotels, payment: payments })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(hotelRooms, eq(hotelRooms.id, bookingItems.roomId))
    .leftJoin(hotels, eq(hotels.id, hotelRooms.hotelId))
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.userId, userId), eq(bookings.reference, reference)))
    .orderBy(asc(bookingItems.createdAt));
}

function groupBookingRows(rows: Awaited<ReturnType<typeof getBookingRows>>) {
  if (!rows.length) return null;
  const first = rows[0];
  const grouped = new Map<string, Array<{ item: BookingItemRow; room: typeof hotelRooms.$inferSelect }>>();
  for (const row of rows) {
    const existing = grouped.get(row.booking.id) ?? [];
    existing.push({ item: row.item, room: row.room });
    grouped.set(row.booking.id, existing);
  }
  return bookingPayload(first.booking, grouped.get(first.booking.id) ?? [], first.hotel, first.payment?.status === "unpaid" ? "unpaid" : "unpaid");
}

export async function findBooking(userId: string, reference: string) {
  const rows = await getBookingRows(db, userId, reference);
  return groupBookingRows(rows);
}

export async function listUserBookings(userId: string) {
  const rows = await db
    .select({ booking: bookings, item: bookingItems, room: hotelRooms, hotel: hotels, payment: payments })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(hotelRooms, eq(hotelRooms.id, bookingItems.roomId))
    .leftJoin(hotels, eq(hotels.id, hotelRooms.hotelId))
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.startsOn), desc(bookings.createdAt), asc(bookingItems.createdAt));
  const groups = new Map<string, typeof rows>();
  for (const row of rows) groups.set(row.booking.id, [...(groups.get(row.booking.id) ?? []), row]);
  return [...groups.values()].map(groupBookingRows).filter((value): value is NonNullable<typeof value> => Boolean(value));
}

export async function createUserBooking(userId: string, input: BookingRequest, idempotencyKey: string) {
  const hotel = getHotelCatalogRecord(input.hotelId);
  if (!hotel) throw new BookingNotFoundError("Hotel not found.");
  const rooms = input.items.map((item) => {
    const room = getDevelopmentRoom(input.hotelId, item.roomId);
    if (!room) throw new BookingNotFoundError("Selected room is not available from the development provider.");
    if (room.capacity * item.quantity < input.adults + input.children) throw new BookingConflictError("The selected room capacity no longer matches the travellers.");
    return { ...room, roomId: item.roomId, quantity: item.quantity };
  });
  const pricing = calculateBookingPricing(input, rooms);

  return db.transaction(async (tx) => {
    const existing = await tx.select({ booking: bookings }).from(bookings)
      .where(and(eq(bookings.userId, userId), eq(bookings.idempotencyKey, idempotencyKey)));
    if (existing[0]) {
      const saved = await getBookingRows(tx, userId, existing[0].booking.reference);
      const payload = groupBookingRows(saved);
      if (!payload) throw new BookingNotFoundError("The previous booking could not be loaded.");
      return payload;
    }

    for (const room of rooms) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${room.id}))`);
      const [roomRecord] = await tx.select({ room: hotelRooms, hotel: hotels })
        .from(hotelRooms)
        .leftJoin(hotels, eq(hotels.id, hotelRooms.hotelId))
        .where(eq(hotelRooms.catalogRoomId, room.id));
      let persistedRoom = roomRecord?.room;
      let persistedHotel = roomRecord?.hotel ?? null;
      if (!persistedHotel) {
        [persistedHotel] = await tx.insert(hotels).values({
          catalogId: input.hotelId,
          name: hotel.name,
          address: hotel.location,
          status: "published",
        }).onConflictDoUpdate({ target: hotels.catalogId, set: { name: hotel.name, address: hotel.location, updatedAt: new Date() } }).returning();
      }
      if (!persistedRoom) {
        [persistedRoom] = await tx.insert(hotelRooms).values({
          catalogRoomId: room.id,
          hotelId: persistedHotel.id,
          name: room.name,
          capacity: room.capacity,
          nightlyRate: String(room.nightlyRate),
          currency: room.currency,
          status: "active",
        }).onConflictDoNothing({ target: hotelRooms.catalogRoomId }).returning();
        if (!persistedRoom) {
          persistedRoom = (await tx.select().from(hotelRooms).where(eq(hotelRooms.catalogRoomId, room.id)))[0];
        }
      }
      if (!persistedRoom) throw new BookingNotFoundError("The selected room could not be prepared.");

      const [reserved] = await tx.select({
        quantity: sql<string>`coalesce(sum(${bookingItems.quantity}), 0)`,
      }).from(bookingItems)
        .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
        .where(and(
          eq(bookingItems.roomId, persistedRoom.id),
          eq(bookings.status, "pending_payment"),
          lt(bookings.startsOn, input.checkOut),
          gt(bookings.endsOn, input.checkIn),
        ));
      if (Number(reserved?.quantity ?? 0) + room.quantity > room.availableUnits) {
        throw new BookingConflictError("That room is no longer available for the requested stay.");
      }
    }

    const reference = createReference();
    const [booking] = await tx.insert(bookings).values({
      userId,
      reference,
      idempotencyKey,
      hotelCatalogId: input.hotelId,
      startsOn: input.checkIn,
      endsOn: input.checkOut,
      adults: input.adults,
      children: input.children,
      guestCount: input.adults + input.children,
      roomCount: input.rooms,
      guestName: input.guest.name,
      guestEmail: input.guest.email,
      guestPhone: input.guest.phone,
      totalAmount: String(pricing.total),
      currency: pricing.currency,
      status: "pending_payment",
    }).returning();
    if (!booking) throw new Error("Booking creation did not return a booking.");

    const persistedRooms = await tx.select().from(hotelRooms)
      .where(sql`${hotelRooms.catalogRoomId} in (${sql.join(rooms.map((room) => sql`${room.id}`), sql`, `)})`);
    const persistedById = new Map(persistedRooms.map((room) => [room.catalogRoomId, room]));
    await tx.insert(bookingItems).values(rooms.map((room) => ({
      bookingId: booking.id,
      roomId: persistedById.get(room.id)!.id,
      quantity: room.quantity,
      unitAmount: String(room.nightlyRate),
    })));
    await tx.insert(payments).values({
      bookingId: booking.id,
      userId,
      provider: "development",
      amount: String(pricing.total),
      currency: pricing.currency,
      status: "unpaid",
    });

    return bookingPayload(
      booking,
      rooms.map((room) => ({
        item: { id: "", bookingId: booking.id, roomId: persistedById.get(room.id)!.id, quantity: room.quantity, unitAmount: String(room.nightlyRate), createdAt: booking.createdAt, updatedAt: booking.updatedAt },
        room: persistedById.get(room.id)!,
      })),
      persistedRooms.length ? null : null,
    );
  });
}

export async function cancelUserBooking(userId: string, reference: string) {
  return db.transaction(async (tx) => {
    const rows = await getBookingRows(tx, userId, reference);
    const current = groupBookingRows(rows);
    if (!current) throw new BookingNotFoundError("Booking not found.");
    if (!current.canCancel) throw new BookingConflictError("This booking can no longer be cancelled.");
    const [updated] = await tx.update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(bookings.userId, userId), eq(bookings.reference, reference), eq(bookings.status, "pending_payment")))
      .returning();
    if (!updated) throw new BookingConflictError("This booking changed before it could be cancelled.");
    const refreshed = await getBookingRows(tx, userId, reference);
    return groupBookingRows(refreshed);
  });
}

export { availabilityDevelopmentNotice };