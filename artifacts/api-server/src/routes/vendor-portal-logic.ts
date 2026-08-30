export function parseString(input: unknown, maxLength: number, nullable = false): string | null | undefined {
  if (input === undefined) return undefined;
  if (input === null && nullable) return null;
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : nullable ? null : undefined;
}

export function parseStringArray(input: unknown, maxItems = 30): string[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > maxItems) return undefined;
  const values = input.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
  return values.length === input.length && values.every((item) => item.length <= 120) ? values : undefined;
}

export function parseNumber(input: unknown, min: number, max: number): number | undefined {
  const parsed = typeof input === "number" ? input : typeof input === "string" && input.trim() ? Number(input) : NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export function parseInteger(input: unknown, min: number, max: number): number | undefined {
  const parsed = parseNumber(input, min, max);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

export function isDate(valueToCheck: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueToCheck)) return false;
  const parsed = new Date(`${valueToCheck}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === valueToCheck;
}

export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cursor < end && dates.length <= 90) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}