import {
  boolean,
  check,
  date,
  integer,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    role: text("role").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_role_unique").on(table.userId, table.role),
    check("user_role_valid", sql`${table.role} in ('user', 'vendor', 'admin')`),
  ],
);

export const vendorProfiles = pgTable(
  "vendor_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique("vendor_profiles_user_id_key"),
    businessName: text("business_name").notNull(),
    businessType: text("business_type").notNull(),
    contactName: text("contact_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull(),
    status: text("status").default("pending").notNull(),
    ...timestamps,
  },
  (table) => [
    check("vendor_profile_status_valid", sql`${table.status} in ('pending', 'approved', 'rejected', 'suspended')`),
  ],
);

export const vendorApplications = pgTable(
  "vendor_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    businessName: text("business_name").notNull(),
    businessType: text("business_type").notNull(),
    contactName: text("contact_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull(),
    status: text("status").default("pending").notNull(),
    clerkInvitationId: text("clerk_invitation_id"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vendor_application_email_unique").on(table.email),
    check("vendor_application_status_valid", sql`${table.status} in ('pending', 'approved', 'invited', 'accepted', 'rejected', 'revoked')`),
  ],
);

export const vendorApprovalHistory = pgTable(
  "vendor_approval_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id").references(() => vendorApplications.id, { onDelete: "cascade" }).notNull(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
    businessName: text("business_name").notNull(),
    vendorEmail: text("vendor_email").notNull(),
    invitationCreated: boolean("invitation_created").notNull(),
    approvalEmailStatus: text("approval_email_status").notNull(),
    ...timestamps,
  },
  (table) => [
    index("vendor_approval_history_application_idx").on(table.applicationId),
    index("vendor_approval_history_approved_at_idx").on(table.approvedAt),
    check("vendor_approval_history_email_status_valid", sql`${table.approvalEmailStatus} in ('sent', 'failed')`),
  ],
);

export const adminInvitations = pgTable(
  "admin_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    clerkInvitationId: text("clerk_invitation_id"),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
    status: text("status").default("pending").notNull(),
    acceptedUserId: uuid("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check("admin_invitation_status_valid", sql`${table.status} in ('pending', 'sent', 'accepted', 'revoked')`),
  ],
);

export const authenticationSessions = pgTable("authentication_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  providerSessionId: text("provider_session_id").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  summary: text("summary"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  status: text("status").default("draft").notNull(),
  ...timestamps,
});

export const destinationImages = pgTable("destination_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "cascade" }).notNull(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...timestamps,
});

export const attractions = pgTable("attractions", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: text("status").default("scheduled").notNull(),
  ...timestamps,
});

export const foodPlaces = pgTable("food_places", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  cuisine: text("cuisine"),
  address: text("address"),
  priceLevel: integer("price_level"),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const hotels = pgTable("hotels", {
  id: uuid("id").defaultRandom().primaryKey(),
  catalogId: text("catalog_id").unique(),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  propertyType: text("property_type").default("hotel"),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  website: text("website"),
  amenities: jsonb("amenities").default([]).notNull(),
  imageUrls: jsonb("image_urls").default([]).notNull(),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  status: text("status").default("draft").notNull(),
  approvalStatus: text("approval_status").default("pending").notNull(),
  ...timestamps,
}, (table) => [
  check("hotel_status_valid", sql`${table.status} in ('draft', 'published', 'archived')`),
  check("hotel_approval_status_valid", sql`${table.approvalStatus} in ('pending', 'approved', 'rejected')`),
  check("hotel_coordinates_pair", sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null)`),
]);

export const hotelRooms = pgTable("hotel_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  catalogRoomId: text("catalog_room_id").unique(),
  hotelId: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  bedType: text("bed_type"),
  capacity: integer("capacity").notNull(),
  totalUnits: integer("total_units").default(1).notNull(),
  nightlyRate: numeric("nightly_rate", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  amenities: jsonb("amenities").default([]).notNull(),
  imageUrls: jsonb("image_urls").default([]).notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [
  check("hotel_room_capacity_positive", sql`${table.capacity} > 0`),
  check("hotel_room_total_units_positive", sql`${table.totalUnits} > 0`),
  check("hotel_room_rate_non_negative", sql`${table.nightlyRate} >= 0`),
  check("hotel_room_status_valid", sql`${table.status} in ('active', 'inactive')`),
]);

export const roomAvailability = pgTable(
  "room_availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").references(() => hotelRooms.id, { onDelete: "cascade" }).notNull(),
    date: date("date").notNull(),
    availableUnits: integer("available_units").default(0).notNull(),
    priceOverride: numeric("price_override", { precision: 12, scale: 2 }),
    status: text("status").default("available").notNull(),
    blackoutReason: text("blackout_reason"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("room_availability_unique").on(table.roomId, table.date),
    check("room_availability_units_non_negative", sql`${table.availableUnits} >= 0`),
    check("room_availability_price_non_negative", sql`${table.priceOverride} is null or ${table.priceOverride} >= 0`),
    check("room_availability_status_valid", sql`${table.status} in ('available', 'blackout')`),
  ],
);

export const vendorAuditLogs = pgTable(
  "vendor_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorId: uuid("vendor_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (table) => [
    index("vendor_audit_vendor_created_idx").on(table.vendorId, table.createdAt),
    index("vendor_audit_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (table) => [
    index("admin_audit_created_idx").on(table.createdAt),
    index("admin_audit_entity_idx").on(table.entityType, table.entityId),
    index("admin_audit_admin_idx").on(table.adminUserId, table.createdAt),
  ],
);

export const featuredContent = pgTable(
  "featured_content",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default("active").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("featured_content_entity_unique").on(table.entityType, table.entityId),
    index("featured_content_order_idx").on(table.status, table.sortOrder),
    check("featured_content_entity_type_valid", sql`${table.entityType} in ('destination', 'hotel', 'event', 'offer')`),
    check("featured_content_status_valid", sql`${table.status} in ('active', 'inactive')`),
    check("featured_content_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
    reference: text("reference").notNull().unique(),
    idempotencyKey: text("idempotency_key"),
    hotelCatalogId: text("hotel_catalog_id").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").default(0).notNull(),
    guestCount: integer("guest_count").notNull(),
    roomCount: integer("room_count").notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("INR").notNull(),
    status: text("status").default("pending_payment").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("booking_user_idempotency_unique").on(table.userId, table.idempotencyKey),
    check("booking_status_valid", sql`${table.status} in ('pending_payment', 'confirmed', 'cancelled')`),
  ],
);

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  roomId: uuid("room_id").references(() => hotelRooms.id, { onDelete: "restrict" }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitAmount: numeric("unit_amount", { precision: 12, scale: 2 }).notNull(),
  ...timestamps,
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("INR").notNull(),
    status: text("status").default("unpaid").notNull(),
    ...timestamps,
  },
  (table) => [
    check("payment_status_valid", sql`${table.status} in ('created', 'unpaid', 'processing', 'paid', 'failed', 'cancelled')`),
  ],
);

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("INR").notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "cascade" }).notNull(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  status: text("status").default("posted").notNull(),
  ...timestamps,
});

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  propertyType: text("property_type").notNull(),
  address: text("address").notNull(),
  areaValue: numeric("area_value", { precision: 12, scale: 2 }).notNull(),
  areaUnit: text("area_unit").notNull(),
  askingPrice: numeric("asking_price", { precision: 14, scale: 2 }),
  currency: text("currency").default("INR").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  isVerified: boolean("is_verified").default(false).notNull(),
  status: text("status").default("pending").notNull(),
  ...timestamps,
});

export const propertyImages = pgTable("property_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...timestamps,
});

export const propertyEnquiries = pgTable("property_enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  idempotencyKey: text("idempotency_key"),
  message: text("message"),
  preferredContactMethod: text("preferred_contact_method"),
  status: text("status").default("new").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("property_enquiry_user_idempotency_unique").on(table.userId, table.idempotencyKey),
  check("property_enquiry_status_valid", sql`${table.status} in ('new', 'contacted', 'closed')`),
]);

export const propertyEnquiryHistory = pgTable(
  "property_enquiry_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enquiryId: uuid("enquiry_id").references(() => propertyEnquiries.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull(),
    note: text("note"),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("property_enquiry_history_enquiry_idx").on(table.enquiryId, table.createdAt),
    check("property_enquiry_history_status_valid", sql`${table.status} in ('new', 'contacted', 'closed')`),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("favorite_unique").on(table.userId, table.entityType, table.entityId)],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  status: text("status").default("pending").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("review_user_entity_booking_unique").on(table.userId, table.entityType, table.entityId, table.bookingId),
  check("review_rating_valid", sql`${table.rating} between 1 and 5`),
  check("review_status_valid", sql`${table.status} in ('pending', 'published', 'rejected')`),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  dedupeKey: text("dedupe_key"),
  readAt: timestamp("read_at", { withTimezone: true }),
  status: text("status").default("sent").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("notification_user_dedupe_unique").on(table.userId, table.dedupeKey),
  index("notifications_user_created_idx").on(table.userId, table.createdAt),
  index("notifications_user_unread_idx").on(table.userId, table.readAt),
]);

export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  platform: text("platform").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("push_token_user_unique").on(table.userId, table.token),
  index("push_tokens_token_idx").on(table.token),
]);

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  hotelId: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  discountType: text("discount_type"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: text("status").default("draft").notNull(),
  ...timestamps,
});

/**
 * A traveller's itinerary is intentionally separate from bookings and the
 * discovery catalog.  Trip items retain references (rather than copying or
 * deleting catalog rows), so archived/deleted itineraries cannot affect
 * commerce or provenance data.
 */
export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [
  index("trips_user_status_idx").on(table.userId, table.status),
  index("trips_user_updated_idx").on(table.userId, table.updatedAt),
  check("trip_status_valid", sql`${table.status} in ('active', 'archived')`),
  check("trip_dates_ordered", sql`${table.startsOn} is null or ${table.endsOn} is null or ${table.startsOn} <= ${table.endsOn}`),
]);

export const tripItems = pgTable("trip_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  note: text("note"),
  ...timestamps,
}, (table) => [
  uniqueIndex("trip_item_entity_unique").on(table.tripId, table.entityType, table.entityId),
  index("trip_items_order_idx").on(table.tripId, table.sortOrder),
  check("trip_item_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
]);