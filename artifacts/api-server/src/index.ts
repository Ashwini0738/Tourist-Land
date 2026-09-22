import app from "./app";
import { logger } from "./lib/logger";
import { razorpayConfigured } from "./lib/razorpay-provider";

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

logger.info(
  { provider: "razorpay", configured: razorpayConfigured() },
  razorpayConfigured()
    ? "Payment provider configuration detected"
    : "Payment provider credentials are not configured; checkout remains unavailable",
);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
