import { Router, type IRouter } from "express";

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
    askingPrice: "₹1.85 Cr",
    propertyType: "Agri-tourism",
    verified: true,
  },
];

catalogRouter.get("/v1/home", (_req, res) => {
  res.json({
    featuredDestinations: destinations,
    featuredProperties: properties,
  });
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

catalogRouter.post("/v1/properties/:id/enquiries", (req, res) => {
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