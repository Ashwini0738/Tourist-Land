import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useMobileAuth } from '@/context/AuthContext';
import LoginScreen from '../app/login';
import VerifyScreen from '../app/verify';
import { createDemoAuthSession } from '@workspace/api-client-react';

jest.mock('@clerk/expo', () => ({ useClerk: jest.fn(), useSignIn: jest.fn(), useSignUp: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useMobileAuth: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ email: 'traveller@example.com' }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('@/components/PlatformIcon', () => ({ PlatformIcon: () => null }));
jest.mock('@/hooks/useColors', () => ({ useColors: () => ({ background: '#fbfaf6', foreground: '#14231f', primary: '#064e3b', primaryForeground: '#ffffff', mutedForeground: '#71807a', input: '#d7ded9', card: '#ffffff', destructive: '#b42318', muted: '#d7ded9', accent: '#f5c26b', accentForeground: '#3f2a10', gradientSoft: '#e8f0ea' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('@workspace/api-client-react', () => ({ createDemoAuthSession: jest.fn() }));

const mockUseClerk = useClerk as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;
const mockUseMobileAuth = useMobileAuth as jest.Mock;
const mockCreateDemoAuthSession = createDemoAuthSession as jest.Mock;

function signInFixture() {
  return {
    status: 'needs_first_factor',
    createdSessionId: null as string | null,
    supportedFirstFactors: [{ strategy: 'email_code' }],
    supportedSecondFactors: [{ strategy: 'email_code' }],
    create: jest.fn().mockResolvedValue({ error: null }),
    emailCode: { sendCode: jest.fn().mockResolvedValue({ error: null }), verifyCode: jest.fn().mockResolvedValue({ error: null }) },
    mfa: { sendEmailCode: jest.fn().mockResolvedValue({ error: null }), verifyEmailCode: jest.fn().mockResolvedValue({ error: null }) },
    finalize: jest.fn().mockResolvedValue({ error: null }),
    reset: jest.fn(),
  };
}

function signUpFixture() {
  return {
    status: 'complete',
    create: jest.fn().mockResolvedValue({ error: null }),
    verifications: { sendEmailCode: jest.fn().mockResolvedValue({ error: null }), verifyEmailCode: jest.fn().mockResolvedValue({ error: null }) },
    finalize: jest.fn().mockResolvedValue({ error: null }),
    reset: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMobileAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
  mockUseClerk.mockReturnValue({ setActive: jest.fn(), signOut: jest.fn().mockResolvedValue(undefined), session: null, client: { sessions: [], lastActiveSessionId: null }, redirectToTasks: jest.fn() });
  mockUseSignIn.mockReturnValue({ signIn: signInFixture(), fetchStatus: 'idle' });
  mockUseSignUp.mockReturnValue({ signUp: signUpFixture(), fetchStatus: 'idle' });
  mockCreateDemoAuthSession.mockResolvedValue({
    email: 'demo@travel-land.example',
    ticket: 'ticket_demo',
  });
});

it('starts Clerk email-code sign in without password or Supabase APIs', async () => {
  const screen = render(<LoginScreen />);
  const { signIn } = (useSignIn as jest.Mock).mock.results[0]?.value ?? {};
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(signIn.create).toHaveBeenCalledWith({ identifier: 'traveller@example.com' }));
  expect(signIn.emailCode.sendCode).toHaveBeenCalled();
  expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy();
});

it('does not duplicate a slow initial sign-in request or verification code send', async () => {
  const signIn = signInFixture();
  let resolveInitialSignIn: (result: { error: null }) => void = () => undefined;
  const delayedInitialSignIn = new Promise<{ error: null }>((resolve) => {
    resolveInitialSignIn = resolve;
  });
  signIn.create.mockReturnValue(delayedInitialSignIn);
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  const signInButton = screen.getByTestId('login-continue');
  fireEvent.press(signInButton);
  fireEvent.press(signInButton);

  expect(signIn.create).toHaveBeenCalledTimes(1);
  expect(signIn.create).toHaveBeenCalledWith({ identifier: 'traveller@example.com' });
  expect(signIn.emailCode.sendCode).not.toHaveBeenCalled();

  resolveInitialSignIn({ error: null });
  await waitFor(() => expect(signIn.emailCode.sendCode).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy();
});

it('offers a direct recovery action when the initial code delivery fails', async () => {
  const signIn = signInFixture();
  signIn.emailCode.sendCode.mockResolvedValueOnce({ error: {} });
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(screen.getByText('We could not send your verification code. Please try again.')).toBeTruthy());
  expect(screen.getByTestId('login-email').props.value).toBe('traveller@example.com');
  expect(screen.getByTestId('login-retry-delivery')).toBeTruthy();
  expect(screen.getByText('Retry sending code')).toBeTruthy();

  fireEvent.press(screen.getByTestId('login-retry-delivery'));

  await waitFor(() => expect(signIn.emailCode.sendCode).toHaveBeenCalledTimes(2));
  expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy();
  expect(screen.queryByTestId('login-retry-delivery')).toBeNull();
});

it('verifies a Clerk email-code sign-in and keeps the existing finalization path', async () => {
  const screen = render(<LoginScreen />);
  const { signIn } = (useSignIn as jest.Mock).mock.results[0]?.value ?? {};
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());
  signIn.emailCode.verifyCode.mockImplementation(async () => {
    signIn.status = 'complete';
    return { error: null };
  });
  fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '123456');
  fireEvent.press(screen.getByTestId('verify-sign-in-code'));
  await waitFor(() => expect(signIn.emailCode.verifyCode).toHaveBeenCalledWith({ code: '123456' }));
});

it('shows email authentication without a mobile-number option', () => {
  const screen = render(<LoginScreen />);

  expect(screen.getByTestId('login-email')).toBeTruthy();
  expect(screen.queryByText('Mobile Number')).toBeNull();
  expect(screen.queryByTestId('phone-number')).toBeNull();
});

it('resumes an existing Clerk session instead of showing the already-signed-in error', async () => {
  const existingSession = {
    id: 'session_existing',
    status: 'active',
    currentTask: null,
    user: { organizationMemberships: [] },
    lastActiveOrganizationId: null,
  };
  const setActive = jest.fn().mockResolvedValue(undefined);
  const signIn = signInFixture();
  signIn.create.mockResolvedValue({
    error: { errors: [{ code: 'session_exists', message: 'Session already exists' }] },
  });
  mockUseClerk.mockReturnValue({
    setActive,
    session: existingSession,
    client: { sessions: [existingSession], lastActiveSessionId: existingSession.id },
    redirectToTasks: jest.fn(),
  });
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(setActive).toHaveBeenCalledWith({ session: existingSession.id }));
  expect(screen.queryByText('You are already signed in. Opening your account.')).toBeNull();
});

it('resets an unavailable interrupted email session so sign-in can be retried', async () => {
  const pendingSession = {
    id: 'session_pending',
    status: 'pending',
    currentTask: { key: 'choose-organization' },
    user: {
      organizationMemberships: [
        { organization: { id: 'organization_travel', name: 'Travel & Land' } },
      ],
    },
    lastActiveOrganizationId: null,
  };
  const setActive = jest.fn().mockResolvedValue(undefined);
  const signIn = signInFixture();
  signIn.create
    .mockRejectedValueOnce({ errors: [{ code: 'session_exists', message: 'Session already exists' }] })
    .mockResolvedValueOnce({ error: null });
  mockUseClerk.mockReturnValue({
    setActive,
    session: pendingSession,
    client: { sessions: [pendingSession], lastActiveSessionId: pendingSession.id },
    redirectToTasks: jest.fn(),
  });
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(screen.getByText('Your previous sign-in attempt was interrupted. We reset it so you can try again.')).toBeTruthy());
  expect(screen.getByTestId('login-email').props.value).toBe('traveller@example.com');
  expect(screen.getByTestId('login-retry')).toBeTruthy();
  expect(screen.getByText('Retry sign in')).toBeTruthy();
  expect(signIn.reset).toHaveBeenCalledTimes(1);
  expect(setActive).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('login-retry'));
  await waitFor(() => expect(signIn.create).toHaveBeenCalledTimes(2));
  expect(signIn.create).toHaveBeenLastCalledWith({ identifier: 'traveller@example.com' });
  expect(signIn.emailCode.sendCode).toHaveBeenCalled();
  expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy();
});

it('does not duplicate a slow retry request or verification code send', async () => {
  const pendingSession = {
    id: 'session_pending',
    status: 'pending',
    currentTask: { key: 'choose-organization' },
    user: {
      organizationMemberships: [
        { organization: { id: 'organization_travel', name: 'Travel & Land' } },
      ],
    },
    lastActiveOrganizationId: null,
  };
  const setActive = jest.fn().mockResolvedValue(undefined);
  const signIn = signInFixture();
  let resolveRetry: (result: { error: null }) => void = () => undefined;
  const delayedRetry = new Promise<{ error: null }>((resolve) => {
    resolveRetry = resolve;
  });
  signIn.create
    .mockRejectedValueOnce({ errors: [{ code: 'session_exists', message: 'Session already exists' }] })
    .mockReturnValueOnce(delayedRetry);
  mockUseClerk.mockReturnValue({
    setActive,
    session: pendingSession,
    client: { sessions: [pendingSession], lastActiveSessionId: pendingSession.id },
    redirectToTasks: jest.fn(),
  });
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByTestId('login-retry')).toBeTruthy());

  const retryButton = screen.getByTestId('login-retry');
  fireEvent.press(retryButton);
  fireEvent.press(retryButton);

  expect(signIn.create).toHaveBeenCalledTimes(2);
  expect(signIn.emailCode.sendCode).not.toHaveBeenCalled();

  resolveRetry({ error: null });
  await waitFor(() => expect(signIn.emailCode.sendCode).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy();
});

it('does not duplicate a slow resend request or success message', async () => {
  const signIn = signInFixture();
  let resolveResend: (result: { error: null }) => void = () => undefined;
  const delayedResend = new Promise<{ error: null }>((resolve) => {
    resolveResend = resolve;
  });
  signIn.emailCode.sendCode
    .mockResolvedValueOnce({ error: null })
    .mockReturnValueOnce(delayedResend);
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());

  const resendButton = screen.getByTestId('resend-sign-in-code');
  fireEvent.press(resendButton);
  fireEvent.press(resendButton);

  expect(signIn.emailCode.sendCode).toHaveBeenCalledTimes(2);

  resolveResend({ error: null });
  await waitFor(() => expect(screen.getByText('A new verification code was sent.')).toBeTruthy());
  expect(screen.getAllByText('A new verification code was sent.')).toHaveLength(1);
});

it('does not provision an organization for a restored pending session', async () => {
  const pendingSession = {
    id: 'session_pending',
    status: 'pending',
    currentTask: { key: 'choose-organization' },
    user: { organizationMemberships: [] },
    lastActiveOrganizationId: null,
  };
  const setActive = jest.fn().mockResolvedValue(undefined);
  const signIn = signInFixture();
  signIn.create.mockRejectedValue({ errors: [{ code: 'session_exists' }] });
  mockUseClerk.mockReturnValue({
    setActive,
    session: pendingSession,
    client: { sessions: [pendingSession], lastActiveSessionId: pendingSession.id },
    redirectToTasks: jest.fn(),
  });
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(screen.getByText('Your previous sign-in attempt was interrupted. We reset it so you can try again.')).toBeTruthy());
  expect(signIn.reset).toHaveBeenCalled();
  expect(setActive).not.toHaveBeenCalled();
});

it('uses a Clerk sign-in ticket for the development demo login', async () => {
  const previousEnabled = process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED;
  process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED = 'true';
  const signIn = signInFixture();
  signIn.create.mockImplementation(async (params: unknown) => {
    if (typeof params === 'object' && params && 'strategy' in params) {
      signIn.status = 'complete';
      signIn.createdSessionId = 'session_demo';
    }
    return { error: null };
  });
  const setActive = jest.fn();
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  mockUseClerk.mockReturnValue({
    setActive,
    session: null,
    client: { sessions: [], lastActiveSessionId: null },
    redirectToTasks: jest.fn(),
  });

  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('demo-login'));
  fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '246810');
  fireEvent.press(screen.getByTestId('verify-demo-code'));

  await waitFor(() => expect(mockCreateDemoAuthSession).toHaveBeenCalledWith({ otp: '246810' }));
  expect(signIn.create).toHaveBeenCalledWith({ strategy: 'ticket', ticket: 'ticket_demo' });
  expect(setActive).toHaveBeenCalledWith({ session: 'session_demo' });
  process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED = previousEnabled;
});

it('resumes an active session when a demo ticket reports an existing session', async () => {
  const previousEnabled = process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED;
  process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED = 'true';
  const signIn = signInFixture();
  signIn.create.mockResolvedValue({
    error: { errors: [{ code: 'session_exists', message: 'Session already exists' }] },
  });
  const existingSession = {
    id: 'session_existing',
    status: 'active',
    currentTask: null,
  };
  const setActive = jest.fn().mockResolvedValue(undefined);
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  mockUseClerk.mockReturnValue({
    setActive,
    session: existingSession,
    client: { sessions: [existingSession], lastActiveSessionId: existingSession.id },
    signOut: jest.fn().mockResolvedValue(undefined),
    redirectToTasks: jest.fn(),
  });

  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('demo-login'));
  fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '246810');
  fireEvent.press(screen.getByTestId('verify-demo-code'));

  await waitFor(() => expect(setActive).toHaveBeenCalledWith({ session: existingSession.id }));
  expect(screen.queryByTestId('sign-in-verification-code')).toBeNull();
  expect(screen.queryByText('You are already signed in. Opening your account.')).toBeNull();
  process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED = previousEnabled;
});

it('clears a failed demo session and shows a recovery message', async () => {
  const previousEnabled = process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED;
  process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED = 'true';
  const signIn = signInFixture();
  signIn.createdSessionId = 'session_demo';
  signIn.create.mockResolvedValue({ error: { code: 'invalid_ticket' } });
  const signOut = jest.fn().mockResolvedValue(undefined);
  mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  mockUseClerk.mockReturnValue({
    setActive: jest.fn(),
    signOut,
    session: { id: 'session_demo', status: 'active' },
    client: { sessions: [], lastActiveSessionId: 'session_demo' },
    redirectToTasks: jest.fn(),
  });

  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByTestId('demo-login'));
  fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '246810');
  fireEvent.press(screen.getByTestId('verify-demo-code'));

  await waitFor(() => expect(screen.getByText('Demo sign in could not be completed.')).toBeTruthy());
  expect(signIn.reset).toHaveBeenCalled();
  expect(signOut).toHaveBeenCalled();
  expect(screen.queryByTestId('sign-in-verification-code')).toBeNull();
  process.env.EXPO_PUBLIC_DEMO_AUTH_ENABLED = previousEnabled;
});

it('starts Clerk email-code signup and opens reusable verification', async () => {
  const screen = render(<LoginScreen />);
  const { signUp } = (useSignUp as jest.Mock).mock.results[0]?.value ?? {};
  fireEvent.press(screen.getByText('New here? Create an account'));
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(signUp.create).toHaveBeenCalledWith({ emailAddress: 'traveller@example.com' }));
  expect(signUp.verifications.sendEmailCode).toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith({ pathname: '/verify', params: { email: 'traveller@example.com', mode: 'signup' } });
});

it('offers a direct recovery action when the initial signup code delivery fails', async () => {
  const signUp = signUpFixture();
  signUp.verifications.sendEmailCode.mockResolvedValueOnce({ error: {} });
  mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });

  const screen = render(<LoginScreen />);
  fireEvent.press(screen.getByText('New here? Create an account'));
  fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(screen.getByText('We could not send your verification code. Please try again.')).toBeTruthy());
  expect(screen.getByTestId('login-email').props.value).toBe('traveller@example.com');
  expect(screen.getByTestId('signup-retry-delivery')).toBeTruthy();
  expect(screen.getByText('Retry sending signup code')).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('signup-retry-delivery'));

  await waitFor(() => expect(signUp.verifications.sendEmailCode).toHaveBeenCalledTimes(2));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/verify', params: { email: 'traveller@example.com', mode: 'signup' } });
  expect(screen.queryByTestId('signup-retry-delivery')).toBeNull();
});

it('verifies and finalizes the Clerk signup code', async () => {
  const screen = render(<VerifyScreen />);
  const { signUp } = (useSignUp as jest.Mock).mock.results[0]?.value ?? {};
  fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
  fireEvent.press(screen.getByTestId('verify-email'));
  await waitFor(() => expect(signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({ code: '123456' }));
  expect(signUp.finalize).toHaveBeenCalledWith({});
});