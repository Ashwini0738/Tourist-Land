import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import test from "node:test";
import onboardingRouter from "./onboarding.ts";

test("status lookup hides malformed references behind a generic unavailable response", async (t) => {
  const app = express();
  app.use(onboardingRouter);
  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  const response = await fetch(
    `http://127.0.0.1:${address.port}/v1/vendor/applications/status?id=not-a-reference&email=not-an-email`,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "APPLICATION_STATUS_UNAVAILABLE",
      message: "Application status is unavailable.",
    },
  });
});