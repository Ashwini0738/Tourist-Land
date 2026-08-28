import assert from "node:assert/strict";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const parameters = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function hashPin(pin) {
  const salt = randomBytes(16);
  const key = await derive(pin, salt, 32, parameters);
  return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPin(pin, stored) {
  const [algorithm, N, r, p, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt") return false;
  const expectedKey = Buffer.from(expected, "base64url");
  const actual = await derive(pin, Buffer.from(salt, "base64url"), expectedKey.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: parameters.maxmem,
  });
  return actual.length === expectedKey.length && timingSafeEqual(actual, expectedKey);
}

function lockoutAfterFailure(attempts, now) {
  const failedAttempts = attempts + 1;
  return { failedAttempts, lockedUntil: failedAttempts >= 5 ? new Date(now.getTime() + 900_000) : null };
}

const hash = await hashPin("1234");
assert.notEqual(hash, "1234");
assert.equal(await verifyPin("1234", hash), true);
assert.equal(await verifyPin("1235", hash), false);
assert.equal(lockoutAfterFailure(3, new Date(0)).lockedUntil, null);
assert.equal(lockoutAfterFailure(4, new Date(0)).lockedUntil?.getTime(), 900_000);
console.log("Auth PIN hashing and lockout checks passed.");