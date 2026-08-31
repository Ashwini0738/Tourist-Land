import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";
import { db, pool, users, userRoles, destinations, attractions, foodPlaces, events, hotels, hotelRooms, roomAvailability, properties, propertyEnquiries, propertyEnquiryHistory, bookings, bookingItems, payments, wallets, walletTransactions, reviews, favorites, notifications, featuredContent, vendorProfiles, vendorAuditLogs, adminAuditLogs } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { demoIds, demoDestinations, demoAttractions, demoFoodPlaces, demoEvents, demoHotels, demoRooms, demoAvailability, demoProperties, demoEnquiries, demoEnquiryHistory, demoBookings, demoBookingItems, demoPayments, demoWallets, demoWalletTransactions, demoReviews, demoFavorites, demoNotifications, demoFeaturedContent, demoVendorTwoProfile, demoVendorTwoHotels, demoVendorTwoRooms, demoVendorTwoAvailability, demoVendorTwoProperties, demoVendorTwoEnquiries, demoVendorTwoEnquiryHistory, demoVendorTwoBookings, demoVendorTwoBookingItems, demoVendorTwoPayments, demoVendorTwoReviews } from "@workspace/db/seed-data";

const demoUsers = [
  { id: demoIds.users.traveller, clerkUserId: "demo_traveller", email: "traveller@demo.travel", displayName: "Demo Traveller", status: "active" },
  { id: demoIds.users.vendor, clerkUserId: "demo_vendor", email: "vendor@demo.travel", displayName: "Demo Vendor", status: "active" },
  { id: demoIds.users.admin, clerkUserId: "demo_admin", email: "admin@demo.travel", displayName: "Demo Admin", status: "active" },
  { id: demoIds.users.vendorTwo, clerkUserId: "demo_vendor_two", email: "vendor-two@demo.travel", displayName: "Second Demo Vendor", status: "active" },
];
const roles = [
  { id: "00000000-0000-4000-9000-000000000001", userId: demoIds.users.traveller, role: "user" },
  { id: "00000000-0000-4000-9000-000000000002", userId: demoIds.users.vendor, role: "vendor" },
  { id: "00000000-0000-4000-9000-000000000003", userId: demoIds.users.admin, role: "admin" },
  { id: "00000000-0000-4000-9000-000000000004", userId: demoIds.users.vendorTwo, role: "vendor" },
];
const profile = { id: "00000000-0000-4000-9100-000000000001", userId: demoIds.users.vendor, businessName: "Demo Travel Co", businessType: "hospitality", contactName: "Demo Vendor", phone: "+91 9000000002", email: "vendor@demo.travel", description: "Local demo vendor", address: "Demo Market", city: "Pune", state: "Maharashtra", country: "India", status: "approved" };
const groups = [
  [users, demoUsers], [userRoles, roles], [vendorProfiles, [profile, demoVendorTwoProfile]], [destinations, demoDestinations],
  [attractions, demoAttractions], [foodPlaces, demoFoodPlaces], [events, demoEvents], [hotels, [...demoHotels, ...demoVendorTwoHotels]],
  [hotelRooms, [...demoRooms, ...demoVendorTwoRooms]], [roomAvailability, [...demoAvailability, ...demoVendorTwoAvailability]], [properties, [...demoProperties, ...demoVendorTwoProperties]], [propertyEnquiries, [...demoEnquiries, ...demoVendorTwoEnquiries]], [propertyEnquiryHistory, [...demoEnquiryHistory, ...demoVendorTwoEnquiryHistory]],
  [bookings, [...demoBookings, ...demoVendorTwoBookings]], [bookingItems, [...demoBookingItems, ...demoVendorTwoBookingItems]], [payments, [...demoPayments, ...demoVendorTwoPayments]], [wallets, demoWallets],
  [walletTransactions, demoWalletTransactions], [reviews, [...demoReviews, ...demoVendorTwoReviews]], [favorites, demoFavorites],
  [notifications, demoNotifications], [featuredContent, demoFeaturedContent],
] as const;

export async function seedDemoData() {
  assertSafeDemoEnvironment(process.env, "demo seed");
  await db.transaction(async (tx) => {
    for (const [table, rows] of groups) {
      if (rows.length) await tx.insert(table).values(rows as never[]).onConflictDoNothing();
    }
  });
  console.log("Demo dataset seeded (idempotent).");
}

export async function resetDemoData() {
  assertSafeDemoEnvironment(process.env, "demo reset");
  // Delete children first; every predicate is limited to deterministic demo IDs.
  const deletions = [
    [featuredContent, demoFeaturedContent], [notifications, demoNotifications], [favorites, demoFavorites], [reviews, [...demoReviews, ...demoVendorTwoReviews]],
    [walletTransactions, demoWalletTransactions], [payments, [...demoPayments, ...demoVendorTwoPayments]], [bookingItems, [...demoBookingItems, ...demoVendorTwoBookingItems]], [bookings, [...demoBookings, ...demoVendorTwoBookings]],
    [propertyEnquiryHistory, [...demoEnquiryHistory, ...demoVendorTwoEnquiryHistory]], [propertyEnquiries, [...demoEnquiries, ...demoVendorTwoEnquiries]], [properties, [...demoProperties, ...demoVendorTwoProperties]], [roomAvailability, [...demoAvailability, ...demoVendorTwoAvailability]], [hotelRooms, [...demoRooms, ...demoVendorTwoRooms]],
    [hotels, [...demoHotels, ...demoVendorTwoHotels]], [events, demoEvents], [foodPlaces, demoFoodPlaces], [attractions, demoAttractions], [destinations, demoDestinations],
    [vendorProfiles, [profile, demoVendorTwoProfile]], [userRoles, roles], [wallets, demoWallets], [users, demoUsers],
  ] as const;
  await db.transaction(async (tx) => {
    await tx.delete(adminAuditLogs).where(inArray(adminAuditLogs.adminUserId, Object.values(demoIds.users)));
    await tx.delete(vendorAuditLogs).where(inArray(vendorAuditLogs.vendorId, Object.values(demoIds.users)));
    for (const [table, rows] of deletions) {
      const ids = rows.map((row) => row.id);
      if (ids.length) await tx.delete(table).where(inArray(table.id, ids));
    }
  });
  console.log("Demo dataset reset.");
}

if (process.argv[1]?.endsWith("/demo-seed.ts") || process.argv[1]?.endsWith("/demo-seed.js")) {
  const action = process.argv[2] ?? "seed";
  try {
    if (action === "reset") await resetDemoData();
    else if (action === "seed") await seedDemoData();
    else throw new Error(`Unknown demo command: ${action}. Use seed or reset.`);
  } finally {
    await pool.end();
  }
}