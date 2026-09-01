import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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