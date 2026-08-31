import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { apiErrorHandler } from "./errorHandler.ts";

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.post("/explode", async () => {
    throw new Error("database connection details must not reach the client");
  });
  app.post("/echo", (_req, res) => res.json({ ok: true }));
  app.use(apiErrorHandler);
  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start.");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("unexpected route failures return safe JSON without internal details", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/explode`, { method: "POST" });
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong on our side. Please try again.",
      },
    });
    assert.doesNotMatch(JSON.stringify(body), /database connection/i);
  });
});

test("malformed request bodies return a contextual JSON error", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{broken",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON.",
      },
    });
  });
});