import app from "./app";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initializeStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Stripe.");
  await runMigrations({ databaseUrl });
  const stripeSync = await getStripeSync();
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) throw new Error("REPLIT_DOMAINS is required to configure Stripe webhooks.");
  await stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
  await stripeSync.syncBackfill();
  logger.info("Stripe initialized");
}

await initializeStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
