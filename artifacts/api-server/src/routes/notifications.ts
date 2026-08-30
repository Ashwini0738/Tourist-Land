import { Router, type IRouter } from "express";
import { RegisterPushTokenBody, RevokePushTokenBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth.ts";
import {
  getNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushToken,
  revokePushToken,
} from "../lib/notifications.ts";

const notificationsRouter: IRouter = Router();
notificationsRouter.use(requireAuth);

function pageInput(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function invalid(res: Parameters<Parameters<IRouter["get"]>[1]>[1], message: string) {
  res.status(400).json({ error: { code: "INVALID_INPUT", message } });
}

notificationsRouter.get("/v1/notifications", async (req, res): Promise<void> => {
  const page = pageInput(req.query.page, 1, 10_000);
  const limit = pageInput(req.query.limit, 20, 50);
  res.json(await listNotifications(req.localUser!.id, page, limit));
});

notificationsRouter.get("/v1/notifications/unread-count", async (req, res): Promise<void> => {
  res.json(await getUnreadNotificationCount(req.localUser!.id));
});

notificationsRouter.post("/v1/notifications/read-all", async (req, res): Promise<void> => {
  res.json(await markAllNotificationsRead(req.localUser!.id));
});

notificationsRouter.post("/v1/notifications/push-token", async (req, res): Promise<void> => {
  const parsed = RegisterPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, "A valid push token and platform are required.");
    return;
  }
  res.status(201).json(await registerPushToken(req.localUser!.id, parsed.data.token, parsed.data.platform));
});

notificationsRouter.post("/v1/notifications/push-token/revoke", async (req, res): Promise<void> => {
  const parsed = RevokePushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, "A push token is required.");
    return;
  }
  await revokePushToken(req.localUser!.id, parsed.data.token);
  res.sendStatus(204);
});

notificationsRouter.post("/v1/notifications/:id/read", async (req, res): Promise<void> => {
  const item = await markNotificationRead(req.localUser!.id, req.params.id);
  if (!item) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found." } });
    return;
  }
  res.json(item);
});

notificationsRouter.get("/v1/notifications/:id", async (req, res): Promise<void> => {
  const item = await getNotification(req.localUser!.id, req.params.id);
  if (!item) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found." } });
    return;
  }
  res.json(item);
});

export default notificationsRouter;