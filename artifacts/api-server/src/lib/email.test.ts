import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingEmail,
  buildVendorApprovalEmail,
  sendBookingEmail,
  sendBookingEmailSafely,
  sendVendorApprovalEmail,
  type BookingEmail,
  type ResendProxyOptions,
} from "./email.ts";

const bookingEmail: BookingEmail = {
  to: "traveller@example.com",
  guestName: "<A Traveller>",
  reference: "TL-260830-ABC123",
  hotelName: "<Blue Coast>",
  startsOn: "2026-10-18",
  endsOn: "2026-10-21",
  total: 23400,
  currency: "INR",
  kind: "request_received",
};

test("builds a booking request email with the reference and development disclaimers", () => {
  const email = buildBookingEmail(bookingEmail);

  assert.equal(email.to[0], "traveller@example.com");
  assert.match(email.subject, /booking request.*received/i);
  assert.match(email.text, /TL-260830-ABC123/);
  assert.match(email.text, /Payment is not complete yet/);
  assert.match(email.text, /development hotel inventory/i);
  assert.match(email.html, /&lt;A Traveller&gt;/);
  assert.match(email.html, /&lt;Blue Coast&gt;/);
  assert.doesNotMatch(email.html, /<A Traveller>/);
});

test("uses lifecycle-specific messaging for cancellation and payment outcomes", () => {
  const cancelled = buildBookingEmail({ ...bookingEmail, kind: "cancelled" });
  const paid = buildBookingEmail({ ...bookingEmail, kind: "payment_confirmed" });
  const failed = buildBookingEmail({ ...bookingEmail, kind: "payment_failed" });

  assert.match(cancelled.subject, /cancelled/i);
  assert.match(paid.subject, /confirmed/i);
  assert.match(paid.text, /development hotel inventory/i);
  assert.match(failed.text, /Payment is not complete/);
});

test("surfaces booking email delivery failures without throwing", async () => {
  const delivered = await sendBookingEmailSafely(bookingEmail, async () => {
    throw new Error("provider unavailable");
  });

  assert.equal(delivered, false);
});

test("sends booking lifecycle emails through the Resend proxy", async () => {
  let request: ResendProxyOptions | undefined;
  await sendBookingEmail(
    bookingEmail,
    async (_path, options) => {
      request = options;
      return { ok: true, status: 202 } as Response;
    },
  );

  assert.equal(request?.method, "POST");
  assert.equal(request?.headers && (request.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.match(String(request?.body), /TL-260830-ABC123/);
});

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

test("uses the configured production sender without falling back to Resend's test sender", () => {
  const originalSender = process.env.TRAVEL_LAND_EMAIL_FROM;
  process.env.TRAVEL_LAND_EMAIL_FROM = " Travel & Land <no-reply@traveland.example> ";

  try {
    const email = buildVendorApprovalEmail({
      to: "vendor@example.com",
      businessName: "Green Valley",
      hasClerkInvitation: false,
    });

    assert.equal(email.from, "Travel & Land <no-reply@traveland.example>");
    assert.doesNotMatch(email.from, /resend\.dev/);
  } finally {
    if (originalSender === undefined) {
      delete process.env.TRAVEL_LAND_EMAIL_FROM;
    } else {
      process.env.TRAVEL_LAND_EMAIL_FROM = originalSender;
    }
  }
});

test("fails explicitly when no production sender is configured", () => {
  const originalSender = process.env.TRAVEL_LAND_EMAIL_FROM;
  delete process.env.TRAVEL_LAND_EMAIL_FROM;

  try {
    assert.throws(
      () => buildVendorApprovalEmail({
        to: "vendor@example.com",
        businessName: "Green Valley",
        hasClerkInvitation: false,
      }),
      /TRAVEL_LAND_EMAIL_FROM is required/,
    );
  } finally {
    if (originalSender === undefined) {
      delete process.env.TRAVEL_LAND_EMAIL_FROM;
    } else {
      process.env.TRAVEL_LAND_EMAIL_FROM = originalSender;
    }
  }
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