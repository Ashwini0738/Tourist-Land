import assert from "node:assert/strict";
import test from "node:test";
import { buildVendorApprovalEmail, sendVendorApprovalEmail, type ResendProxyOptions } from "./email.ts";

test("builds a safe vendor approval email for an existing account", () => {
  const email = buildVendorApprovalEmail({
    to: "vendor@example.com",
    businessName: "<Green Valley>",
    hasClerkInvitation: false,
  });

  assert.equal(email.to[0], "vendor@example.com");
  assert.match(email.subject, /approved/i);
  assert.match(email.text, /existing Travel & Land account/);
  assert.match(email.html, /&lt;Green Valley&gt;/);
  assert.doesNotMatch(email.html, /<Green Valley>/);
});

test("sends vendor approval email through the Resend proxy", async () => {
  let request: ResendProxyOptions | undefined;
  await sendVendorApprovalEmail(
    { to: "vendor@example.com", businessName: "Green Valley", hasClerkInvitation: true },
    async (_path, options) => {
      request = options;
      return { ok: true, status: 202 } as Response;
    },
  );

  assert.equal(request?.method, "POST");
  assert.equal(request?.headers && (request.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.match(String(request?.body), /Clerk invitation email/);
});

test("surfaces Resend delivery failures to the caller", async () => {
  await assert.rejects(
    () => sendVendorApprovalEmail(
      { to: "vendor@example.com", businessName: "Green Valley", hasClerkInvitation: false },
      async () => ({ ok: false, status: 503 } as Response),
    ),
    /status 503/,
  );
});