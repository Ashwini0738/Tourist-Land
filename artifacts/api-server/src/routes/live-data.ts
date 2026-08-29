export type LiveProviderStatus = "available" | "unavailable";
export type LiveEventStatus = "scheduled" | "cancelled" | "unavailable";

export type LiveHotelRecord = {
  id: string;
  status: LiveProviderStatus;
  priceAmount?: number;
  currency?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
};

export type LiveEventRecord = {
  id: string;
  status: LiveEventStatus;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  cancellationReason?: string;
};

export type ProviderResult<T> = {
  configured: boolean;
  records: Map<string, T>;
  error?: string;
};

type ProviderPayload = {
  items?: unknown;
};

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const providerTimeoutMs = 4_000;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(asText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function asItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload) as ProviderPayload | undefined;
  return Array.isArray(record?.items) ? record.items : [];
}

function normalizeHotelRecord(value: unknown): LiveHotelRecord | undefined {
  const record = asRecord(value);
  const id = asText(record?.id);
  if (!id) return undefined;

  const rawStatus = asText(record?.status)?.toLowerCase();
  const status: LiveProviderStatus = rawStatus === "available" || record?.available === true
    ? "available"
    : "unavailable";
  const priceAmount = asNumber(record?.priceAmount ?? record?.price);

  return {
    id,
    status,
    ...(priceAmount !== undefined ? { priceAmount } : {}),
    ...(asText(record?.currency) ? { currency: asText(record?.currency) } : {}),
    ...(asText(record?.roomType) ? { roomType: asText(record?.roomType) } : {}),
    ...(asText(record?.checkIn) ? { checkIn: asText(record?.checkIn) } : {}),
    ...(asText(record?.checkOut) ? { checkOut: asText(record?.checkOut) } : {}),
  };
}

function normalizeEventRecord(value: unknown): LiveEventRecord | undefined {
  const record = asRecord(value);
  const id = asText(record?.id);
  if (!id) return undefined;

  const rawStatus = asText(record?.status)?.toLowerCase();
  const status: LiveEventStatus = rawStatus === "cancelled" || rawStatus === "canceled"
    ? "cancelled"
    : rawStatus === "scheduled" || rawStatus === "available" || record?.available === true
      ? "scheduled"
      : "unavailable";

  return {
    id,
    status,
    ...(asText(record?.startsAt ?? record?.startTime) ? { startsAt: asText(record?.startsAt ?? record?.startTime) } : {}),
    ...(asText(record?.endsAt ?? record?.endTime) ? { endsAt: asText(record?.endsAt ?? record?.endTime) } : {}),
    ...(asText(record?.venue) ? { venue: asText(record?.venue) } : {}),
    ...(asText(record?.cancellationReason) ? { cancellationReason: asText(record?.cancellationReason) } : {}),
  };
}

function withIds(urlValue: string, ids: string[]) {
  const url = new URL(urlValue);
  url.searchParams.set("ids", ids.join(","));
  return url.toString();
}

async function fetchProviderPayload(
  urlValue: string | undefined,
  ids: string[],
  apiKey: string | undefined,
  fetcher: FetchLike,
): Promise<unknown> {
  if (!urlValue) return undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
  try {
    const response = await fetcher(withIds(urlValue, ids), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`provider returned HTTP ${response.status}`);
    return await response.json() as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadProvider<T>(
  urlValue: string | undefined,
  ids: string[],
  apiKey: string | undefined,
  normalize: (value: unknown) => T | undefined,
  fetcher: FetchLike,
): Promise<ProviderResult<T>> {
  if (!urlValue) return { configured: false, records: new Map() };
  try {
    const payload = await fetchProviderPayload(urlValue, ids, apiKey, fetcher);
    const records = new Map<string, T>();
    for (const item of asItems(payload)) {
      const normalized = normalize(item);
      if (normalized) records.set((normalized as T & { id: string }).id, normalized);
    }
    return { configured: true, records };
  } catch (error) {
    return {
      configured: true,
      records: new Map(),
      error: error instanceof Error ? error.message : "provider request failed",
    };
  }
}

export async function fetchLiveProviders(
  ids: string[],
  fetcher: FetchLike = fetch,
  env: NodeJS.ProcessEnv = process.env,
) {
  const [hotels, events] = await Promise.all([
    loadProvider(
      env.HOTEL_AVAILABILITY_PROVIDER_URL,
      ids,
      env.HOTEL_AVAILABILITY_PROVIDER_API_KEY,
      normalizeHotelRecord,
      fetcher,
    ),
    loadProvider(
      env.EVENT_SCHEDULE_PROVIDER_URL,
      ids,
      env.EVENT_SCHEDULE_PROVIDER_API_KEY,
      normalizeEventRecord,
      fetcher,
    ),
  ]);
  return { hotels, events };
}