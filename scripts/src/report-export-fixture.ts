import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";

const targetCount = 1_001;
const createdAt = new Date("2030-01-15T12:34:56.789Z");
const outsideRange = new Date("2029-12-31T12:34:56.789Z");

const id = (group: string, n: number) =>
  `00000000-0000-4${group}-8000-${String(n).padStart(12, "0")}`;

const adminId = id("901", 1);
const indiaHotelId = id("902", 1);
const nepalHotelId = id("902", 2);
const targetUserIds = Array.from({ length: targetCount }, (_, index) =>
  id("903", index + 1),
);
const decoyVendorUserIds = Array.from({ length: 3 }, (_, index) =>
  id("909", index + 1),
);
const targetBookingIds = Array.from({ length: targetCount }, (_, index) =>
  id("904", index + 1),
);
const targetPaymentIds = Array.from({ length: targetCount }, (_, index) =>
  id("905", index + 1),
);
const targetPropertyIds = Array.from({ length: targetCount }, (_, index) =>
  id("906", index + 1),
);
const targetEnquiryIds = Array.from({ length: targetCount }, (_, index) =>
  id("907", index + 1),
);
const targetVendorProfileIds = Array.from({ length: targetCount }, (_, index) =>
  id("908", index + 1),
);

export const reportExportFixtureIds = {
  users: [adminId, ...targetUserIds, ...decoyVendorUserIds],
  hotels: [indiaHotelId, nepalHotelId],
  bookings: [...targetBookingIds, id("914", 1), id("914", 2), id("914", 3)],
  payments: [...targetPaymentIds, id("915", 1), id("915", 2)],
  properties: [...targetPropertyIds, id("916", 1), id("916", 2)],
  enquiries: [...targetEnquiryIds, id("917", 1), id("917", 2)],
  vendorProfiles: [
    ...targetVendorProfileIds,
    id("918", 1),
    id("918", 2),
    id("918", 3),
  ],
} as const;

function amount(index: number): string {
  return `${index + 10}.50`;
}

function fixtureDate(index: number): Date {
  return new Date(createdAt.getTime() + index);
}

export async function seedReportExportFixture() {
  assertSafeDemoEnvironment(process.env, "report export fixture seed");
  const {
    db,
    bookings,
    hotels,
    payments,
    properties,
    propertyEnquiries,
    userRoles,
    users,
    vendorProfiles,
  } = await import("@workspace/db");

  const fixtureUsers = [
    {
      id: adminId,
      clerkUserId: "report_export_admin",
      email: "report-export-admin@example.test",
      displayName: "Report export admin",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    ...targetUserIds.map((userId, index) => ({
      id: userId,
      clerkUserId: `report_export_vendor_${index + 1}`,
      email: `report-export-vendor-${index + 1}@example.test`,
      displayName: `Report export vendor ${index + 1}`,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    })),
    ...decoyVendorUserIds.map((userId, index) => ({
      id: userId,
      clerkUserId: `report_export_decoy_vendor_${index + 1}`,
      email: `report-export-decoy-vendor-${index + 1}@example.test`,
      displayName: `Report export decoy vendor ${index + 1}`,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    })),
  ];
  const fixtureRoles = [
    {
      userId: adminId,
      role: "admin",
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const fixtureHotels = [
    {
      id: indiaHotelId,
      catalogId: "report-export-india-hotel",
      ownerId: adminId,
      name: "India export hotel",
      address: "Export Street",
      country: "India",
      amenities: [],
      imageUrls: [],
      status: "published",
      approvalStatus: "approved",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: nepalHotelId,
      catalogId: "report-export-nepal-hotel",
      ownerId: adminId,
      name: "Nepal export hotel",
      address: "Mountain Street",
      country: "Nepal",
      amenities: [],
      imageUrls: [],
      status: "published",
      approvalStatus: "approved",
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const fixtureBookings = targetBookingIds.map((bookingId, index) => ({
    id: bookingId,
    userId: adminId,
    reference: `REPORT-BOOKING-${index + 1}`,
    idempotencyKey: `report-export-booking-${index + 1}`,
    hotelCatalogId: "report-export-india-hotel",
    startsOn: "2030-01-20",
    endsOn: "2030-01-22",
    adults: 2,
    children: 0,
    guestCount: 2,
    roomCount: 1,
    guestName: "Export Guest",
    guestEmail: "guest@example.test",
    totalAmount: amount(index),
    currency: index % 2 ? "INR" : "USD",
    status: "confirmed",
    createdAt: fixtureDate(index),
    updatedAt: fixtureDate(index),
  }));
  fixtureBookings.push(
    {
      id: id("914", 1),
      userId: adminId,
      reference: "REPORT-BOOKING-WRONG-STATUS",
      idempotencyKey: "report-export-booking-wrong-status",
      hotelCatalogId: "report-export-india-hotel",
      startsOn: "2030-01-20",
      endsOn: "2030-01-22",
      adults: 2,
      children: 0,
      guestCount: 2,
      roomCount: 1,
      guestName: "Export Guest",
      guestEmail: "guest@example.test",
      totalAmount: "99.50",
      currency: "USD",
      status: "cancelled",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("914", 2),
      userId: adminId,
      reference: "REPORT-BOOKING-WRONG-COUNTRY",
      idempotencyKey: "report-export-booking-wrong-country",
      hotelCatalogId: "report-export-nepal-hotel",
      startsOn: "2030-01-20",
      endsOn: "2030-01-22",
      adults: 2,
      children: 0,
      guestCount: 2,
      roomCount: 1,
      guestName: "Export Guest",
      guestEmail: "guest@example.test",
      totalAmount: "98.50",
      currency: "USD",
      status: "confirmed",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("914", 3),
      userId: adminId,
      reference: "REPORT-BOOKING-WRONG-DATE",
      idempotencyKey: "report-export-booking-wrong-date",
      hotelCatalogId: "report-export-india-hotel",
      startsOn: "2029-12-20",
      endsOn: "2029-12-22",
      adults: 2,
      children: 0,
      guestCount: 2,
      roomCount: 1,
      guestName: "Export Guest",
      guestEmail: "guest@example.test",
      totalAmount: "97.50",
      currency: "USD",
      status: "confirmed",
      createdAt: outsideRange,
      updatedAt: outsideRange,
    },
  );
  const fixturePayments = targetPaymentIds.map((paymentId, index) => ({
    id: paymentId,
    bookingId: targetBookingIds[index],
    userId: adminId,
    provider: "fixture",
    providerReference: `report-export-payment-${index + 1}`,
    amount: amount(index),
    currency: index % 2 ? "INR" : "USD",
    status: "paid",
    createdAt: fixtureDate(index),
    updatedAt: fixtureDate(index),
  }));
  fixturePayments.push(
    {
      id: id("915", 1),
      bookingId: targetBookingIds[0],
      userId: adminId,
      provider: "fixture",
      providerReference: "report-export-payment-wrong-status",
      amount: "88.50",
      currency: "USD",
      status: "failed",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("915", 2),
      bookingId: targetBookingIds[0],
      userId: adminId,
      provider: "fixture",
      providerReference: "report-export-payment-wrong-date",
      amount: "87.50",
      currency: "USD",
      status: "paid",
      createdAt: outsideRange,
      updatedAt: outsideRange,
    },
  );
  const fixtureProperties = targetPropertyIds.map((propertyId, index) => ({
    id: propertyId,
    ownerId: adminId,
    slug: `report-export-property-${index + 1}`,
    title:
      index === 0 ? 'Villa, "quoted"\nline' : `Export property ${index + 1}`,
    description: "Report export fixture property",
    propertyType: "land",
    address: "Export Avenue",
    areaValue: "10",
    areaUnit: "acre",
    askingPrice: amount(index),
    currency: index % 2 ? "INR" : "USD",
    isVerified: true,
    status: "published",
    createdAt: fixtureDate(index),
    updatedAt: fixtureDate(index),
  }));
  fixtureProperties.push(
    {
      id: id("916", 1),
      ownerId: adminId,
      slug: "report-export-property-wrong-status",
      title: "Export pending property",
      description: "Report export fixture property",
      propertyType: "land",
      address: "Export Avenue",
      areaValue: "10",
      areaUnit: "acre",
      askingPrice: "86.50",
      currency: "USD",
      isVerified: false,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("916", 2),
      ownerId: adminId,
      slug: "report-export-property-wrong-date",
      title: "Export old property",
      description: "Report export fixture property",
      propertyType: "land",
      address: "Export Avenue",
      areaValue: "10",
      areaUnit: "acre",
      askingPrice: "85.50",
      currency: "USD",
      isVerified: false,
      status: "published",
      createdAt: outsideRange,
      updatedAt: outsideRange,
    },
  );
  const fixtureEnquiries = targetEnquiryIds.map((enquiryId, index) => ({
    id: enquiryId,
    propertyId: targetPropertyIds[index],
    userId: adminId,
    idempotencyKey: `report-export-enquiry-${index + 1}`,
    message: "Report export fixture enquiry",
    preferredContactMethod: "email",
    status: "closed",
    createdAt: fixtureDate(index),
    updatedAt: fixtureDate(index),
  }));
  fixtureEnquiries.push(
    {
      id: id("917", 1),
      propertyId: targetPropertyIds[0],
      userId: adminId,
      idempotencyKey: "report-export-enquiry-wrong-status",
      message: "Report export fixture enquiry",
      preferredContactMethod: "email",
      status: "new",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("917", 2),
      propertyId: targetPropertyIds[0],
      userId: adminId,
      idempotencyKey: "report-export-enquiry-wrong-date",
      message: "Report export fixture enquiry",
      preferredContactMethod: "email",
      status: "closed",
      createdAt: outsideRange,
      updatedAt: outsideRange,
    },
  );
  const fixtureVendorProfiles = targetVendorProfileIds.map(
    (profileId, index) => ({
      id: profileId,
      userId: targetUserIds[index],
      businessName:
        index === 0 ? 'Vendor, "quoted"' : `Export vendor ${index + 1}`,
      businessType: "agency",
      contactName: `Vendor contact ${index + 1}`,
      phone: `+910000000${String(index + 1).padStart(3, "0")}`,
      email: `vendor-profile-${index + 1}@example.test`,
      description: "Report export fixture vendor",
      address: "Export Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      status: "approved",
      createdAt: fixtureDate(index),
      updatedAt: fixtureDate(index),
    }),
  );
  fixtureVendorProfiles.push(
    {
      id: id("918", 1),
      userId: decoyVendorUserIds[0],
      businessName: "Nepal export vendor",
      businessType: "agency",
      contactName: "Nepal vendor contact",
      phone: "+910000000001",
      email: "nepal-vendor-profile@example.test",
      description: "Report export fixture vendor",
      address: "Export Road",
      city: "Kathmandu",
      state: "Bagmati",
      country: "Nepal",
      status: "approved",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("918", 2),
      userId: decoyVendorUserIds[1],
      businessName: "Pending export vendor",
      businessType: "agency",
      contactName: "Pending vendor contact",
      phone: "+910000000002",
      email: "pending-vendor-profile@example.test",
      description: "Report export fixture vendor",
      address: "Export Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: id("918", 3),
      userId: decoyVendorUserIds[2],
      businessName: "Old export vendor",
      businessType: "agency",
      contactName: "Old vendor contact",
      phone: "+910000000003",
      email: "old-vendor-profile@example.test",
      description: "Report export fixture vendor",
      address: "Export Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      status: "approved",
      createdAt: outsideRange,
      updatedAt: outsideRange,
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values(fixtureUsers as never[])
      .onConflictDoNothing();
    await tx
      .insert(userRoles)
      .values(fixtureRoles as never[])
      .onConflictDoNothing();
    await tx
      .insert(hotels)
      .values(fixtureHotels as never[])
      .onConflictDoNothing();
    await tx
      .insert(properties)
      .values(fixtureProperties as never[])
      .onConflictDoNothing();
    await tx
      .insert(propertyEnquiries)
      .values(fixtureEnquiries as never[])
      .onConflictDoNothing();
    await tx
      .insert(bookings)
      .values(fixtureBookings as never[])
      .onConflictDoNothing();
    await tx
      .insert(payments)
      .values(fixturePayments as never[])
      .onConflictDoNothing();
    await tx
      .insert(vendorProfiles)
      .values(fixtureVendorProfiles as never[])
      .onConflictDoNothing();
  });
}

export async function resetReportExportFixture() {
  assertSafeDemoEnvironment(process.env, "report export fixture reset");
  const {
    db,
    bookings,
    hotels,
    payments,
    properties,
    propertyEnquiries,
    userRoles,
    users,
    vendorProfiles,
  } = await import("@workspace/db");
  const { inArray } = await import("drizzle-orm");
  const deleteRows = async () => {
    await db
      .delete(propertyEnquiries)
      .where(inArray(propertyEnquiries.id, reportExportFixtureIds.enquiries));
    await db
      .delete(payments)
      .where(inArray(payments.id, reportExportFixtureIds.payments));
    await db
      .delete(bookings)
      .where(inArray(bookings.id, reportExportFixtureIds.bookings));
    await db
      .delete(properties)
      .where(inArray(properties.id, reportExportFixtureIds.properties));
    await db
      .delete(vendorProfiles)
      .where(inArray(vendorProfiles.id, reportExportFixtureIds.vendorProfiles));
    await db
      .delete(hotels)
      .where(inArray(hotels.id, reportExportFixtureIds.hotels));
    await db
      .delete(userRoles)
      .where(inArray(userRoles.userId, reportExportFixtureIds.users));
    await db
      .delete(users)
      .where(inArray(users.id, reportExportFixtureIds.users));
  };
  await db.transaction(deleteRows);
}

if (
  process.argv[1]?.endsWith("/report-export-fixture.ts") ||
  process.argv[1]?.endsWith("/report-export-fixture.js")
) {
  const action = process.argv[2] ?? "seed";
  try {
    if (action === "reset") await resetReportExportFixture();
    else if (action === "seed") await seedReportExportFixture();
    else
      throw new Error(
        `Unknown report export fixture command: ${action}. Use seed or reset.`,
      );
  } finally {
    const { pool } = await import("@workspace/db");
    await pool.end();
  }
}
