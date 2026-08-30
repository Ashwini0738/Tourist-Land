import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger.ts";

export type VendorApprovalEmail = {
  to: string;
  businessName: string;
  hasClerkInvitation: boolean;
};

export type ResendProxyOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type ResendProxy = (path: string, options: ResendProxyOptions) => Promise<Response>;

function configuredSender(): string {
  const sender = process.env.TRAVEL_LAND_EMAIL_FROM?.trim();
  if (!sender) {
    throw new Error("TRAVEL_LAND_EMAIL_FROM is required for email delivery.");
  }
  return sender;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export type BookingNotificationKind =
  | "request_received"
  | "cancelled"
  | "payment_processing"
  | "payment_confirmed"
  | "payment_failed"
  | "payment_expired";

export type BookingEmail = {
  to: string;
  guestName: string;
  reference: string;
  hotelName: string;
  startsOn: string;
  endsOn: string;
  total: number;
  currency: string;
  kind: BookingNotificationKind;
};

export type BookingEmailSender = (input: BookingEmail) => Promise<void>;

const bookingDevelopmentNotice =
  "Development hotel inventory only. Stripe payment confirms this booking request, but not a live supplier reservation.";

function bookingMessage(input: BookingEmail): { subject: string; title: string; body: string; paymentNotice?: string } {
  switch (input.kind) {
    case "request_received":
      return {
        subject: `Your Travel & Land booking request ${input.reference} was received`,
        title: "Your booking request was received",
        body: "We saved your booking request. Complete payment in the Travel & Land app to confirm it.",
        paymentNotice: "Payment is not complete yet, so this booking request is not confirmed.",
      };
    case "cancelled":
      return {
        subject: `Your Travel & Land booking request ${input.reference} was cancelled`,
        title: "Your booking request was cancelled",
        body: "Your booking request has been cancelled as requested.",
        paymentNotice: "No payment was completed for this booking request.",
      };
    case "payment_processing":
      return {
        subject: `Payment is being processed for Travel & Land booking ${input.reference}`,
        title: "Your payment is being processed",
        body: "Stripe is still processing payment for this booking request. We’ll send another update when the result is available.",
        paymentNotice: "Payment is not confirmed yet. Please do not submit another payment while this update is pending.",
      };
    case "payment_confirmed":
      return {
        subject: `Payment confirmed for Travel & Land booking ${input.reference}`,
        title: "Your payment was confirmed",
        body: "Stripe confirmed payment for this booking request. Keep this reference for your records.",
      };
    case "payment_failed":
      return {
        subject: `Payment could not be completed for Travel & Land booking ${input.reference}`,
        title: "Your payment could not be completed",
        body: "Stripe could not complete payment for this booking request. You can return to the Travel & Land app and try checkout again.",
        paymentNotice: "Payment is not complete, so this booking request is not confirmed.",
      };
    case "payment_expired":
      return {
        subject: `Payment window expired for Travel & Land booking ${input.reference}`,
        title: "Your payment window expired",
        body: "The Stripe checkout window for this booking request expired. You can return to the Travel & Land app to start checkout again.",
        paymentNotice: "Payment is not complete, so this booking request is not confirmed.",
      };
  }
}

export function buildBookingEmail(input: BookingEmail): {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
} {
  const message = bookingMessage(input);
  const guestName = input.guestName.trim();
  const hotelName = input.hotelName.trim();
  const currency = input.currency.toUpperCase();
  const total = `${Number(input.total).toFixed(2)} ${currency}`;
  const details = [
    `Booking reference: ${input.reference}`,
    `Hotel: ${hotelName}`,
    `Stay: ${input.startsOn} to ${input.endsOn}`,
    `Total: ${total}`,
  ];
  const text = [
    guestName ? `Hello ${guestName},` : "Hello,",
    message.body,
    ...details,
    message.paymentNotice,
    bookingDevelopmentNotice,
    "Travel & Land",
  ].filter(Boolean).join("\n\n");
  const htmlDetails = details
    .map((detail) => `<li>${escapeHtml(detail)}</li>`)
    .join("");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17221c">
      <h2>${escapeHtml(message.title)}</h2>
      <p>${escapeHtml(guestName ? `Hello ${guestName},` : "Hello,")}</p>
      <p>${escapeHtml(message.body)}</p>
      <ul>${htmlDetails}</ul>
      ${message.paymentNotice ? `<p><strong>${escapeHtml(message.paymentNotice)}</strong></p>` : ""}
      <p>${escapeHtml(bookingDevelopmentNotice)}</p>
      <p>Travel &amp; Land</p>
    </div>
  `.trim();
  return {
    from: configuredSender(),
    to: [input.to],
    subject: message.subject,
    text,
    html,
  };
}

export function buildVendorApprovalEmail(input: VendorApprovalEmail): {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
} {
  const businessName = input.businessName.trim();
  const setupMessage = input.hasClerkInvitation
    ? "A separate Clerk invitation email will help you finish setting up your vendor sign-in."
    : "Sign in with your existing Travel & Land account to open your vendor workspace.";
  return {
    from: configuredSender(),
    to: [input.to],
    subject: "Your Travel & Land vendor application is approved",
    text: [
      `Your vendor application for ${businessName} has been approved.`,
      setupMessage,
      "After signing in, open Profile and choose Vendor dashboard to manage your business.",
    ].join("\n\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17221c">
        <h2>Your vendor application is approved</h2>
        <p>Your vendor application for <strong>${escapeHtml(businessName)}</strong> has been approved.</p>
        <p>${escapeHtml(setupMessage)}</p>
        <p>After signing in, open <strong>Profile</strong> and choose <strong>Vendor dashboard</strong> to manage your business.</p>
        <p>Welcome to Travel &amp; Land.</p>
      </div>
    `.trim(),
  };
}

async function defaultResendProxy(path: string, options: ResendProxyOptions): Promise<Response> {
  const connectors = new ReplitConnectors();
  return connectors.proxy("resend", path, options);
}

export async function sendBookingEmail(
  input: BookingEmail,
  proxy: ResendProxy = defaultResendProxy,
): Promise<void> {
  const response = await proxy("/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBookingEmail(input)),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the booking email with status ${response.status}.`);
  }
}

export async function sendBookingEmailSafely(
  input: BookingEmail,
  send: BookingEmailSender = sendBookingEmail,
): Promise<boolean> {
  try {
    await send(input);
    logger.info({ bookingReference: input.reference, notificationKind: input.kind }, "Booking email sent");
    return true;
  } catch (error) {
    logger.error(
      { err: error, bookingReference: input.reference, notificationKind: input.kind },
      "Booking email delivery failed after booking state was saved",
    );
    return false;
  }
}

export async function sendVendorApprovalEmail(
  input: VendorApprovalEmail,
  proxy: ResendProxy = defaultResendProxy,
): Promise<void> {
  const response = await proxy("/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildVendorApprovalEmail(input)),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the vendor approval email with status ${response.status}.`);
  }
}