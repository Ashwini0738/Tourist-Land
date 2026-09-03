import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useMobileAuth } from '@/context/AuthContext';
import LoginScreen from '../app/login';
import VerifyScreen from '../app/verify';

jest.mock('@clerk/expo', () => ({
  useClerk: jest.fn(),
  useSignIn: jest.fn(),
  useSignUp: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useMobileAuth: jest.fn(),
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

const mockUseClerk = useClerk as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;
const mockUseMobileAuth = useMobileAuth as jest.Mock;

function createSignIn() {
  return {
    status: 'needs_first_factor',
    createdSessionId: null as string | null,
    supportedFirstFactors: [{ strategy: 'phone_code' }],
    supportedSecondFactors: [{ strategy: 'email_code' }],
    password: jest.fn(),
    create: jest.fn().mockResolvedValue({ error: null }),
    phoneCode: {
      sendCode: jest.fn().mockResolvedValue({ error: null }),
      verifyCode: jest.fn().mockResolvedValue({ error: null }),
    },
    mfa: {
      sendEmailCode: jest.fn().mockResolvedValue({ error: null }),
      verifyEmailCode: jest.fn().mockResolvedValue({ error: null }),
    },
    finalize: jest.fn().mockResolvedValue({ error: null }),
    reset: jest.fn(),
  };
}

function createSignUp() {
  return {
    status: 'complete',
    password: jest.fn(),
    verifications: {
      sendEmailCode: jest.fn().mockResolvedValue({ error: null }),
      verifyEmailCode: jest.fn().mockResolvedValue({ error: null }),
    },
    finalize: jest.fn().mockResolvedValue(undefined),
  };
}

function createClerk() {
  const clerk = {
    setActive: jest.fn(),
    session: null as { id: string; status: string; user: { organizationMemberships: never[] } } | null,
    client: {
      sessions: [] as Array<{ id: string; status: string; user: { organizationMemberships: never[] } }>,
      lastActiveSessionId: null as string | null,
    },
    redirectToTasks: jest.fn(),
  };
  clerk.setActive.mockImplementation(async ({ session }: { session: string }) => {
    clerk.session = clerk.client.sessions.find((candidate) => candidate.id === session) ?? null;
    clerk.client.lastActiveSessionId = session;
  });
  return clerk;
}

function createMobileAuth() {
  return {
    isLoaded: true,
    isSignedIn: false,
    supabaseAvailable: true,
    supabaseConfigurationError: null as string | null,
    signInWithPassword: jest.fn().mockResolvedValue(undefined),
    signUpWithPassword: jest.fn().mockResolvedValue({ requiresEmailConfirmation: true }),
    pendingSupabaseSignupEmail: null as string | null,
    verifySupabaseSignup: jest.fn().mockResolvedValue(undefined),
    resendSupabaseSignupCode: jest.fn().mockResolvedValue(undefined),
    clearPendingSupabaseSignup: jest.fn(),
  };
}

let mobileAuth = createMobileAuth();

beforeEach(() => {
  jest.clearAllMocks();
  mobileAuth = createMobileAuth();
  mockUseMobileAuth.mockImplementation(() => mobileAuth);
  mockUseClerk.mockReturnValue(createClerk());
  mockUseSignIn.mockReturnValue({ signIn: createSignIn(), fetchStatus: 'idle' });
  mockUseSignUp.mockReturnValue({ signUp: createSignUp(), fetchStatus: 'idle' });
});

function enterEmailCredentials(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
}

it('validates email before calling either provider', async () => {
  const signIn = createSignIn();
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByText('Email is required.')).toBeTruthy());
  expect(mobileAuth.signInWithPassword).not.toHaveBeenCalled();
  expect(signIn.password).not.toHaveBeenCalled();
});

it('signs in email/password through Supabase without calling Clerk password auth', async () => {
  const signIn = createSignIn();
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  enterEmailCredentials(screen);
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(mobileAuth.signInWithPassword).toHaveBeenCalledWith(
    'traveller@example.com',
    'not-a-real-password',
  ));
  expect(signIn.password).not.toHaveBeenCalled();
  expect(signIn.finalize).not.toHaveBeenCalled();
});

it('shows a safe Supabase sign-in rejection', async () => {
  mobileAuth.signInWithPassword.mockRejectedValueOnce(new Error('Invalid login credentials'));
  const screen = render(<LoginScreen />);
  enterEmailCredentials(screen);
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByText('We could not complete sign in. Please try again.')).toBeTruthy());
});

it('blocks email authentication cleanly when Supabase configuration is missing', async () => {
  mobileAuth.supabaseAvailable = false;
  mobileAuth.supabaseConfigurationError = 'Supabase email authentication is not configured for this build.';
  const screen = render(<LoginScreen />);
  enterEmailCredentials(screen);
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByText(mobileAuth.supabaseConfigurationError!)).toBeTruthy());
  expect(mobileAuth.signInWithPassword).not.toHaveBeenCalled();
});

it('signs up through Supabase and opens confirmation without calling Clerk signup', async () => {
  const signUp = createSignUp();
  mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByText('New here? Create an account'));
  enterEmailCredentials(screen);
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(mobileAuth.signUpWithPassword).toHaveBeenCalledWith(
    'traveller@example.com',
    'not-a-real-password',
  ));
  expect(signUp.password).not.toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith('/verify');
});

it('keeps a signup session returned by Supabase without creating a confirmation state', async () => {
  mobileAuth.signUpWithPassword.mockResolvedValueOnce({ requiresEmailConfirmation: false });
  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByText('New here? Create an account'));
  enterEmailCredentials(screen);
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(mobileAuth.signUpWithPassword).toHaveBeenCalled());
  expect(router.push).not.toHaveBeenCalledWith('/verify');
});

it('keeps phone OTP on Clerk and never calls Supabase password auth', async () => {
  const signIn = createSignIn();
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('login-method-phone'));
  fireEvent.changeText(screen.getByTestId('phone-country-code'), '+91');
  fireEvent.changeText(screen.getByTestId('phone-number'), '9999999999');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(signIn.create).toHaveBeenCalledWith({ identifier: '+919999999999' }));
  expect(signIn.phoneCode.sendCode).toHaveBeenCalled();
  expect(mobileAuth.signInWithPassword).not.toHaveBeenCalled();
});

it('continues a Clerk phone login into Clerk MFA when required', async () => {
  const signIn = createSignIn();
  signIn.phoneCode.verifyCode.mockImplementation(async () => {
    signIn.status = 'needs_second_factor';
    return { error: null };
  });
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('login-method-phone'));
  fireEvent.changeText(screen.getByTestId('phone-country-code'), '+91');
  fireEvent.changeText(screen.getByTestId('phone-number'), '9999999999');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByTestId('phone-sign-in-verification-code')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('phone-sign-in-verification-code'), '123456');
  fireEvent.press(screen.getByTestId('verify-phone-sign-in-code'));
  await waitFor(() => expect(signIn.mfa.sendEmailCode).toHaveBeenCalled());
  expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy();
});

it('finishes a Clerk MFA code using the Clerk-created session', async () => {
  const signIn = createSignIn();
  signIn.phoneCode.verifyCode.mockImplementation(async () => {
    signIn.status = 'needs_second_factor';
    return { error: null };
  });
  signIn.mfa.verifyEmailCode.mockImplementation(async () => {
    signIn.status = 'complete';
    return { error: null };
  });
  const clerk = createClerk();
  signIn.finalize.mockImplementation(async () => {
    const session = { id: 'clerk-phone-session', status: 'active', user: { organizationMemberships: [] as never[] } };
    signIn.createdSessionId = session.id;
    clerk.client.sessions.push(session);
    return { error: null };
  });
  mockUseClerk.mockReturnValue(clerk);
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('login-method-phone'));
  fireEvent.changeText(screen.getByTestId('phone-country-code'), '+91');
  fireEvent.changeText(screen.getByTestId('phone-number'), '9999999999');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByTestId('phone-sign-in-verification-code')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('phone-sign-in-verification-code'), '123456');
  fireEvent.press(screen.getByTestId('verify-phone-sign-in-code'));
  await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '654321');
  fireEvent.press(screen.getByTestId('verify-sign-in-code'));
  await waitFor(() => expect(clerk.setActive).toHaveBeenCalledWith({ session: 'clerk-phone-session' }));
  expect(mobileAuth.signInWithPassword).not.toHaveBeenCalled();
});

it('verifies and resends Supabase signup codes without calling Clerk verification', async () => {
  mobileAuth.pendingSupabaseSignupEmail = 'traveller@example.com';
  const signUp = createSignUp();
  mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
  const screen = render(<VerifyScreen />);
  fireEvent.press(screen.getByText('Send a new code'));
  await waitFor(() => expect(mobileAuth.resendSupabaseSignupCode).toHaveBeenCalled());
  fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
  fireEvent.press(screen.getByText('Verify email'));
  await waitFor(() => expect(mobileAuth.verifySupabaseSignup).toHaveBeenCalledWith('123456'));
  expect(signUp.verifications.verifyEmailCode).not.toHaveBeenCalled();
  expect(signUp.verifications.sendEmailCode).not.toHaveBeenCalled();
});

it('preserves Clerk verification for an existing unmigrated Clerk flow', async () => {
  const signUp = createSignUp();
  mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
  const screen = render(<VerifyScreen />);
  fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
  fireEvent.press(screen.getByText('Verify email'));
  await waitFor(() => expect(signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({ code: '123456' }));
  expect(signUp.finalize).toHaveBeenCalled();
});

it('does not send migrated email users into the Clerk password-reset flow', () => {
  const signIn = createSignIn();
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('forgot-password'));
  expect(screen.getByText('Password reset for email accounts is not available in this build yet.')).toBeTruthy();
  expect(signIn.create).not.toHaveBeenCalled();
});