export type InventoryFreshness = "fresh" | "not_applicable" | "unavailable";

export type InventoryProvenance = {
  provider: string;
  freshness: InventoryFreshness;
  checkedAt: string | null;
  freshUntil: string | null;
};

export function inventoryOffersEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

export function developmentInventoryProvenance(): InventoryProvenance {
  return {
    provider: "travel-land-development",
    freshness: "not_applicable",
    checkedAt: null,
    freshUntil: null,
  };
}

export function vendorInventoryProvenance(): InventoryProvenance {
  return {
    provider: "travel-land-vendor-portal",
    freshness: "not_applicable",
    checkedAt: null,
    freshUntil: null,
  };
}

export function unavailableInventoryProvenance(now = new Date()): InventoryProvenance {
  return {
    provider: "none",
    freshness: "unavailable",
    checkedAt: now.toISOString(),
    freshUntil: null,
  };
}