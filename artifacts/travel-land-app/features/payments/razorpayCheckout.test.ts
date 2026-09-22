import {
  RAZORPAY_NATIVE_MODULE_UNAVAILABLE,
  classifyRazorpayCheckoutError,
  isRazorpayNativeModuleAvailable,
  paymentErrorMessage,
} from './razorpayCheckout';

describe('Razorpay checkout error handling', () => {
  test('distinguishes user cancellation from provider failure', () => {
    expect(classifyRazorpayCheckoutError({ code: 0, description: 'Payment cancelled by user' })).toBe('cancelled');
    expect(paymentErrorMessage({ code: 0, description: 'Payment cancelled by user' }, 'checkout')).toBe('Payment was cancelled.');

    expect(classifyRazorpayCheckoutError({ code: 2, description: 'Payment failed' })).toBe('failed');
    expect(paymentErrorMessage({ code: 2, description: 'Payment failed' }, 'checkout')).toBe('Payment failed. Please try again.');
  });

  test('treats verification and unknown checkout outcomes as uncertain', () => {
    const message = 'Payment status could not be confirmed. Please check My Bookings before trying again.';
    expect(classifyRazorpayCheckoutError(new Error('network timeout'))).toBe('unknown');
    expect(paymentErrorMessage(new Error('network timeout'), 'checkout')).toBe(message);
    expect(paymentErrorMessage(new Error('API timeout'), 'verification')).toBe(message);
    expect(message).not.toContain('Nothing was charged');
  });

  test('detects the native module before Expo Go checkout', () => {
    expect(isRazorpayNativeModuleAvailable({}, 'ios', { get: () => null })).toBe(false);
    expect(isRazorpayNativeModuleAvailable({
      RNRazorpayCheckout: { open: () => undefined },
      RazorpayEventEmitter: {},
    }, 'ios')).toBe(true);
    expect(isRazorpayNativeModuleAvailable({
      RNRazorpayCheckout: { open: () => undefined },
      RazorpayEventEmitter: {},
    }, 'web')).toBe(false);
    expect(isRazorpayNativeModuleAvailable({}, 'ios', {
      get: (name) => name === 'RNRazorpayCheckout' ? { open: () => undefined } : {},
    })).toBe(true);
    expect(paymentErrorMessage(new Error(RAZORPAY_NATIVE_MODULE_UNAVAILABLE), 'checkout'))
      .toContain('not available in Expo Go');
  });
});