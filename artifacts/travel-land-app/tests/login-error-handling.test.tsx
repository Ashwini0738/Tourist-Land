import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useMobileAuth } from '@/context/AuthContext';
import LoginScreen from '../app/login';
import VerifyScreen from '../app/verify';
import { provisionDefaultOrganization } from '@workspace/api-client-react';

jest.mock('@clerk/expo', () => ({ useClerk: jest.fn(), useSignIn: jest.fn(), useSignUp: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useMobileAuth: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ email: 'traveller@example.com' }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('@/components/PlatformIcon', () => ({ PlatformIcon: () => null }));
jest.mock('@/hooks/useColors', () => ({ useColors: () => ({ background: '#fbfaf6', foreground: '#14231f', primary: '#064e3b', primaryForeground: '#ffffff', mutedForeground: '#71807a', input: '#d7ded9', card: '#ffffff', destructive: '#b42318', muted: '#d7ded9', accent: '#f5c26b', accentForeground: '#3f2a10', gradientSoft: '#e8f0ea' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('@workspace/api-client-react', () => ({ provisionDefaultOrganization: jest.fn() }));

const mockUseClerk = useClerk as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;
const mockUseMobileAuth = useMobileAuth as jest.Mock;
const mockProvisionDefaultOrganization = provisionDefaultOrganization as jest.Mock;

function signInFixture() {
  return {
    status: 'needs_first_factor',
    createdSessionId: null,
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
  mockUseClerk.mockReturnValue({ setActive: jest.fn(), session: null, client: { sessions: [], lastActiveSessionId: null }, redirectToTasks: jest.fn() });
  mockUseSignIn.mockReturnValue({ signIn: signInFixture(), fetchStatus: 'idle' });
  mockUseSignUp.mockReturnValue({ signUp: signUpFixture(), fetchStatus: 'idle' });
  mockProvisionDefaultOrganization.mockResolvedValue({ organizationId: 'organization_clients' });
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

it('activates the available organization before continuing a restored pending session', async () => {
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
  signIn.create.mockRejectedValue({
    errors: [{ code: 'session_exists', message: 'Session already exists' }],
  });
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

  await waitFor(() => expect(setActive).toHaveBeenCalledWith({
    session: pendingSession.id,
    organization: 'organization_travel',
  }));
  expect(screen.queryByText('You are already signed in. Opening your account.')).toBeNull();
});

it('provisions and activates the canonical organization for a restored zero-organization session', async () => {
  const pendingSession = {
    id: 'session_pending',
    status: 'pending',
    currentTask: { key: 'choose-organization' },
    getToken: jest.fn().mockResolvedValue('pending-session-token'),
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

  await waitFor(() => expect(mockProvisionDefaultOrganization).toHaveBeenCalledWith({
    headers: { Authorization: 'Bearer pending-session-token' },
  }));
  expect(setActive).toHaveBeenCalledWith({
    session: pendingSession.id,
    organization: 'organization_clients',
  });
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

it('verifies and finalizes the Clerk signup code', async () => {
  const screen = render(<VerifyScreen />);
  const { signUp } = (useSignUp as jest.Mock).mock.results[0]?.value ?? {};
  fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
  fireEvent.press(screen.getByTestId('verify-email'));
  await waitFor(() => expect(signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({ code: '123456' }));
  expect(signUp.finalize).toHaveBeenCalledWith({});
});