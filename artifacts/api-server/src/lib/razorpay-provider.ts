import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentProviderConfigurationError,
  PaymentProviderRequestError,
  type CreatePaymentOrderInput,
  type PaymentOrder,
  type PaymentOrderStatus,
  type PaymentProvider,
  type PaymentWebhookEvent,
  type ProviderPayment,
  type ProviderPaymentStatus,
  type VerifyPaymentInput,
} from "./payment-provider.ts";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  receipt?: string;
  status: string;
  notes?: Record<string, string>;
};

type RazorpayPaymentResponse = {
  id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
  notes?: Record<string, string>;
};

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: RazorpayPaymentResponse };
    order?: { entity?: RazorpayOrderResponse };
  };
};

function required(value: string | undefined, name: string): string {
  const clean = value?.trim();
  if (!clean) throw new PaymentProviderConfigurationError(`${name} is not configured.`);
  return clean;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeOrder(value: RazorpayOrderResponse): PaymentOrder {
  if (!value.id || !Number.isInteger(value.amount) || value.amount <= 0 || !value.currency) {
    throw new PaymentProviderRequestError("The payment provider returned an invalid order.");
  }
  const status = value.status as PaymentOrderStatus;
  if (!["created", "attempted", "paid"].includes(status)) {
    throw new PaymentProviderRequestError("The payment provider returned an unsupported order status.");
  }
  return {
    id: value.id,
    amount: value.amount,
    amountPaid: value.amount_paid ?? 0,
    currency: value.currency.toUpperCase(),
    receipt: value.receipt ?? "",
    status,
    notes: value.notes ?? {},
  };
}

function normalizePayment(value: RazorpayPaymentResponse): ProviderPayment {
  if (!value.id || !value.order_id || !Number.isInteger(value.amount) || value.amount <= 0 || !value.currency) {
    throw new PaymentProviderRequestError("The payment provider returned an invalid payment.");
  }
  const status = value.status as ProviderPaymentStatus;
  if (!["created", "authorized", "captured", "failed", "refunded"].includes(status)) {
    throw new PaymentProviderRequestError("The payment provider returned an unsupported payment status.");
  }
  return {
    id: value.id,
    orderId: value.order_id,
    amount: value.amount,
    currency: value.currency.toUpperCase(),
    status,
    captured: value.captured === true || status === "captured",
    notes: value.notes ?? {},
  };
}

export function razorpayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RAZORPAY_KEY_ID?.trim() && env.RAZORPAY_KEY_SECRET?.trim());
}

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = "razorpay";
  readonly publicKeyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string | undefined;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.publicKeyId = required(env.RAZORPAY_KEY_ID, "RAZORPAY_KEY_ID");
    this.keySecret = required(env.RAZORPAY_KEY_SECRET, "RAZORPAY_KEY_SECRET");
    this.webhookSecret = env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${this.publicKeyId}:${this.keySecret}`).toString("base64")}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new PaymentProviderRequestError(`Razorpay request failed with status ${response.status}.`);
    }
    return response.json() as Promise<T>;
  }

  async createOrder(input: CreatePaymentOrderInput, idempotencyKey: string): Promise<PaymentOrder> {
    const order = await this.request<RazorpayOrderResponse>("/orders", {
      method: "POST",
      headers: { "X-Razorpay-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        receipt: input.receipt.slice(0, 40),
        notes: input.notes,
      }),
    });
    return normalizeOrder(order);
  }

  async getOrder(orderId: string): Promise<PaymentOrder> {
    return normalizeOrder(await this.request<RazorpayOrderResponse>(`/orders/${encodeURIComponent(orderId)}`));
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    return normalizePayment(await this.request<RazorpayPaymentResponse>(`/payments/${encodeURIComponent(paymentId)}`));
  }

  verifyPayment(input: VerifyPaymentInput): boolean {
    const expected = createHmac("sha256", this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    return secureEqual(expected, input.signature);
  }

  async capturePayment(paymentId: string, amount: number, currency: string): Promise<ProviderPayment> {
    return normalizePayment(await this.request<RazorpayPaymentResponse>(
      `/payments/${encodeURIComponent(paymentId)}/capture`,
      {
        method: "POST",
        body: JSON.stringify({ amount, currency: currency.toUpperCase() }),
      },
    ));
  }

  async refundPayment(paymentId: string, amount: number, idempotencyKey: string): Promise<{ id: string; status: string }> {
    const refund = await this.request<{ id?: string; status?: string }>(
      `/payments/${encodeURIComponent(paymentId)}/refund`,
      {
        method: "POST",
        headers: { "X-Razorpay-Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ amount }),
      },
    );
    if (!refund.id || !refund.status) throw new PaymentProviderRequestError("Razorpay returned an invalid refund.");
    return { id: refund.id, status: refund.status };
  }

  handleWebhook(payload: Buffer, signature: string): PaymentWebhookEvent {
    if (!Buffer.isBuffer(payload)) throw new Error("Razorpay webhook payload must be a raw Buffer.");
    const webhookSecret = required(this.webhookSecret, "RAZORPAY_WEBHOOK_SECRET");
    const expected = createHmac("sha256", webhookSecret).update(payload).digest("hex");
    if (!secureEqual(expected, signature)) throw new Error("Invalid Razorpay webhook signature.");
    const body = JSON.parse(payload.toString("utf8")) as RazorpayWebhookPayload;
    const paymentValue = body.payload?.payment?.entity;
    const orderValue = body.payload?.order?.entity;
    return {
      id: createHash("sha256").update(payload).digest("hex"),
      type: body.event ?? "",
      createdAt: body.created_at ?? 0,
      payment: paymentValue ? normalizePayment(paymentValue) : null,
      order: orderValue ? normalizeOrder(orderValue) : null,
    };
  }
}

export function getRazorpayPaymentProvider(env: NodeJS.ProcessEnv = process.env): RazorpayPaymentProvider {
  return new RazorpayPaymentProvider(env);
}