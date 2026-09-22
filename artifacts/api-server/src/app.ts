import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  clerkAuthTarget,
  clerkClient,
  clerkPublishableKey,
  EXTERNAL_DEVELOPMENT_AUTH_TARGET,
} from "./lib/clerkConfig";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { WebhookHandlers } from "./webhookHandlers";
import { apiErrorHandler } from "./middlewares/errorHandler";
import { isAllowedCorsOrigin } from "./lib/corsPolicy";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res): Promise<void> => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature" });
    return;
  }
  try {
    await WebhookHandlers.processWebhook(req.body as Buffer, Array.isArray(signature) ? signature[0] : signature);
    res.status(200).json({ received: true });
  } catch (error) {
    logger.warn({ err: error }, "Stripe webhook verification or processing failed");
    res.status(400).json({ error: "Webhook processing error" });
  }
});
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    callback(null, isAllowedCorsOrigin(origin));
  },
}));
app.use(
  clerkMiddleware((req) => ({
    clerkClient,
    publishableKey:
      clerkAuthTarget === EXTERNAL_DEVELOPMENT_AUTH_TARGET
        ? clerkPublishableKey
        : publishableKeyFromHost(
            getClerkProxyHost(req) ?? "",
            clerkPublishableKey,
          ),
  })),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(apiErrorHandler);

export default app;
