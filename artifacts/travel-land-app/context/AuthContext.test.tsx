import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createMobileSupabaseClient } from '@workspace/supabase/mobile';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/expo';
import { MobileAuthProvider, useMobileAuth } from './AuthContext';

jest.mock('@workspace/supabase/mobile', () => ({
  createMobileSupabaseClient: jest.fn(),
}));

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
  useUser: jest.fn(),
}));

const mockCreateSupabase = createMobileSupabaseClient as jest.Mock;
const mockUseClerkAuth = useClerkAuth as jest.Mock;
const mockUseClerk = useClerk as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const supabaseSignOut = jest.fn();
const clerkSignOut = jest.fn();

function session(id = 'supabase-user-1', token = 'supabase-access-token') {
  return {
    access_token: token,
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1_900_000_000,
    token_type: 'bearer',
    user: {
      id,
      email: 'traveller@example.com',
      user_metadata: { display_name: 'Asha Traveller' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-09-03T00:00:00.000Z',
    },
  };
}

function client(initialSession: ReturnType<typeof session> | null) {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: initialSession }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: session(), user: session().user },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { session: null, user: session().user },
        error: null,
      }),
      verifyOtp: jest.fn().mockResolvedValue({
        data: { session: session(), user: session().user },
        error: null,
      }),
      resend: jest.fn().mockResolvedValue({ data: {}, error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { session: session() }, error: null }),
      setSession: jest.fn().mockResolvedValue({ data: { session: session() }, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user: session().user }, error: null }),
      signOut: supabaseSignOut.mockResolvedValue({ error: null }),
    },
  };
}

function Probe() {
  const auth = useMobileAuth();
  return (
    <>
      <Text testID="state">{`${auth.isLoaded}:${auth.provider ?? 'none'}:${auth.userId ?? 'none'}:${auth.accessError ?? 'none'}`}</Text>
      <Text testID="token" />
      <Pressable testID="email-login" onPress={() => void auth.signInWithPassword('traveller@example.com', 'password')} />
      <Pressable testID="identity-link-login" onPress={() => void auth.signInForIdentityLink('traveller@example.com', 'password')} />
      <Pressable testID="email-signup" onPress={() => void auth.signUpWithPassword('traveller@example.com', 'password')} />
      <Pressable testID="logout" onPress={() => void auth.signOut()} />
      <Pressable testID="mark-unmapped" onPress={auth.markAccountNotLinked} />
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  mockUseClerkAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    getToken: jest.fn().mockResolvedValue('clerk-token'),
  });
  mockUseClerk.mockReturnValue({ signOut: clerkSignOut.mockResolvedValue(undefined) });
  mockUseUser.mockReturnValue({ user: null });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

it('restores a persisted Supabase session and exposes its identity', async () => {
  const supabase = client(session());
  mockCreateSupabase.mockReturnValue(supabase);
  const screen = render(<MobileAuthProvider><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(screen.getByTestId('state').props.children).toBe(
    'true:supabase:supabase-user-1:none',
  ));
  expect(supabase.auth.getSession).toHaveBeenCalled();
});

it('uses the active Supabase access token and signs out only Supabase', async () => {
  const supabase = client(session());
  mockCreateSupabase.mockReturnValue(supabase);
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  render(<MobileAuthProvider><Capture /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.provider).toBe('supabase'));
  await expect(authValue!.getToken()).resolves.toBe('supabase-access-token');
  await authValue!.signOut();
  expect(supabaseSignOut).toHaveBeenCalled();
  expect(clerkSignOut).not.toHaveBeenCalled();
});

it('keeps restored Clerk sessions and Clerk logout provider-specific', async () => {
  const supabase = client(null);
  mockCreateSupabase.mockReturnValue(supabase);
  const clerkGetToken = jest.fn().mockResolvedValue('clerk-token');
  mockUseClerkAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: 'clerk-user-1',
    getToken: clerkGetToken,
  });
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  render(<MobileAuthProvider><Capture /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.provider).toBe('clerk'));
  await expect(authValue!.getToken()).resolves.toBe('clerk-token');
  await authValue!.signOut();
  expect(clerkSignOut).toHaveBeenCalled();
  expect(supabaseSignOut).not.toHaveBeenCalled();
});

it('creates only a Supabase session for email/password and tracks confirmation-required signup', async () => {
  const supabase = client(null);
  mockCreateSupabase.mockReturnValue(supabase);
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  const screen = render(<MobileAuthProvider><Capture /><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.isLoaded).toBe(true));
  fireEvent.press(screen.getByTestId('email-signup'));
  await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledWith({
    email: 'traveller@example.com',
    password: 'password',
    options: {
      emailRedirectTo: 'travel-land-app://auth/callback?flow=signup',
    },
  }));
  await waitFor(() => expect(authValue?.pendingSupabaseSignupEmail).toBe('traveller@example.com'));
  await authValue!.resendSupabaseSignupCode();
  expect(supabase.auth.resend).toHaveBeenCalledWith({
    email: 'traveller@example.com',
    type: 'signup',
    options: {
      emailRedirectTo: 'travel-land-app://auth/callback?flow=signup',
    },
  });
  fireEvent.press(screen.getByTestId('email-login'));
  await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalled());
  expect(clerkSignOut).not.toHaveBeenCalled();
});

it('authenticates the Supabase side of an identity link without signing out Clerk', async () => {
  const supabase = client(null);
  mockCreateSupabase.mockReturnValue(supabase);
  mockUseClerkAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: 'clerk-user-1',
    getToken: jest.fn().mockResolvedValue('clerk-token'),
  });
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  const screen = render(<MobileAuthProvider><Capture /><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.provider).toBe('clerk'));
  fireEvent.press(screen.getByTestId('identity-link-login'));
  await waitFor(() => expect(authValue?.provider).toBe('supabase'));
  expect(authValue!.isIdentityLinking).toBe(true);
  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
    email: 'traveller@example.com',
    password: 'password',
  });
  expect(clerkSignOut).not.toHaveBeenCalled();
});

it('keeps an unmapped Supabase session authenticated but marks application access as blocked', async () => {
  mockCreateSupabase.mockReturnValue(client(session()));
  const screen = render(<MobileAuthProvider><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(screen.getByTestId('state').props.children).toContain('supabase'));
  fireEvent.press(screen.getByTestId('mark-unmapped'));
  await waitFor(() => expect(screen.getByTestId('state').props.children).toContain('ACCOUNT_NOT_LINKED'));
  expect(supabaseSignOut).not.toHaveBeenCalled();
});

it('sends recovery email through Supabase and restores only a valid recovery session', async () => {
  const supabase = client(null);
  mockCreateSupabase.mockReturnValue(supabase);
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  render(<MobileAuthProvider><Capture /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.isLoaded).toBe(true));

  await authValue!.requestSupabasePasswordReset('traveller@example.com');
  expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('traveller@example.com', {
    redirectTo: 'travel-land-app://auth/callback?flow=recovery',
  });

  await authValue!.processSupabasePasswordRecoveryUrl(
    'travel-land-app://auth/callback?code=one-time-code',
  );
  await waitFor(() => expect(authValue?.passwordRecoveryStatus).toBe('ready'));
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
  await authValue!.updateSupabasePassword('new-password');
  expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
});

it('turns an invalid recovery callback into a safe error without calling Supabase session APIs', async () => {
  const supabase = client(null);
  mockCreateSupabase.mockReturnValue(supabase);
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  render(<MobileAuthProvider><Capture /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.isLoaded).toBe(true));

  await authValue!.processSupabasePasswordRecoveryUrl(
    'travel-land-app://auth/callback?error=access_denied',
  );
  await waitFor(() => expect(authValue?.passwordRecoveryStatus).toBe('error'));
  expect(authValue!.passwordRecoveryError).toContain('invalid, expired');
  expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
});

it('exchanges a signup confirmation callback for a Supabase session without entering recovery', async () => {
  const supabase = client(null);
  mockCreateSupabase.mockReturnValue(supabase);
  let authValue: ReturnType<typeof useMobileAuth> | null = null;
  function Capture() {
    authValue = useMobileAuth();
    return null;
  }
  render(<MobileAuthProvider><Capture /></MobileAuthProvider>);
  await waitFor(() => expect(authValue?.isLoaded).toBe(true));

  await authValue!.processSupabaseAuthCallbackUrl(
    'travel-land-app://auth/callback?flow=signup&code=signup-code',
  );

  await waitFor(() => expect(authValue?.provider).toBe('supabase'));
  expect(authValue!.signupConfirmationStatus).toBe('ready');
  expect(authValue!.isPasswordRecovery).toBe(false);
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('signup-code');
  expect(clerkSignOut).not.toHaveBeenCalled();
});

it('keeps Clerk available while Supabase email configuration is missing', async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  mockUseClerkAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: 'clerk-user-1',
    getToken: jest.fn().mockResolvedValue('clerk-token'),
  });
  const screen = render(<MobileAuthProvider><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(screen.getByTestId('state').props.children).toBe(
    'true:clerk:clerk-user-1:none',
  ));
  expect(mockCreateSupabase).not.toHaveBeenCalled();
});