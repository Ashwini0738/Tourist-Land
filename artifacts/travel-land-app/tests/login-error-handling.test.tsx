import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useMobileAuth } from '@/context/AuthContext';
import LoginScreen from '../app/login';
import VerifyScreen from '../app/verify';

jest.mock('@clerk/expo', () => ({ useClerk: jest.fn(), useSignIn: jest.fn(), useSignUp: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useMobileAuth: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ email: 'traveller@example.com' }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('@/components/PlatformIcon', () => ({ PlatformIcon: () => null }));
jest.mock('@/hooks/useColors', () => ({ useColors: () => ({ background: '#fbfaf6', foreground: '#14231f', primary: '#064e3b', primaryForeground: '#ffffff', mutedForeground: '#71807a', input: '#d7ded9', card: '#ffffff', destructive: '#b42318', muted: '#d7ded9', accent: '#f5c26b', accentForeground: '#3f2a10', gradientSoft: '#e8f0ea' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));

const mockUseClerk = useClerk as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;
const mockUseMobileAuth = useMobileAuth as jest.Mock;

function signInFixture() {
  return {
    status: 'needs_first_factor',
    createdSessionId: null,
    supportedFirstFactors: [{ strategy: 'email_code' }, { strategy: 'phone_code' }],
    supportedSecondFactors: [{ strategy: 'email_code' }],
    create: jest.fn().mockResolvedValue({ error: null }),
    emailCode: { sendCode: jest.fn().mockResolvedValue({ error: null }), verifyCode: jest.fn().mockResolvedValue({ error: null }) },
    phoneCode: { sendCode: jest.fn().mockResolvedValue({ error: null }), verifyCode: jest.fn().mockResolvedValue({ error: null }) },
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

it('preserves Clerk phone-code sign in', async () => {
  const screen = render(<LoginScreen />);
  const { signIn } = (useSignIn as jest.Mock).mock.results[0]?.value ?? {};
  fireEvent.press(screen.getByTestId('login-method-phone'));
  fireEvent.changeText(screen.getByTestId('phone-country-code'), '+91');
  fireEvent.changeText(screen.getByTestId('phone-number'), '9999999999');
  fireEvent.press(screen.getByTestId('login-continue'));
  await waitFor(() => expect(signIn.create).toHaveBeenCalledWith({ identifier: '+919999999999' }));
  expect(signIn.phoneCode.sendCode).toHaveBeenCalled();
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