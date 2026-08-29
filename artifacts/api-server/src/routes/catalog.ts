import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth.ts";
import { getDestinationDetail } from "./catalog-detail.ts";
import {
  attractions,
  banners,
  destinations,
  events,
  foods,
  homeNotice,
  hotels,
  nearby,
  properties,
  temples,
} from "./catalog-data.ts";

export {
  attractions,
  banners,
  destinations,
  events,
  foods,
  homeNotice,
  hotels,
  nearby,
  properties,
  temples,
} from "./catalog-data.ts";

const catalogRouter: IRouter = Router();
export { getDestinationDetail } from "./catalog-detail.ts";

catalogRouter.get("/v1/home", (_req, res) => {
  res.json({
    notice: homeNotice,
    banners,
    destinations,
    nearby,
    events,
    hotels,
    properties,
    featuredDestinations: destinations,
    featuredProperties: properties,
  });
});

catalogRouter.get("/v1/home/banners", (_req, res) => {
  res.json({ items: banners });
});

catalogRouter.get("/v1/home/destinations", (_req, res) => {
  res.json({ items: destinations });
});

catalogRouter.get("/v1/home/nearby", (_req, res) => {
  res.json({ items: nearby });
});

catalogRouter.get("/v1/home/events", (_req, res) => {
  res.json({ items: events });
});

catalogRouter.get("/v1/home/hotels", (_req, res) => {
  res.json({ items: hotels });
});

catalogRouter.get("/v1/home/properties", (_req, res) => {
  res.json({ items: properties });
});

catalogRouter.get("/v1/destinations", (_req, res) => {
  res.json({ items: destinations });
});

catalogRouter.get("/v1/destinations/:id", (req, res) => {
  const detail = getDestinationDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Destination not found" } });
    return;
  }
  res.json(detail);
});

catalogRouter.get("/v1/properties", (_req, res) => {
  res.json({ items: properties });
});

catalogRouter.get("/v1/properties/:id", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found" } });
    return;
  }
  res.json(property);
});

catalogRouter.post("/v1/properties/:id/enquiries", requireAuth, (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found" } });
    return;
  }
  req.log.info({ propertyId: property.id }, "Development property enquiry accepted");
  res.status(202).json({
    id: `dev-enquiry-${Date.now()}`,
    status: "received",
    message: "A sourcing specialist will follow up after the service is configured.",
  });
});

export default catalogRouter;