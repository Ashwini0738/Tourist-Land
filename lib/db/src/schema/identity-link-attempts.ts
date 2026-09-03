import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./platform.ts";

export const identityLinkAttempts = pgTable(
  "identity_link_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    supabaseUserId: uuid("supabase_user_id"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("identity_link_attempt_user_status_idx").on(table.userId, table.status),
    index("identity_link_attempt_expires_idx").on(table.expiresAt),
    check(
      "identity_link_attempt_status_valid",
      sql`${table.status} in ('pending', 'completed', 'cancelled', 'expired')`,
    ),
  ],
);

export type IdentityLinkAttempt = typeof identityLinkAttempts.$inferSelect;