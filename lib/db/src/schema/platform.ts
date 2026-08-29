import {
  boolean,
  check,
  date,
  integer,
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
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
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
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  status: text("status").default("pending").notNull(),
  ...timestamps,
});

export const hotelRooms = pgTable("hotel_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  hotelId: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  nightlyRate: numeric("nightly_rate", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const roomAvailability = pgTable(
  "room_availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").references(() => hotelRooms.id, { onDelete: "cascade" }).notNull(),
    date: date("date").notNull(),
    availableUnits: integer("available_units").default(0).notNull(),
    priceOverride: numeric("price_override", { precision: 12, scale: 2 }),
    status: text("status").default("available").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("room_availability_unique").on(table.roomId, table.date)],
);

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  reference: text("reference").notNull().unique(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  guestCount: integer("guest_count").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: text("status").default("pending").notNull(),
  ...timestamps,
});

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  roomId: uuid("room_id").references(() => hotelRooms.id, { onDelete: "restrict" }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitAmount: numeric("unit_amount", { precision: 12, scale: 2 }).notNull(),
  ...timestamps,
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: text("status").default("created").notNull(),
  ...timestamps,
});

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
  message: text("message"),
  preferredContactMethod: text("preferred_contact_method"),
  status: text("status").default("new").notNull(),
  ...timestamps,
});

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("favorite_unique").on(table.userId, table.entityType, table.entityId)],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  status: text("status").default("pending").notNull(),
  ...timestamps,
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  readAt: timestamp("read_at", { withTimezone: true }),
  status: text("status").default("sent").notNull(),
  ...timestamps,
});

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