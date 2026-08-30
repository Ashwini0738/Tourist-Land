import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const REQUIRED_STRIPE_SYNC_TABLES = ["_migrations", "accounts", "_managed_webhooks"] as const;

export async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Stripe integration environment is unavailable.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Stripe credentials request failed: ${response.status}`);

  const data = await response.json() as { items?: Array<{ settings?: { secret?: string; publishable?: string; secret_key?: string; webhook_secret?: string } }> };
  const settings = data.items?.[0]?.settings;
  const secretKey = settings?.secret ?? settings?.secret_key;
  if (!secretKey) throw new Error("Stripe is not connected to this environment.");
  return { secretKey, webhookSecret: settings?.webhook_secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Stripe synchronization.");
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? "",
  });
}

export async function assertStripeStorageReady(): Promise<void> {
  const result = await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'stripe'
      and table_name in ('_migrations', 'accounts', '_managed_webhooks')
  `);
  const existingTables = new Set(
    result.rows
      .map((row) => row.table_name)
      .filter((tableName): tableName is string => typeof tableName === "string"),
  );
  const missingTables = REQUIRED_STRIPE_SYNC_TABLES.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(
      `Stripe Sync storage is not ready. Missing ${missingTables.map((tableName) => `stripe.${tableName}`).join(", ")}. ` +
      "Ensure stripe-replit-sync migrations ran against this DATABASE_URL, then restart or redeploy the API.",
    );
  }
}

export async function verifyStripeEvent(payload: Buffer, signature: string): Promise<Stripe.Event> {
  const { secretKey, webhookSecret: configuredWebhookSecret } = await getStripeCredentials();
  let webhookSecret = configuredWebhookSecret;
  if (!webhookSecret) {
    const result = await db.execute(sql`select secret from stripe."_managed_webhooks" limit 1`);
    webhookSecret = typeof result.rows[0]?.secret === "string" ? result.rows[0].secret : undefined;
  }
  if (!webhookSecret) throw new Error("Stripe webhook signing secret is not configured.");
  return new Stripe(secretKey).webhooks.constructEvent(payload, signature, webhookSecret);
}