export const seedDestinations = [
  {
    slug: "konkan-coast",
    name: "Konkan Coast",
    country: "India",
    region: "Maharashtra",
    summary: "Quiet coves, laterite villages, and long golden evenings.",
    status: "published",
  },
  {
    slug: "coorg-highlands",
    name: "Coorg Highlands",
    country: "India",
    region: "Karnataka",
    summary: "Coffee country in the clouds, made for unhurried drives.",
    status: "published",
  },
] as const;

export const seedProperties = [
  {
    slug: "riverstone-estate",
    title: "Riverstone Estate",
    propertyType: "agri-tourism",
    address: "Sakleshpur, Karnataka",
    areaValue: "2.4",
    areaUnit: "acre",
    askingPrice: "18500000",
    currency: "INR",
    status: "published",
  },
] as const;