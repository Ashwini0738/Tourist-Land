import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { WebhookHandlers } from "./webhookHandlers";

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
app.use(cors({ credentials: true, origin: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
  })),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Express 5 forwards rejected async route handlers here. Keep the wire format
// stable and intentionally omit implementation details from client responses.
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const parseError = error instanceof SyntaxError && "status" in error && error.status === 400;
  if (parseError) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON.",
      },
    });
    return;
  }

  req.log.error({ err: error, method: req.method, path: req.path }, "Unhandled API request error");
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  });
});

export default app;
