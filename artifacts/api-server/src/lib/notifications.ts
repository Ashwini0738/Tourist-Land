import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, notifications, pushTokens } from "@workspace/db";
import { logger } from "./logger.ts";

export type NotificationType =
  | "booking_created"
  | "payment_pending"
  | "payment_successful"
  | "payment_failed"
  | "booking_confirmed"
  | "booking_cancelled"
  | "refund_processed"
  | "land_enquiry_updated";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  relatedType?: string | null;
  relatedId?: string | null;
  dedupeKey?: string | null;
};

type NotificationExecutor = Pick<typeof db, "insert">;

function payload(row: typeof notifications.$inferSelect) {
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? row.data as Record<string, unknown>
    : {};
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.body,
    relatedType: typeof data.relatedType === "string" ? data.relatedType : null,
    relatedId: typeof data.relatedId === "string" ? data.relatedId : null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotification(
  userId: string,
  input: NotificationInput,
  executor: NotificationExecutor = db,
) {
  const data = {
    ...(input.relatedType ? { relatedType: input.relatedType } : {}),
    ...(input.relatedId ? { relatedId: input.relatedId } : {}),
  };
  const [row] = await executor
    .insert(notifications)
    .values({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data,
      dedupeKey: input.dedupeKey ?? null,
      status: "sent",
    })
    .onConflictDoNothing({ target: [notifications.userId, notifications.dedupeKey] })
    .returning();
  return row ? payload(row) : null;
}

export type PropertyEnquiryPublicStatus = "contacted" | "closed";

type PropertyEnquiryPushMessage = {
  to: string;
  title: string;
  body: string;
  data: {
    propertyName: string;
    status: PropertyEnquiryPublicStatus;
  };
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function sendExpoPushBatch(messages: PropertyEnquiryPushMessage[]) {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    // The status code is enough to classify an invalid provider response.
  }

  if (!response.ok) {
    throw new Error(`Expo push provider returned HTTP ${response.status}.`);
  }

  const tickets = isRecord(responseBody) && Array.isArray(responseBody.data)
    ? responseBody.data
    : [];
  const rejected = tickets.filter((ticket) => isRecord(ticket) && ticket.status === "error").length;
  if (rejected > 0) {
    logger.warn({ rejected, attempted: messages.length }, "Expo push provider rejected notification tickets");
  }
}

export async function createPropertyEnquiryStatusNotification(
  userId: string,
  input: {
    enquiryId: string;
    propertyId: string;
    propertyName: string;
    status: PropertyEnquiryPublicStatus;
  },
  executor: NotificationExecutor = db,
) {
  const statusLabel = input.status === "contacted" ? "Contacted" : "Closed";
  return createNotification(userId, {
    type: "land_enquiry_updated",
    title: "Property enquiry updated",
    body: `Your enquiry for ${input.propertyName} is now ${statusLabel}.`,
    relatedType: "property",
    relatedId: input.propertyId,
    dedupeKey: `property-enquiry-status:${input.enquiryId}:${input.status}`,
  }, executor);
}

export async function sendPropertyEnquiryStatusPush(
  userId: string,
  input: {
    propertyName: string;
    status: PropertyEnquiryPublicStatus;
  },
) {
  try {
    const rows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(and(
        eq(pushTokens.userId, userId),
        inArray(pushTokens.platform, ["android", "ios"]),
        isNull(pushTokens.revokedAt),
      ));
    if (!rows.length) return { attempted: 0 };

    const messages = rows.map(({ token }): PropertyEnquiryPushMessage => ({
      to: token,
      title: "Property enquiry updated",
      body: `Your enquiry for ${input.propertyName} is now ${input.status === "contacted" ? "Contacted" : "Closed"}.`,
      data: {
        propertyName: input.propertyName,
        status: input.status,
      },
    }));

    for (let start = 0; start < messages.length; start += EXPO_PUSH_BATCH_SIZE) {
      const batch = messages.slice(start, start + EXPO_PUSH_BATCH_SIZE);
      try {
        await sendExpoPushBatch(batch);
      } catch (error) {
        logger.warn({ err: error, attempted: batch.length }, "Expo push delivery failed");
      }
    }
    return { attempted: messages.length };
  } catch (error) {
    logger.warn({ err: error, userId }, "Could not load registered push tokens");
    return { attempted: 0 };
  }
}

export async function listNotifications(userId: string, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.userId, userId)),
  ]);
  return {
    items: rows.map(payload),
    page,
    limit,
    hasMore: offset + rows.length < Number(count),
  };
}

export async function getNotification(userId: string, id: string) {
  const [row] = await db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
  return row ? payload(row) : null;
}

export async function markNotificationRead(userId: string, id: string) {
  const [row] = await db.update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)))
    .returning();
  return row ? payload(row) : null;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await db.update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { updated: result.rowCount ?? 0 };
}

export async function getUnreadNotificationCount(userId: string) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { count: Number(count) };
}

export async function registerPushToken(userId: string, token: string, platform: string) {
  const [row] = await db.insert(pushTokens).values({
    userId,
    token,
    platform,
    lastSeenAt: new Date(),
    revokedAt: null,
  }).onConflictDoUpdate({
    target: [pushTokens.userId, pushTokens.token],
    set: { platform, lastSeenAt: new Date(), revokedAt: null, updatedAt: new Date() },
  }).returning();
  return row ? { id: row.id, platform: row.platform, registered: true } : null;
}

export async function revokePushToken(userId: string, token: string) {
  await db.update(pushTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

export function notificationPayload(row: typeof notifications.$inferSelect) {
  return payload(row);
}