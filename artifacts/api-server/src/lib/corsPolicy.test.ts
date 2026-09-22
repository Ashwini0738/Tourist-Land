import assert from "node:assert/strict";
import test from "node:test";
import { allowedCorsOrigins, isAllowedCorsOrigin } from "./corsPolicy.ts";

test("allows only explicitly configured origins", () => {
  const env = {
    NODE_ENV: "production",
    TRAVEL_LAND_CORS_ORIGINS: "https://admin.example.com,https://app.example.com",
    REPLIT_DOMAINS: "",
    REPLIT_DEV_DOMAIN: "",
  } as NodeJS.ProcessEnv;

  assert.equal(isAllowedCorsOrigin("https://admin.example.com", env), true);
  assert.equal(isAllowedCorsOrigin("https://attacker.example", env), false);
  assert.equal(isAllowedCorsOrigin(undefined, env), true);
  assert.deepEqual([...allowedCorsOrigins(env)].sort(), [
    "https://admin.example.com",
    "https://app.example.com",
  ]);
});

test("keeps local development origins available without allowing arbitrary hosts", () => {
  const env = {
    NODE_ENV: "development",
    TRAVEL_LAND_CORS_ORIGINS: "",
    REPLIT_DOMAINS: "travel.example.replit.dev",
    REPLIT_DEV_DOMAIN: "travel-dev.example.replit.dev",
  } as NodeJS.ProcessEnv;

  assert.equal(isAllowedCorsOrigin("http://localhost:3000", env), true);
  assert.equal(isAllowedCorsOrigin("https://travel.example.replit.dev", env), true);
  assert.equal(isAllowedCorsOrigin("https://travel-dev.example.replit.dev", env), true);
  assert.equal(isAllowedCorsOrigin("https://attacker.example", env), false);
});
