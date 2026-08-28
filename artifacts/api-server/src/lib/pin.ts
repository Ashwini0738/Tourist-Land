import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

export const PIN_LOCKOUT_ATTEMPTS = 5;
export const PIN_LOCKOUT_MS = 15 * 60 * 1000;

function deriveKey(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Uses memory-hard scrypt and stores its parameters with the salted hash. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(pin, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !expected) return false;
  const expectedKey = Buffer.from(expected, "base64url");
  const actual = await deriveKey(pin, Buffer.from(salt, "base64url"), expectedKey.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return actual.length === expectedKey.length && timingSafeEqual(actual, expectedKey);
}

export function lockoutAfterFailure(failedAttempts: number, now = new Date()): {
  failedAttempts: number; lockedUntil: Date | null;
} {
  const next = failedAttempts + 1;
  return { failedAttempts: next, lockedUntil: next >= PIN_LOCKOUT_ATTEMPTS ? new Date(now.getTime() + PIN_LOCKOUT_MS) : null };
}