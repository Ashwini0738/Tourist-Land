import { Router, type IRouter } from "express";
import {
  GetHotelResponse,
  GetHotelAvailabilityResponse,
  ListHotelNearbyResponse,
  ListHotelRoomsResponse,
  SearchHotelsResponse,
} from "@workspace/api-zod";
import {
  getHotelCatalogRecord,
  getHotelDetail,
  getHotelNearby,
  getManagedHotelRooms,
  getHotelRooms,
  parseHotelSearchInput,
  searchHotelCatalog,
} from "./hotel-catalog.ts";
import {
  getHotelAvailability,
  getManagedHotelAvailability,
  parseHotelAvailabilityInput,
} from "./hotel-availability.ts";

const hotelsRouter: IRouter = Router();

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

hotelsRouter.get("/v1/hotels", (req, res) => {
  const parsed = parseHotelSearchInput(req.query as Record<string, unknown>);
  if ("error" in parsed) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error } });
    return;
  }

  res.json(SearchHotelsResponse.parse(searchHotelCatalog(parsed)));
});

hotelsRouter.get("/v1/hotels/:id", (req, res) => {
  const id = routeId(req.params.id);
  const detail = id ? getHotelDetail(id) : null;
  if (!detail) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found" } });
    return;
  }
  res.json(GetHotelResponse.parse(detail));
});

hotelsRouter.get("/v1/hotels/:id/rooms", async (req, res) => {
  const id = routeId(req.params.id);
  const managed = id ? await getManagedHotelRooms(id) : null;
  const rooms = managed ?? (id ? getHotelRooms(id) : null);
  if (!rooms) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found" } });
    return;
  }
  res.json(ListHotelRoomsResponse.parse(rooms));
});

hotelsRouter.get("/v1/hotels/:id/availability", async (req, res) => {
  const id = routeId(req.params.id);
  if (!id) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found" } });
    return;
  }
  const parsed = parseHotelAvailabilityInput(req.query as Record<string, unknown>);
  if ("error" in parsed) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error } });
    return;
  }
  const managed = await getManagedHotelAvailability(id, parsed);
  if (!getHotelCatalogRecord(id) && !managed) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found" } });
    return;
  }
  res.json(GetHotelAvailabilityResponse.parse(managed ?? getHotelAvailability(id, parsed)));
});

hotelsRouter.get("/v1/hotels/:id/nearby", (req, res) => {
  const id = routeId(req.params.id);
  const places = id ? getHotelNearby(id) : null;
  if (!places) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Hotel not found" } });
    return;
  }
  res.json(ListHotelNearbyResponse.parse(places));
});

export default hotelsRouter;