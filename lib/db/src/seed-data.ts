/** Deterministic, relationally coherent records for the local demo environment. */
export const demoIds = {
  users: { traveller: "00000000-0000-4000-8000-000000000001", vendor: "00000000-0000-4000-8000-000000000002", admin: "00000000-0000-4000-8000-000000000003" },
  destinations: Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8100-${String(i + 1).padStart(12, "0")}`),
  hotels: Array.from({ length: 4 }, (_, i) => `00000000-0000-4000-8200-${String(i + 1).padStart(12, "0")}`),
  properties: Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8300-${String(i + 1).padStart(12, "0")}`),
  events: Array.from({ length: 6 }, (_, i) => `00000000-0000-4000-8400-${String(i + 1).padStart(12, "0")}`),
} as const;

const id = (group: string, n: number) => `00000000-0000-4${group.padStart(3, "0")}-${"8000"}-${String(n).padStart(12, "0")}`;
const days = (n: number) => `2030-06-${String(n).padStart(2, "0")}`;

export const demoDestinations = demoIds.destinations.map((id, i) => ({
  id, slug: `demo-destination-${i + 1}`, name: ["Konkan Coast", "Coorg Highlands", "Jaipur", "Kochi", "Leh", "Varanasi", "Goa", "Mysuru"][i],
  country: "India", region: "Demo region", summary: "A curated destination in the Travel & Land demo catalogue.", status: "published",
}));
export const demoAttractions = demoDestinations.map((d, i) => ({ id: id("101", i + 1), destinationId: d.id, name: `${d.name} ${i >= 4 ? "Temple" : "Heritage Walk"}`, description: "A demo attraction for exploring the catalogue.", address: `Central ${d.name}`, status: "active" }));
export const demoFoodPlaces = demoDestinations.slice(0, 4).map((d, i) => ({ id: id("102", i + 1), destinationId: d.id, name: `${d.name} Table`, cuisine: "Regional Indian", address: `Market Road, ${d.name}`, priceLevel: 2, status: "active" }));
export const demoEvents = demoIds.events.map((eventId, i) => ({ id: eventId, destinationId: demoDestinations[i].id, name: `Demo Festival ${i + 1}`, description: "A future event in the demo calendar.", startsAt: new Date(`2030-07-${String(i + 10).padStart(2, "0")}T10:00:00Z`), endsAt: new Date(`2030-07-${String(i + 10).padStart(2, "0")}T18:00:00Z`), status: "scheduled" }));

export const demoHotels = demoIds.hotels.map((hotelId, i) => ({
  id: hotelId, catalogId: `demo-hotel-${i + 1}`, destinationId: demoDestinations[i].id, ownerId: demoIds.users.vendor,
  name: `Demo Hotel ${i + 1}`, description: "Approved accommodation for local demos.", propertyType: "hotel", address: `${i + 1} Demo Lane`, city: demoDestinations[i].name, state: "Demo State", country: "India",
  postalCode: "400001", contactPhone: "+91 9000000000", contactEmail: `hotel${i + 1}@demo.travel`, amenities: ["wifi", "breakfast"], imageUrls: [], checkInTime: "14:00", checkOutTime: "11:00", status: "published", approvalStatus: "approved",
}));
export const demoRooms = demoHotels.flatMap((hotel, hi) => [1, 2].map((n) => ({
  id: id("103", hi * 2 + n), catalogRoomId: `demo-room-${hi + 1}-${n}`, hotelId: hotel.id, name: n === 1 ? "Deluxe King" : "Family Suite", bedType: n === 1 ? "king" : "twin", capacity: n === 1 ? 2 : 4, totalUnits: 5, nightlyRate: n === 1 ? "6500" : "9800", currency: "INR", amenities: ["wifi"], imageUrls: [], status: "active",
})));
export const demoAvailability = demoRooms.flatMap((room, ri) => Array.from({ length: 16 }, (_, di) => {
  const day = di + 10;
  return {
  id: id("104", ri * 16 + di + 1), roomId: room.id, date: days(day), availableUnits: 4, priceOverride: null, status: "available",
  };
}));

export const demoProperties = demoIds.properties.map((propertyId, i) => ({
  id: propertyId, ownerId: demoIds.users.vendor, slug: `demo-property-${i + 1}`, title: `Demo Property ${i + 1}`, description: "A published demo property listing.", propertyType: i % 2 ? "villa" : "land", address: `${i + 1} Demo Estate`, areaValue: String(1 + i), areaUnit: "acre", askingPrice: String(10000000 + i * 1000000), currency: "INR", isVerified: true, status: "published",
}));
export const demoEnquiries = demoProperties.slice(0, 3).map((p, i) => ({ id: id("105", i + 1), propertyId: p.id, userId: demoIds.users.traveller, message: "Please share more details.", preferredContactMethod: "email", status: "new" }));
export const demoEnquiryHistory = demoEnquiries.flatMap((enquiry, i) => [
  { id: id("115", i * 2 + 1), enquiryId: enquiry.id, status: "new", note: "Demo enquiry received.", changedBy: demoIds.users.admin },
  { id: id("115", i * 2 + 2), enquiryId: enquiry.id, status: i === 0 ? "contacted" : "new", note: i === 0 ? "Demo sourcing specialist contacted the traveller." : null, changedBy: demoIds.users.admin },
]);

export const demoBookings = [
  { id: id("106", 1), userId: demoIds.users.traveller, reference: "DEMO-PENDING-01", idempotencyKey: "demo-booking-pending", hotelCatalogId: "demo-hotel-1", startsOn: days(10), endsOn: days(12), adults: 2, children: 0, guestCount: 2, roomCount: 1, guestName: "Demo Traveller", guestEmail: "traveller@demo.travel", guestPhone: "+91 9000000001", totalAmount: "13000", currency: "INR", status: "pending_payment" },
  { id: id("106", 2), userId: demoIds.users.traveller, reference: "DEMO-CONFIRMED-01", idempotencyKey: "demo-booking-confirmed", hotelCatalogId: "demo-hotel-2", startsOn: days(15), endsOn: days(17), adults: 2, children: 1, guestCount: 3, roomCount: 1, guestName: "Demo Traveller", guestEmail: "traveller@demo.travel", guestPhone: "+91 9000000001", totalAmount: "19600", currency: "INR", status: "confirmed" },
  { id: id("106", 3), userId: demoIds.users.traveller, reference: "DEMO-CANCELLED-01", idempotencyKey: "demo-booking-cancelled", hotelCatalogId: "demo-hotel-3", startsOn: days(20), endsOn: days(22), adults: 1, children: 0, guestCount: 1, roomCount: 1, guestName: "Demo Traveller", guestEmail: "traveller@demo.travel", guestPhone: "+91 9000000001", totalAmount: "13000", currency: "INR", status: "cancelled" },
] as const;
export const demoBookingItems = [
  { id: id("107", 1), bookingId: demoBookings[0].id, roomId: demoRooms[0].id, quantity: 1, unitAmount: demoRooms[0].nightlyRate },
  { id: id("107", 2), bookingId: demoBookings[1].id, roomId: demoRooms[3].id, quantity: 1, unitAmount: demoRooms[3].nightlyRate },
  { id: id("107", 3), bookingId: demoBookings[2].id, roomId: demoRooms[4].id, quantity: 1, unitAmount: demoRooms[4].nightlyRate },
];
export const demoPayments = [
  { id: id("108", 1), bookingId: demoBookings[0].id, userId: demoIds.users.traveller, provider: "demo", providerReference: "demo-payment-pending", amount: demoBookings[0].totalAmount, currency: "INR", status: "unpaid" },
  { id: id("108", 2), bookingId: demoBookings[1].id, userId: demoIds.users.traveller, provider: "demo", providerReference: "demo-payment-paid", amount: demoBookings[1].totalAmount, currency: "INR", status: "paid" },
  { id: id("108", 3), bookingId: demoBookings[2].id, userId: demoIds.users.traveller, provider: "demo", providerReference: "demo-payment-cancelled", amount: demoBookings[2].totalAmount, currency: "INR", status: "cancelled" },
];
export const demoWallets = [demoIds.users.traveller, demoIds.users.vendor].map((userId, i) => ({ id: id("109", i + 1), userId, balance: i ? "25000" : "5000", currency: "INR", status: "active" }));
export const demoWalletTransactions = [{ id: id("110", 1), walletId: demoWallets[0].id, paymentId: demoPayments[1].id, type: "credit", amount: "5000", description: "Demo wallet credit", status: "posted" }, { id: id("110", 2), walletId: demoWallets[1].id, paymentId: demoPayments[1].id, type: "credit", amount: "25000", description: "Demo wallet credit", status: "posted" }];
export const demoReviews = [{ id: id("111", 1), userId: demoIds.users.traveller, entityType: "hotel", entityId: demoHotels[1].catalogId, bookingId: demoBookings[1].id, rating: 5, title: "Wonderful stay", body: "A polished demo review.", status: "published" }];
export const demoFavorites = [{ id: id("112", 1), userId: demoIds.users.traveller, entityType: "destination", entityId: demoDestinations[0].id }, { id: id("112", 2), userId: demoIds.users.traveller, entityType: "hotel", entityId: demoHotels[0].id }];
export const demoNotifications = [{ id: id("113", 1), userId: demoIds.users.traveller, type: "booking_confirmed", title: "Booking confirmed", body: "Your demo booking is confirmed.", data: { relatedType: "booking", relatedId: "DEMO-CONFIRMED-01" }, dedupeKey: "demo-booking-confirmed" }, { id: id("113", 2), userId: demoIds.users.vendor, type: "land_enquiry_updated", title: "New enquiry", body: "A traveller sent a demo enquiry.", data: { relatedType: "property", relatedId: demoProperties[0].id }, dedupeKey: "demo-enquiry-1" }];
export const demoFeaturedContent = [{ id: id("114", 1), entityType: "destination", entityId: demoDestinations[0].id, sortOrder: 1, status: "active", createdBy: demoIds.users.admin }, { id: id("114", 2), entityType: "hotel", entityId: demoHotels[0].id, sortOrder: 2, status: "active", createdBy: demoIds.users.admin }, { id: id("114", 3), entityType: "event", entityId: demoEvents[0].id, sortOrder: 3, status: "active", createdBy: demoIds.users.admin }];