import { ReplitConnectors } from "@replit/connectors-sdk";

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
    throw new Error("TRAVEL_LAND_EMAIL_FROM is required for vendor approval email delivery.");
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