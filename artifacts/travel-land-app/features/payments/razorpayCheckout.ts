import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { BookingCheckoutResponse } from '@workspace/api-client-react';

export const RAZORPAY_NATIVE_MODULE_UNAVAILABLE = 'RAZORPAY_NATIVE_MODULE_UNAVAILABLE';

export type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type NativeModuleRegistry = {
  RNRazorpayCheckout?: {
    open?: unknown;
  };
  RazorpayEventEmitter?: unknown;
};

type TurboModuleRegistryLike = {
  get(name: string): unknown;
};

export type PaymentErrorPhase = 'starting' | 'checkout' | 'verification';
export type RazorpayErrorKind = 'cancelled' | 'failed' | 'unknown';

export function isRazorpayNativeModuleAvailable(
  nativeModules: NativeModuleRegistry = NativeModules,
  platform: string = Platform.OS,
  turboModules: TurboModuleRegistryLike = TurboModuleRegistry,
): boolean {
  if (platform === 'web') return false;
  const checkout = nativeModules.RNRazorpayCheckout ?? turboModules.get('RNRazorpayCheckout');
  const eventEmitter = nativeModules.RazorpayEventEmitter ?? turboModules.get('RazorpayEventEmitter');
  return typeof (checkout as { open?: unknown } | null | undefined)?.open === 'function' && Boolean(eventEmitter);
}

function errorDetails(error: unknown): { code?: unknown; text: string } {
  if (error instanceof Error) return { text: error.message };
  if (!error || typeof error !== 'object') return { text: String(error ?? '') };
  const value = error as Record<string, unknown>;
  return {
    code: value.code,
    text: [value.description, value.message, value.error].filter((part): part is string => typeof part === 'string').join(' '),
  };
}

export function classifyRazorpayCheckoutError(error: unknown): RazorpayErrorKind {
  const { code, text } = errorDetails(error);
  const normalized = text.toLowerCase();
  if (
    code === 0 ||
    /\bcancel(?:led|ed)?\b|\bdismiss(?:ed)?\b|closed by user|user aborted/.test(normalized)
  ) {
    return 'cancelled';
  }
  if (/fail(?:ed|ure)?|declin(?:ed|e)|reject(?:ed|ion)|insufficient|invalid|expired|authentication/.test(normalized)) {
    return 'failed';
  }
  return 'unknown';
}

export function paymentErrorMessage(error: unknown, phase: PaymentErrorPhase): string {
  const { text } = errorDetails(error);
  if (text.includes(RAZORPAY_NATIVE_MODULE_UNAVAILABLE)) {
    return 'Razorpay checkout requires the Travel & Land development or preview build; it is not available in Expo Go.';
  }
  if (phase === 'starting') {
    return 'Razorpay checkout could not be started. Please try again.';
  }
  if (phase === 'verification') {
    return 'Payment status could not be confirmed. Please check My Bookings before trying again.';
  }
  const kind = classifyRazorpayCheckoutError(error);
  if (kind === 'cancelled') return 'Payment was cancelled.';
  if (kind === 'failed') return 'Payment failed. Please try again.';
  return 'Payment status could not be confirmed. Please check My Bookings before trying again.';
}

export async function openRazorpayCheckout(order: BookingCheckoutResponse): Promise<RazorpayCheckoutSuccess> {
  if (!isRazorpayNativeModuleAvailable()) {
    throw new Error(RAZORPAY_NATIVE_MODULE_UNAVAILABLE);
  }

  try {
    const module = require('react-native-razorpay') as {
      default?: { open(options: Record<string, unknown>): Promise<RazorpayCheckoutSuccess> };
      open?: (options: Record<string, unknown>) => Promise<RazorpayCheckoutSuccess>;
    };
    const checkout = module.default ?? module;
    if (typeof checkout.open !== 'function') throw new Error(RAZORPAY_NATIVE_MODULE_UNAVAILABLE);
    return await checkout.open({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: '#2E6B4F' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes(RAZORPAY_NATIVE_MODULE_UNAVAILABLE) ||
      message.includes('RazorpayCheckout') ||
      message.includes('native module')
    ) {
      throw new Error(RAZORPAY_NATIVE_MODULE_UNAVAILABLE);
    }
    throw error;
  }
}