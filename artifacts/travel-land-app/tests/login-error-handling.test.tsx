import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import LoginScreen from '../app/login';
import VerifyScreen from '../app/verify';

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
  useSignIn: jest.fn(),
  useSignUp: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: () => null,
}));

jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: () => null,
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fbfaf6',
    foreground: '#14231f',
    primary: '#064e3b',
    primaryForeground: '#ffffff',
    mutedForeground: '#71807a',
    input: '#d7ded9',
    card: '#ffffff',
    destructive: '#b42318',
    muted: '#d7ded9',
    accent: '#f5c26b',
    accentForeground: '#3f2a10',
    gradientSoft: '#e8f0ea',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;

function createSignIn() {
  return {
    status: 'complete',
    supportedFirstFactors: [{ strategy: 'phone_code' }],
    supportedSecondFactors: [{ strategy: 'email_code' }],
    password: jest.fn().mockResolvedValue({ error: null }),
    create: jest.fn().mockResolvedValue({ error: null }),
    phoneCode: {
      sendCode: jest.fn().mockResolvedValue({ error: null }),
      verifyCode: jest.fn().mockResolvedValue({ error: null }),
    },
    mfa: {
      sendEmailCode: jest.fn().mockResolvedValue({ error: null }),
      verifyEmailCode: jest.fn().mockResolvedValue({ error: null }),
    },
    resetPasswordEmailCode: {
      sendCode: jest.fn().mockResolvedValue({ error: null }),
      verifyCode: jest.fn().mockResolvedValue({ error: null }),
      submitPassword: jest.fn().mockResolvedValue({ error: null }),
    },
    finalize: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
  };
}

function createSignUp() {
  return {
    status: 'complete',
    password: jest.fn().mockResolvedValue({ error: null }),
    verifications: {
      sendEmailCode: jest.fn().mockResolvedValue({ error: null }),
      verifyEmailCode: jest.fn().mockResolvedValue({ error: null }),
    },
    finalize: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ isLoaded: true });
  mockUseSignIn.mockReturnValue({ signIn: createSignIn(), fetchStatus: 'idle' });
  mockUseSignUp.mockReturnValue({ signUp: createSignUp(), fetchStatus: 'idle' });
});

describe('login validation', () => {
  it('requires an email before submitting', async () => {
    const signIn = createSignIn();
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => expect(screen.getByText('Email is required.')).toBeTruthy());
    expect(signIn.password).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before submitting', async () => {
    const signIn = createSignIn();
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'not-an-email');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => expect(screen.getByText('Enter a valid email address and try again.')).toBeTruthy());
    expect(signIn.password).not.toHaveBeenCalled();
  });

  it('requires a non-empty login password', async () => {
    const signIn = createSignIn();
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => expect(screen.getByText('Enter your password.')).toBeTruthy());
    expect(signIn.password).not.toHaveBeenCalled();
  });

  it('submits valid email and password input to Clerk', async () => {
    const signIn = createSignIn();
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(signIn.password).toHaveBeenCalledWith({
        emailAddress: 'traveller@example.com',
        password: 'not-a-real-password',
      });
    });
  });

  it('explains Clerk combined credential rejection after a reset', async () => {
    const signIn = createSignIn();
    signIn.password.mockResolvedValueOnce({
      error: { code: 'form_password_or_identifier_incorrect' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'ashwini0738@gmail.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'new-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('The email or password was not accepted. If you just reset the password, use the new password and make sure this is the same account and environment.')).toBeTruthy();
    });
    expect(screen.queryByText('We could not sign you in. Please check your details and try again.')).toBeNull();
  });

  it('explains when the sign-in email is not found', async () => {
    const signIn = createSignIn();
    signIn.password.mockResolvedValueOnce({
      error: { code: 'form_identifier_not_found' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'missing@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'new-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('No account was found for this email. Check the address or use the same account and environment where you reset the password.')).toBeTruthy();
    });
  });
});

describe('forgot password flow', () => {
  it('opens password recovery and returns to login', () => {
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    expect(screen.getByTestId('password-reset-flow')).toBeTruthy();

    fireEvent.press(screen.getByTestId('password-reset-back'));
    expect(screen.getByTestId('login-scroll-view')).toBeTruthy();
  });

  it('validates the recovery email before calling Clerk', async () => {
    const signIn = createSignIn();
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'invalid');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));

    await waitFor(() => expect(screen.getByText('Enter a valid email address and try again.')).toBeTruthy());
    expect(signIn.create).not.toHaveBeenCalled();
  });

  it('progresses through the supported Clerk recovery states', async () => {
    const signIn = createSignIn();
    signIn.resetPasswordEmailCode.verifyCode.mockImplementation(async () => {
      signIn.status = 'needs_new_password';
      return { error: null };
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));
    await waitFor(() => expect(screen.getByTestId('password-reset-code')).toBeTruthy());

    expect(signIn.create).toHaveBeenCalledWith({ identifier: 'traveller@example.com' });
    expect(signIn.resetPasswordEmailCode.sendCode).toHaveBeenCalledTimes(1);

    fireEvent.changeText(screen.getByTestId('password-reset-code'), '123456');
    fireEvent.press(screen.getByTestId('password-reset-submit-code'));
    await waitFor(() => expect(screen.getByTestId('password-reset-new-password')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('password-reset-new-password'), 'new-secure-password');
    fireEvent.changeText(screen.getByTestId('password-reset-confirm-password'), 'new-secure-password');
    fireEvent.press(screen.getByTestId('password-reset-submit-password'));

    await waitFor(() => {
      expect(signIn.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({
        password: 'new-secure-password',
      });
      expect(screen.getByText('Your password was reset. Sign in with your new password.')).toBeTruthy();
    });
  });

  it('shows a safe Clerk recovery rejection', async () => {
    const signIn = createSignIn();
    signIn.create.mockResolvedValueOnce({
      error: { code: 'form_identifier_not_found', message: 'internal provider details' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'missing@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));

    await waitFor(() => {
      expect(screen.getByText('No account was found for this email. Check the address or use the same account and environment where you reset the password.')).toBeTruthy();
    });
    expect(screen.queryByText('internal provider details')).toBeNull();
  });

  it('handles code errors, resend, and password mismatch without advancing', async () => {
    const signIn = createSignIn();
    signIn.resetPasswordEmailCode.verifyCode.mockResolvedValueOnce({
      error: { code: 'verification_code_invalid' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));
    await waitFor(() => expect(screen.getByTestId('password-reset-code')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('password-reset-code'), '123456');
    fireEvent.press(screen.getByTestId('password-reset-submit-code'));
    await waitFor(() => expect(screen.getByText('That verification code is incorrect. Check the code and try again.')).toBeTruthy());
    expect(screen.queryByTestId('password-reset-new-password')).toBeNull();

    fireEvent.press(screen.getByTestId('password-reset-resend'));
    await waitFor(() => expect(screen.getByText('A new password reset code was sent.')).toBeTruthy());
    expect(signIn.resetPasswordEmailCode.sendCode).toHaveBeenCalledTimes(2);
  });

  it('shows Clerk password requirements returned by the reset API', async () => {
    const signIn = createSignIn();
    signIn.resetPasswordEmailCode.verifyCode.mockImplementation(async () => {
      signIn.status = 'needs_new_password';
      return { error: null };
    });
    signIn.resetPasswordEmailCode.submitPassword.mockResolvedValueOnce({
      error: { code: 'password_length' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));
    await waitFor(() => expect(screen.getByTestId('password-reset-code')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('password-reset-code'), '123456');
    fireEvent.press(screen.getByTestId('password-reset-submit-code'));
    await waitFor(() => expect(screen.getByTestId('password-reset-new-password')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('password-reset-new-password'), 'short');
    fireEvent.changeText(screen.getByTestId('password-reset-confirm-password'), 'short');
    fireEvent.press(screen.getByTestId('password-reset-submit-password'));

    await waitFor(() => expect(screen.getByText('Choose a longer password that meets the account security requirements.')).toBeTruthy());
  });

  it('shows a useful message for an unrecognized Clerk password-policy code', async () => {
    const signIn = createSignIn();
    signIn.resetPasswordEmailCode.verifyCode.mockImplementation(async () => {
      signIn.status = 'needs_new_password';
      return { error: null };
    });
    signIn.resetPasswordEmailCode.submitPassword.mockResolvedValueOnce({
      error: { code: 'form_password_not_strong_enough' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));
    await waitFor(() => expect(screen.getByTestId('password-reset-code')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('password-reset-code'), '123456');
    fireEvent.press(screen.getByTestId('password-reset-submit-code'));
    await waitFor(() => expect(screen.getByTestId('password-reset-new-password')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('password-reset-new-password'), 'not-strong-enough');
    fireEvent.changeText(screen.getByTestId('password-reset-confirm-password'), 'not-strong-enough');
    fireEvent.press(screen.getByTestId('password-reset-submit-password'));

    await waitFor(() => {
      expect(screen.getByText('Choose a stronger password with a mix of letters, numbers, and symbols.')).toBeTruthy();
    });
    expect(screen.queryByText('We could not reset your password. Please try again.')).toBeNull();
  });

  it('handles a rejected recovery promise and resets loading', async () => {
    const signIn = createSignIn();
    signIn.create.mockRejectedValueOnce(new Error('network internals'));
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));

    await waitFor(() => {
      expect(screen.getByText('We could not start password reset. Check the email and try again.')).toBeTruthy();
    });
    expect(screen.queryByText('network internals')).toBeNull();
    expect(screen.getByTestId('password-reset-submit-email').props.disabled).not.toBe(true);
  });

  it('disables recovery submission while Clerk is loading', async () => {
    const signIn = createSignIn();
    let resolveCreate: ((value: { error: { code: string } }) => void) | undefined;
    signIn.create.mockReturnValueOnce(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId('forgot-password'));
    fireEvent.changeText(screen.getByTestId('password-reset-email'), 'traveller@example.com');
    fireEvent.press(screen.getByTestId('password-reset-submit-email'));

    await waitFor(() => {
      expect(screen.queryByText('Send reset code')).toBeNull();
    });

    await act(async () => {
      resolveCreate?.({ error: { code: 'form_identifier_not_found' } });
    });
    await waitFor(() => {
      expect(screen.getByText('Send reset code')).toBeTruthy();
    });
  });
});

describe('login exception handling', () => {
  it('shows a safe message and resets after a rejected email sign-in', async () => {
    const signIn = createSignIn();
    signIn.password.mockRejectedValueOnce(new Error('internal token details'));
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('We could not complete sign in. Please try again.')).toBeTruthy();
    });
    expect(screen.queryByText('internal token details')).toBeNull();
    expect(screen.getByTestId('login-continue').props.disabled).not.toBe(true);
  });

  it('handles rejected MFA verification without navigating', async () => {
    const signIn = createSignIn();
    signIn.status = 'needs_second_factor';
    signIn.mfa.verifyEmailCode.mockRejectedValueOnce(new Error('provider internals'));
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));
    await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '123456');
    fireEvent.press(screen.getByTestId('verify-sign-in-code'));

    await waitFor(() => {
      expect(screen.getByText('We could not verify that code. Please try again.')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('handles a rejected sign-in finalization without navigating', async () => {
    const signIn = createSignIn();
    signIn.finalize.mockRejectedValueOnce(new Error('finalize internals'));
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('We could not complete sign in. Please try again.')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('signup verification exception handling', () => {
  it('handles rejected verification and allows retry', async () => {
    const signUp = createSignUp();
    signUp.verifications.verifyEmailCode.mockRejectedValueOnce(new Error('verification internals'));
    mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
    const screen = render(<VerifyScreen />);

    fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
    fireEvent.press(screen.getByText('Verify email'));

    await waitFor(() => {
      expect(screen.getByText('We could not verify your email. Please try again.')).toBeTruthy();
    });
    expect(screen.getByText('Verify email')).toBeTruthy();
  });

  it('handles rejected signup finalization without navigating', async () => {
    const signUp = createSignUp();
    signUp.finalize.mockRejectedValueOnce(new Error('finalize internals'));
    mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
    const screen = render(<VerifyScreen />);

    fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
    fireEvent.press(screen.getByText('Verify email'));

    await waitFor(() => {
      expect(screen.getByText('We could not verify your email. Please try again.')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('handles rejected signup resend and resets the resend action', async () => {
    const signUp = createSignUp();
    signUp.verifications.sendEmailCode.mockRejectedValueOnce(new Error('resend internals'));
    mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
    const screen = render(<VerifyScreen />);

    fireEvent.press(screen.getByText('Send a new code'));

    await waitFor(() => {
      expect(screen.getByText('We could not send a new verification code. Please try again.')).toBeTruthy();
    });
    expect(screen.getByText('Send a new code')).toBeTruthy();
  });
});