export type PaymentOrderStatus = "created" | "attempted" | "paid";
export type ProviderPaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export type PaymentOrder = {
  id: string;
  amount: number;
  amountPaid: number;
  currency: string;
  receipt: string;
  status: PaymentOrderStatus;
  notes: Record<string, string>;
};

export type ProviderPayment = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: ProviderPaymentStatus;
  captured: boolean;
  notes: Record<string, string>;
};

export type PaymentWebhookEvent = {
  id: string;
  type: string;
  createdAt: number;
  payment: ProviderPayment | null;
  order: PaymentOrder | null;
};

export type CreatePaymentOrderInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
};

export type VerifyPaymentInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

export interface PaymentProvider {
  readonly name: string;
  readonly publicKeyId: string;
  createOrder(input: CreatePaymentOrderInput, idempotencyKey: string): Promise<PaymentOrder>;
  getOrder(orderId: string): Promise<PaymentOrder>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  verifyPayment(input: VerifyPaymentInput): boolean;
  capturePayment(paymentId: string, amount: number, currency: string): Promise<ProviderPayment>;
  refundPayment(paymentId: string, amount: number, idempotencyKey: string): Promise<{ id: string; status: string }>;
  handleWebhook(payload: Buffer, signature: string): PaymentWebhookEvent;
}

export class PaymentProviderConfigurationError extends Error {}
export class PaymentProviderRequestError extends Error {}