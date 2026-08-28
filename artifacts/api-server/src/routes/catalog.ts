import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const catalogRouter: IRouter = Router();

const destinations = [
  {
    id: "konkan",
    slug: "konkan-coast",
    name: "Konkan Coast",
    region: "Maharashtra, India",
    country: "India",
    summary: "Where the forest meets the sea.",
    imageKey: "coastline",
  },
  {
    id: "coorg",
    slug: "coorg-highlands",
    name: "Coorg Highlands",
    region: "Karnataka, India",
    country: "India",
    summary: "Misty mornings and open roads.",
    imageKey: "highlands",
  },
];

const properties = [
  {
    id: "riverstone-estate",
    slug: "riverstone-estate",
    title: "Riverstone Estate",
    location: "Sakleshpur, Karnataka",
    area: "2.4 acres",
    propertyType: "Agri-tourism",
    verified: true,
    description: "A development preview of a gently sloping parcel with road access, mature trees, and a seasonal stream.",
    discoveryLabel: "Development property preview",
    priceLabel: "Sample asking price · ₹1.85 Cr",
    imageKey: "highlands",
  },
  {
    id: "sea-wind-grove",
    slug: "sea-wind-grove",
    title: "Sea Wind Grove",
    location: "Guhagar, Maharashtra",
    area: "1.1 acres",
    propertyType: "Coastal retreat",
    verified: true,
    description: "A development preview of a private grove near the coast in a quiet village setting.",
    discoveryLabel: "Development property preview",
    priceLabel: "Sample asking price · ₹92 L",
    imageKey: "coastline",
  },
];

const banners = [
  {
    id: "konkan-discovery",
    title: "A slower coast, in view",
    subtitle: "Explore the Konkan Coast development preview.",
    ctaLabel: "Explore the coast",
    destinationId: "konkan",
    imageKey: "coastline",
  },
  {
    id: "coorg-discovery",
    title: "Misty roads ahead",
    subtitle: "Explore the Coorg Highlands development preview.",
    ctaLabel: "Explore the highlands",
    destinationId: "coorg",
    imageKey: "highlands",
  },
];

const nearby = [
  {
    id: "konkan-lighthouse-walk",
    name: "Coastal Lighthouse Walk",
    category: "Scenic walk",
    location: "Konkan Coast, Maharashtra",
    summary: "A popular seed suggestion for a relaxed shoreline walk.",
    destinationId: "konkan",
    imageKey: "coastline",
  },
  {
    id: "coorg-coffee-trail",
    name: "Coffee Estate Trail",
    category: "Nature trail",
    location: "Coorg Highlands, Karnataka",
    summary: "A popular seed suggestion for an unhurried highland outing.",
    destinationId: "coorg",
    imageKey: "highlands",
  },
];

const events = [
  {
    id: "konkan-sunset-stories",
    title: "Sunset Stories",
    dateLabel: "Sample programme · Saturday evening",
    location: "Konkan Coast, Maharashtra",
    summary: "A development event preview celebrating coastal stories and local culture.",
    destinationId: "konkan",
    imageKey: "coastline",
  },
  {
    id: "coorg-harvest-notes",
    title: "Harvest Notes",
    dateLabel: "Sample programme · Sunday morning",
    location: "Coorg Highlands, Karnataka",
    summary: "A development event preview inspired by coffee harvest traditions.",
    destinationId: "coorg",
    imageKey: "highlands",
  },
];

const hotels = [
  {
    id: "01",
    name: "The Mango House",
    location: "Alibaug, Maharashtra",
    summary: "A seed stay listing for discovery and design testing; not a booking offer.",
    destinationId: "konkan",
    ratingLabel: "Sample guest note · 4.9",
    priceLabel: "Sample nightly rate · ₹7,800",
    imageKey: "coastline",
  },
  {
    id: "02",
    name: "Misty Fig Estate",
    location: "Coorg, Karnataka",
    summary: "A seed stay listing for discovery and design testing; not a booking offer.",
    destinationId: "coorg",
    ratingLabel: "Sample guest note · 4.8",
    priceLabel: "Sample nightly rate · ₹6,400",
    imageKey: "highlands",
  },
];

const homeNotice = "Development discovery content only. It is not live availability, booking, pricing, or location data.";

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
  const destination = destinations.find((item) => item.id === req.params.id);
  if (!destination) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Destination not found" } });
    return;
  }
  res.json(destination);
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