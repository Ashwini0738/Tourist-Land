import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "./rateLimit.ts";

function responseMock() {
  const headers = new Map<string, string>();
  return {
    headers,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(value: unknown) {
      this.body = value;
      return this;
    },
  };
}

test("rate limiter allows the configured number of requests and returns 429 afterwards", () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 2,
    message: "Too many requests.",
  });
  const req = { ip: "198.51.100.10" } as any;
  let nextCalls = 0;

  const first = responseMock();
  limiter(req, first as any, () => { nextCalls += 1; });
  const second = responseMock();
  limiter(req, second as any, () => { nextCalls += 1; });
  const third = responseMock();
  limiter(req, third as any, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(third.statusCode, 429);
  assert.deepEqual(third.body, {
    error: { code: "RATE_LIMITED", message: "Too many requests." },
  });
  assert.match(third.headers.get("Retry-After") ?? "", /^\d+$/);
});

test("rate limiter keeps clients isolated", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: "Slow down." });
  const first = responseMock();
  const second = responseMock();
  let nextCalls = 0;

  limiter({ ip: "198.51.100.11" } as any, first as any, () => { nextCalls += 1; });
  limiter({ ip: "198.51.100.12" } as any, second as any, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
});