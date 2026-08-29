import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, favorites } from "@workspace/db";
import {
  AddFavoriteParams,
  AddFavoriteResponse,
  ListFavoritesResponse,
  RemoveFavoriteParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const favoritesRouter: IRouter = Router();
favoritesRouter.use(requireAuth);

function invalidParams(res: Parameters<Parameters<IRouter["get"]>[1]>[1], message: string): void {
  res.status(400).json({ error: { code: "INVALID_INPUT", message } });
}

favoritesRouter.get("/v1/favorites", async (req, res): Promise<void> => {
  const items = await db
    .select({
      entityType: favorites.entityType,
      entityId: favorites.entityId,
    })
    .from(favorites)
    .where(eq(favorites.userId, req.localUser!.id))
    .orderBy(asc(favorites.createdAt));

  res.json(ListFavoritesResponse.parse({ items }));
});

favoritesRouter.put("/v1/favorites/:entityType/:entityId", async (req, res): Promise<void> => {
  const parsed = AddFavoriteParams.safeParse(req.params);
  if (!parsed.success) {
    invalidParams(res, parsed.error.message);
    return;
  }

  const [favorite] = await db
    .insert(favorites)
    .values({
      userId: req.localUser!.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    })
    .onConflictDoUpdate({
      target: [favorites.userId, favorites.entityType, favorites.entityId],
      set: { updatedAt: new Date() },
    })
    .returning({
      entityType: favorites.entityType,
      entityId: favorites.entityId,
    });

  res.json(AddFavoriteResponse.parse(favorite));
});

favoritesRouter.delete("/v1/favorites/:entityType/:entityId", async (req, res): Promise<void> => {
  const parsed = RemoveFavoriteParams.safeParse(req.params);
  if (!parsed.success) {
    invalidParams(res, parsed.error.message);
    return;
  }

  await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, req.localUser!.id),
        eq(favorites.entityType, parsed.data.entityType),
        eq(favorites.entityId, parsed.data.entityId),
      ),
    );

  res.sendStatus(204);
});

export default favoritesRouter;