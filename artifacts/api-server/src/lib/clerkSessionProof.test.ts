import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidClerkSessionProofError,
  verifyClerkSessionProof,
} from "./clerkSessionProof.ts";

function request(headers: Record<string, string>) {
  return {
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
}

test("verifies a pending Clerk session and derives the server-side user ID", async () => {
  const calls: Array<[string, string]> = [];
  const session = await verifyClerkSessionProof(
    request({
      authorization: "Bearer pending-token",
      "x-clerk-session-id": "sess_pending",
    }),
    {
      async verifySession(sessionId, token) {
        calls.push([sessionId, token]);
        return { id: sessionId, userId: "user_verified", status: "pending" };
      },
    },
  );
  assert.deepEqual(calls, [["sess_pending", "pending-token"]]);
  assert.equal(session.userId, "user_verified");
});

test("rejects missing, mismatched, failed, and completed session proofs", async () => {
  const verifier = {
    async verifySession(sessionId: string) {
      return { id: `${sessionId}_other`, userId: "user_1", status: "ended" };
    },
  };
  await assert.rejects(
    verifyClerkSessionProof(request({}), verifier),
    InvalidClerkSessionProofError,
  );
  await assert.rejects(
    verifyClerkSessionProof(
      request({
        authorization: "Bearer token",
        "x-clerk-session-id": "sess_1",
      }),
      verifier,
    ),
    InvalidClerkSessionProofError,
  );
});