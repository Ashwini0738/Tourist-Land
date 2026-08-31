import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq, gte, gt, inArray, lt, or, sql } from "drizzle-orm";
import {
  bookingItems,
  bookings,
  destinations,
  hotelRooms,
  hotels,
  notifications,
  payments,
  properties,
  propertyEnquiries,
  reviews,
  userRoles,
  users,
  vendorProfiles,
  wallets,
} from "@workspace/db";
import { db } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth.ts";
import { requireApprovedVendor, requireRole } from "../middlewares/authorization.ts";

type ReportRole = "admin" | "vendor";
type Range = { from: Date; to: Date; fromDate: string; toDate: string };
type Conditions = any[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REPORT_ROWS = 100;

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || dateOnly(parsed) !== value ? null : parsed;
}

function reportRange(req: Parameters<RequestHandler>[0]): Range | null {
  const now = new Date();
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);
  const from = req.query.from === undefined ? defaultFrom : parseDate(req.query.from);
  const toDate = req.query.to === undefined ? new Date(defaultTo.getTime() - 86_400_000) : parseDate(req.query.to);
  if (!from || !toDate || from > toDate) return null;
  const to = new Date(toDate.getTime() + 86_400_000);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (days > 366) return null;
  return { from, to, fromDate: dateOnly(from), toDate: dateOnly(toDate) };
}

function queryString(req: Parameters<RequestHandler>[0], name: string): string | undefined {
  const value = req.query[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pageFrom(req: Parameters<RequestHandler>[0]): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number.parseInt(queryString(req, "page") ?? "1", 10) || 1);
  const limit = Math.min(MAX_REPORT_ROWS, Math.max(1, Number.parseInt(queryString(req, "limit") ?? "24", 10) || 24));
  return { page, limit, offset: (page - 1) * limit };
}

function createdBetween(column: unknown, range: Range): Conditions {
  return [gte(column as never, range.from), lt(column as never, range.to)];
}

function withConditions(conditions: Conditions): any {
  const filtered = conditions.filter(Boolean);
  return filtered.length ? and(...filtered) : undefined;
}

async function countRows(table: unknown, conditions: Conditions): Promise<number> {
  const rows = await db.select({ value: sql<number>`count(*)` }).from(table as never).where(withConditions(conditions));
  const row = rows[0] as { value?: unknown } | undefined;
  return numberValue(row?.value);
}

async function groupedCounts(table: unknown, column: unknown, conditions: Conditions): Promise<Array<{ key: string; count: number }>> {
  const rows = (await db
    .select({ key: column as never, count: sql<number>`count(*)` })
    .from(table as never)
    .where(withConditions(conditions))
    .groupBy(column as never)
    .orderBy(desc(sql`count(*)`))) as Array<{ key?: unknown; count?: unknown }>;
  return rows
    .filter((row) => row.key !== null && row.key !== undefined)
    .map((row) => ({ key: String(row.key), count: numberValue(row.count) }));
}

async function currencyTotals(
  table: unknown,
  amountColumn: unknown,
  currencyColumn: unknown,
  conditions: Conditions,
): Promise<Array<{ currency: string; amount: number; records: number }>> {
  const rows = (await db
    .select({
      currency: currencyColumn as never,
      amount: sql<string>`coalesce(sum(${amountColumn as never}), 0)`,
      records: sql<number>`count(*)`,
    })
    .from(table as never)
    .where(withConditions(conditions))
    .groupBy(currencyColumn as never)
    .orderBy(currencyColumn as never)) as Array<{ currency?: unknown; amount?: unknown; records?: unknown }>;
  return rows.map((row) => ({
    currency: String(row.currency),
    amount: numberValue(row.amount),
    records: numberValue(row.records),
  }));
}

async function trend(
  table: unknown,
  dateColumn: unknown,
  conditions: Conditions,
  valueExpression = sql<number>`count(*)`,
): Promise<Array<{ date: string; value: number }>> {
  const day = sql<string>`to_char(${dateColumn as never} at time zone 'UTC', 'YYYY-MM-DD')`;
  const rows = (await db
    .select({ date: day, value: valueExpression })
    .from(table as never)
    .where(withConditions(conditions))
    .groupBy(day)
    .orderBy(day)) as Array<{ date?: unknown; value?: unknown }>;
  return rows.map((row) => ({ date: String(row.date), value: numberValue(row.value) }));
}

function fillTrend(range: Range, sources: Array<Array<{ date: string; value: number }>>, names: string[]) {
  const map = new Map<string, Record<string, number>>();
  for (let cursor = new Date(range.from); cursor < range.to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    map.set(dateOnly(cursor), {});
  }
  sources.forEach((source, index) => {
    for (const row of source) {
      const target = map.get(row.date);
      if (target) target[names[index]] = row.value;
    }
  });
  return [...map.entries()].map(([date, values]) => ({
    date,
    bookings: values.bookings ?? 0,
    payments: values.payments ?? 0,
    enquiries: values.enquiries ?? 0,
    reviews: values.reviews ?? 0,
  }));
}

function unavailableMetrics(role: ReportRole) {
  return [
    { key: "pageViews", label: "Page views", reason: "The platform does not currently collect page-view analytics." },
    { key: "returningUsers", label: "Returning users", reason: "The platform does not currently store visit identity or session analytics." },
    { key: "conversionRate", label: "Conversion rate", reason: "Reliable funnel events are not available in the current data model." },
    { key: "payouts", label: role === "vendor" ? "Vendor payouts" : "Payouts", reason: "Payouts are outside the current payment service boundary." },
    { key: "walletBalance", label: "Wallet balance", reason: "Wallet balances are user-level records and are not a platform or vendor revenue measure." },
  ];
}

function pageMeta(page: { page: number; limit: number; offset: number }, total: number) {
  return { page: page.page, limit: page.limit, total, hasMore: page.offset + page.limit < total };
}

function error(res: Parameters<RequestHandler>[1], status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

function baseResponse(role: ReportRole, range: Range, country: string | undefined) {
  return {
    role,
    source: "database",
    provenance: process.env.DEMO_MODE === "true" ? "demo" : "live",
    timezone: "UTC",
    generatedAt: new Date().toISOString(),
    range: { from: range.fromDate, to: range.toDate },
    filters: { country: country ?? null },
    unavailable: unavailableMetrics(role),
  };
}

function statusRows(rows: Array<{ key: string; count: number }>) {
  return rows.map(({ key, count }) => ({ status: key, count }));
}

async function reportForAdmin(req: Parameters<RequestHandler>[0], range: Range) {
  const country = queryString(req, "country");
  const status = queryString(req, "status");
  const page = pageFrom(req);
  const countryHotels = country
    ? await db.select({ id: hotels.id, catalogId: hotels.catalogId }).from(hotels).where(eq(hotels.country, country))
    : [];
  const countryHotelIds = countryHotels.map((row) => row.id);
  const countryCatalogIds = countryHotels.flatMap((row) => row.catalogId ? [row.catalogId] : []);
  const bookingConditions = [...createdBetween(bookings.createdAt, range), country ? inArray(bookings.hotelCatalogId, countryCatalogIds.length ? countryCatalogIds : ["__none__"]) : undefined, status ? eq(bookings.status, status) : undefined];
  const paymentConditions = [...createdBetween(payments.createdAt, range), status ? eq(payments.status, status) : undefined];
  const hotelConditions = [...createdBetween(hotels.createdAt, range), country ? eq(hotels.country, country) : undefined, status ? eq(hotels.status, status) : undefined];
  const destinationConditions = [...createdBetween(destinations.createdAt, range), country ? eq(destinations.country, country) : undefined];
  const propertyConditions = [...createdBetween(properties.createdAt, range), status ? eq(properties.status, status) : undefined];
  const enquiryConditions = [...createdBetween(propertyEnquiries.createdAt, range), status ? eq(propertyEnquiries.status, status) : undefined];
  const reviewConditions = [...createdBetween(reviews.createdAt, range), status ? eq(reviews.status, status) : undefined];
  const notificationConditions = createdBetween(notifications.createdAt, range);
  const userConditions = createdBetween(users.createdAt, range);
  const vendorConditions = [...createdBetween(vendorProfiles.createdAt, range), status ? eq(vendorProfiles.status, status) : undefined];

  const [
    totalUsers, totalVendors, totalHotels, totalDestinations, totalProperties, totalBookings,
    totalEnquiries, totalReviews, totalNotifications, totalPayments, paidPayments,
    bookingStatuses, paymentStatuses, enquiryStatuses, reviewRatings, userRolesCounts,
    bookingCurrencies, paymentCurrencies, bookingTrend, paymentTrend, enquiryTrend, reviewTrend,
    avgReview, hotelsByCountry, walletsCount, bookingRows, paymentRows, propertyRows, enquiryRows, vendorRows,
  ] = await Promise.all([
    countRows(users, userConditions),
    countRows(vendorProfiles, vendorConditions),
    countRows(hotels, hotelConditions),
    countRows(destinations, destinationConditions),
    countRows(properties, propertyConditions),
    countRows(bookings, bookingConditions),
    countRows(propertyEnquiries, enquiryConditions),
    countRows(reviews, reviewConditions),
    countRows(notifications, notificationConditions),
    countRows(payments, paymentConditions),
    countRows(payments, [...paymentConditions, eq(payments.status, "paid")]),
    groupedCounts(bookings, bookings.status, bookingConditions),
    groupedCounts(payments, payments.status, paymentConditions),
    groupedCounts(propertyEnquiries, propertyEnquiries.status, enquiryConditions),
    groupedCounts(reviews, reviews.rating, reviewConditions),
    groupedCounts(userRoles, userRoles.role, [gte(userRoles.createdAt, range.from), lt(userRoles.createdAt, range.to)]),
    currencyTotals(bookings, bookings.totalAmount, bookings.currency, bookingConditions),
    currencyTotals(payments, payments.amount, payments.currency, paymentConditions),
    trend(bookings, bookings.createdAt, bookingConditions),
    trend(payments, payments.createdAt, paymentConditions, sql<number>`coalesce(sum(${payments.amount}), 0)`),
    trend(propertyEnquiries, propertyEnquiries.createdAt, enquiryConditions),
    trend(reviews, reviews.createdAt, reviewConditions),
    db.select({ value: sql<string>`coalesce(avg(${reviews.rating}), 0)` }).from(reviews).where(withConditions(reviewConditions)),
    groupedCounts(hotels, hotels.country, hotelConditions),
    countRows(wallets, createdBetween(wallets.createdAt, range)),
    db.select().from(bookings).where(withConditions(bookingConditions)).orderBy(desc(bookings.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ payment: payments, booking: bookings }).from(payments).leftJoin(bookings, eq(payments.bookingId, bookings.id)).where(withConditions(paymentConditions)).orderBy(desc(payments.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ property: properties }).from(properties).where(withConditions(propertyConditions)).orderBy(desc(properties.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ enquiry: propertyEnquiries, property: properties }).from(propertyEnquiries).innerJoin(properties, eq(properties.id, propertyEnquiries.propertyId)).where(withConditions(enquiryConditions)).orderBy(desc(propertyEnquiries.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ profile: vendorProfiles, user: users }).from(vendorProfiles).innerJoin(users, eq(users.id, vendorProfiles.userId)).where(withConditions(vendorConditions)).orderBy(desc(vendorProfiles.createdAt)).limit(page.limit).offset(page.offset),
  ]);

  return {
    ...baseResponse("admin", range, country),
    kpis: {
      users: totalUsers,
      vendors: totalVendors,
      hotels: totalHotels,
      destinations: totalDestinations,
      properties: totalProperties,
      bookings: totalBookings,
      enquiries: totalEnquiries,
      reviews: totalReviews,
      notifications: totalNotifications,
      payments: totalPayments,
      paidPayments,
      averageRating: numberValue(avgReview[0]?.value),
      wallets: walletsCount,
    },
    breakdowns: {
      bookings: statusRows(bookingStatuses),
      payments: statusRows(paymentStatuses),
      enquiries: statusRows(enquiryStatuses),
      reviewRatings: reviewRatings.map(({ key, count }) => ({ rating: numberValue(key), count })),
      roles: statusRows(userRolesCounts),
      hotelsByCountry: statusRows(hotelsByCountry),
    },
    currencies: {
      bookings: bookingCurrencies,
      payments: paymentCurrencies,
    },
    trends: fillTrend(range, [bookingTrend, paymentTrend, enquiryTrend, reviewTrend], ["bookings", "payments", "enquiries", "reviews"]),
    tables: {
      bookings: bookingRows.map((row) => ({ id: row.id, reference: row.reference, hotelCatalogId: row.hotelCatalogId, startsOn: row.startsOn, endsOn: row.endsOn, totalAmount: numberValue(row.totalAmount), currency: row.currency, status: row.status, createdAt: row.createdAt })),
      payments: paymentRows.map(({ payment, booking }) => ({ id: payment.id, bookingReference: booking?.reference ?? null, amount: numberValue(payment.amount), currency: payment.currency, status: payment.status, provider: payment.provider, createdAt: payment.createdAt })),
      properties: propertyRows.map(({ property }) => ({ id: property.id, title: property.title, propertyType: property.propertyType, status: property.status, askingPrice: property.askingPrice === null ? null : numberValue(property.askingPrice), currency: property.currency, createdAt: property.createdAt })),
      enquiries: enquiryRows.map(({ enquiry, property }) => ({ id: enquiry.id, propertyTitle: property.title, status: enquiry.status, createdAt: enquiry.createdAt })),
      vendors: vendorRows.map(({ profile, user }) => ({ id: profile.userId, businessName: profile.businessName, country: profile.country, city: profile.city, status: profile.status, email: user.email, createdAt: profile.createdAt })),
    },
    meta: {
      bookings: pageMeta(page, totalBookings),
      payments: pageMeta(page, totalPayments),
      properties: pageMeta(page, totalProperties),
      enquiries: pageMeta(page, totalEnquiries),
      vendors: pageMeta(page, totalVendors),
    },
    supportedFilters: {
      countries: [...new Set(hotelsByCountry.map(({ key }) => key))].sort(),
      statuses: ["pending_payment", "confirmed", "cancelled", "paid", "failed", "published", "pending", "closed"],
    },
  };
}

async function reportForVendor(req: Parameters<RequestHandler>[0], range: Range) {
  const vendorId = req.localUser!.id;
  const country = queryString(req, "country");
  const status = queryString(req, "status");
  const page = pageFrom(req);
  const ownedHotels = await db.select({ id: hotels.id, catalogId: hotels.catalogId, country: hotels.country }).from(hotels).where(and(eq(hotels.ownerId, vendorId), country ? eq(hotels.country, country) : undefined));
  const hotelIds = ownedHotels.map((row) => row.id);
  const catalogIds = ownedHotels.flatMap((row) => row.catalogId ? [row.catalogId] : []);
  const ownedProperties = await db.select({ id: properties.id }).from(properties).where(eq(properties.ownerId, vendorId));
  const propertyIds = ownedProperties.map((row) => row.id);
  const bookingOwnershipConditions = [...createdBetween(bookings.createdAt, range), catalogIds.length ? inArray(bookings.hotelCatalogId, catalogIds) : eq(bookings.hotelCatalogId, "__none__")];
  const bookingConditions = [...bookingOwnershipConditions, status ? eq(bookings.status, status) : undefined];
  const vendorBookingIds = (await db.select({ id: bookings.id }).from(bookings).where(withConditions(bookingOwnershipConditions))).map((row) => row.id);
  const vendorPaymentOwnership = vendorBookingIds.length ? inArray(payments.bookingId, vendorBookingIds) : sql<boolean>`false`;
  const paymentConditions = [...createdBetween(payments.createdAt, range), vendorPaymentOwnership, status ? eq(payments.status, status) : undefined];
  const propertyConditions = [...createdBetween(properties.createdAt, range), eq(properties.ownerId, vendorId), status ? eq(properties.status, status) : undefined];
  const enquiryConditions = [...createdBetween(propertyEnquiries.createdAt, range), propertyIds.length ? inArray(propertyEnquiries.propertyId, propertyIds) : sql<boolean>`false`, status ? eq(propertyEnquiries.status, status) : undefined];
  const reviewConditions = [...createdBetween(reviews.createdAt, range), catalogIds.length || propertyIds.length ? or(inArray(reviews.entityId, catalogIds.length ? catalogIds : ["__none__"]), inArray(reviews.entityId, propertyIds.length ? propertyIds : ["__none__"])) : sql<boolean>`false`, status ? eq(reviews.status, status) : undefined];
  const roomConditions = hotelIds.length ? [inArray(hotelRooms.hotelId, hotelIds), ...createdBetween(hotelRooms.createdAt, range)] : [sql<boolean>`false`];
  const hotelConditions = [...createdBetween(hotels.createdAt, range), eq(hotels.ownerId, vendorId), country ? eq(hotels.country, country) : undefined, status ? eq(hotels.status, status) : undefined];

  const [
    totalHotels, totalRooms, totalProperties, totalBookings, totalEnquiries, totalReviews, totalPayments, paidPayments,
    bookingStatuses, paymentStatuses, enquiryStatuses, reviewRatings, bookingCurrencies, paymentCurrencies,
    bookingTrend, paymentTrend, enquiryTrend, reviewTrend, avgReview, bookingRows, paymentRows, propertyRows, enquiryRows,
  ] = await Promise.all([
    countRows(hotels, hotelConditions),
    countRows(hotelRooms, roomConditions),
    countRows(properties, propertyConditions),
    countRows(bookings, bookingConditions),
    countRows(propertyEnquiries, enquiryConditions),
    countRows(reviews, reviewConditions),
    countRows(payments, paymentConditions),
    countRows(payments, [...paymentConditions, eq(payments.status, "paid")]),
    groupedCounts(bookings, bookings.status, bookingConditions),
    groupedCounts(payments, payments.status, paymentConditions),
    groupedCounts(propertyEnquiries, propertyEnquiries.status, enquiryConditions),
    groupedCounts(reviews, reviews.rating, reviewConditions),
    currencyTotals(bookings, bookings.totalAmount, bookings.currency, bookingConditions),
    currencyTotals(payments, payments.amount, payments.currency, paymentConditions),
    trend(bookings, bookings.createdAt, bookingConditions),
    trend(payments, payments.createdAt, paymentConditions, sql<number>`coalesce(sum(${payments.amount}), 0)`),
    trend(propertyEnquiries, propertyEnquiries.createdAt, enquiryConditions),
    trend(reviews, reviews.createdAt, reviewConditions),
    db.select({ value: sql<string>`coalesce(avg(${reviews.rating}), 0)` }).from(reviews).where(withConditions(reviewConditions)),
    db.select().from(bookings).where(withConditions(bookingConditions)).orderBy(desc(bookings.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ payment: payments, booking: bookings }).from(payments).leftJoin(bookings, eq(payments.bookingId, bookings.id)).where(withConditions(paymentConditions)).orderBy(desc(payments.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ property: properties }).from(properties).where(withConditions(propertyConditions)).orderBy(desc(properties.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ enquiry: propertyEnquiries, property: properties }).from(propertyEnquiries).innerJoin(properties, eq(properties.id, propertyEnquiries.propertyId)).where(withConditions(enquiryConditions)).orderBy(desc(propertyEnquiries.createdAt)).limit(page.limit).offset(page.offset),
  ]);

  return {
    ...baseResponse("vendor", range, country),
    kpis: { hotels: totalHotels, rooms: totalRooms, properties: totalProperties, bookings: totalBookings, enquiries: totalEnquiries, reviews: totalReviews, payments: totalPayments, paidPayments, averageRating: numberValue(avgReview[0]?.value) },
    breakdowns: {
      bookings: statusRows(bookingStatuses),
      payments: statusRows(paymentStatuses),
      enquiries: statusRows(enquiryStatuses),
      reviewRatings: reviewRatings.map(({ key, count }) => ({ rating: numberValue(key), count })),
    },
    currencies: { bookings: bookingCurrencies, payments: paymentCurrencies },
    trends: fillTrend(range, [bookingTrend, paymentTrend, enquiryTrend, reviewTrend], ["bookings", "payments", "enquiries", "reviews"]),
    tables: {
      bookings: bookingRows.map((row) => ({ id: row.id, reference: row.reference, hotelCatalogId: row.hotelCatalogId, startsOn: row.startsOn, endsOn: row.endsOn, totalAmount: numberValue(row.totalAmount), currency: row.currency, status: row.status, createdAt: row.createdAt })),
      payments: paymentRows.map(({ payment, booking }) => ({ id: payment.id, bookingReference: booking?.reference ?? null, amount: numberValue(payment.amount), currency: payment.currency, status: payment.status, provider: payment.provider, createdAt: payment.createdAt })),
      properties: propertyRows.map(({ property }) => ({ id: property.id, title: property.title, propertyType: property.propertyType, status: property.status, askingPrice: property.askingPrice === null ? null : numberValue(property.askingPrice), currency: property.currency, createdAt: property.createdAt })),
      enquiries: enquiryRows.map(({ enquiry, property }) => ({ id: enquiry.id, propertyTitle: property.title, status: enquiry.status, createdAt: enquiry.createdAt })),
    },
    meta: { bookings: pageMeta(page, totalBookings), payments: pageMeta(page, totalPayments), properties: pageMeta(page, totalProperties), enquiries: pageMeta(page, totalEnquiries) },
    supportedFilters: {
      countries: [...new Set(ownedHotels.map((hotel) => hotel.country).filter((value): value is string => Boolean(value)))].sort(),
      statuses: ["pending_payment", "confirmed", "cancelled", "paid", "failed", "published", "pending", "closed"],
    },
  };
}

export function createReportsRouter(authenticate: RequestHandler = requireAuth): IRouter {
  const router = Router();
  router.get("/v1/admin/reports", authenticate, requireRole("admin"), async (req, res) => {
    const range = reportRange(req);
    if (!range) {
      error(res, 400, "INVALID_REPORT_RANGE", "Provide valid UTC dates from and to within one year.");
      return;
    }
    try {
      res.json(await reportForAdmin(req, range));
    } catch {
      error(res, 503, "REPORT_UNAVAILABLE", "Reporting data is temporarily unavailable. Try again.");
    }
  });
  router.get("/v1/vendor/reports", authenticate, requireRole("vendor"), async (req, res) => {
    if (!(await requireApprovedVendor(req, res))) return;
    const range = reportRange(req);
    if (!range) {
      error(res, 400, "INVALID_REPORT_RANGE", "Provide valid UTC dates from and to within one year.");
      return;
    }
    try {
      res.json(await reportForVendor(req, range));
    } catch {
      error(res, 503, "REPORT_UNAVAILABLE", "Reporting data is temporarily unavailable. Try again.");
    }
  });
  return router;
}

export default createReportsRouter();