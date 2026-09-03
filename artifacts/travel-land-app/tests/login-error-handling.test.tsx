import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useAuth, useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import LoginScreen from '../app/login';
import VerifyScreen from '../app/verify';

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
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
const mockUseClerk = useClerk as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;
const setActive = jest.fn().mockResolvedValue(undefined);
const signOut = jest.fn().mockResolvedValue(undefined);
const redirectToTasks = jest.fn().mockResolvedValue(undefined);

function createSignIn() {
  return {
    status: 'complete',
    createdSessionId: null as string | null,
    existingSession: undefined as { sessionId: string } | undefined,
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
    finalize: jest.fn().mockResolvedValue({ error: null }),
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

function createSession(
  id = 'sess_existing',
  email = 'traveller@example.com',
  status = 'active',
  currentTask?: { key: 'choose-organization' | 'reset-password' | 'setup-mfa' },
) {
  return {
    id,
    status,
    currentTask,
    lastActiveOrganizationId: null as string | null,
    user: {
      emailAddresses: [{ emailAddress: email }],
      organizationMemberships: [] as Array<{ organization: { id: string } }>,
    },
  };
}

function createClerk(sessions = [] as ReturnType<typeof createSession>[], activeSessionId?: string) {
  const clerk = {
    setActive,
    signOut,
    redirectToTasks,
    session: sessions.find((session) => session.id === activeSessionId) ?? null,
    client: {
      sessions: [...sessions],
      lastActiveSessionId: activeSessionId ?? null,
    },
  };
  setActive.mockImplementation(async ({ session, organization }: { session: string; organization?: string }) => {
    clerk.session = clerk.client.sessions.find((candidate) => candidate.id === session) ?? null;
    clerk.client.lastActiveSessionId = session;
    if (organization && clerk.session) {
      clerk.session.status = 'active';
      clerk.session.currentTask = undefined;
      clerk.session.lastActiveOrganizationId = organization;
    }
  });
  signOut.mockImplementation(async ({ sessionId }: { sessionId?: string } = {}) => {
    clerk.client.sessions = sessionId
      ? clerk.client.sessions.filter((session) => session.id !== sessionId)
      : [];
    if (!sessionId || clerk.session?.id === sessionId) {
      clerk.session = null;
      clerk.client.lastActiveSessionId = null;
    }
  });
  return clerk;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ isLoaded: true });
  mockUseClerk.mockReturnValue(createClerk());
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
    const clerk = createClerk();
    signIn.finalize.mockImplementationOnce(async () => {
      signIn.createdSessionId = 'sess_finalized';
      const finalizedSession = createSession(
        'sess_finalized',
        'traveller@example.com',
        'pending',
        { key: 'choose-organization' },
      );
      finalizedSession.user.organizationMemberships.push({ organization: { id: 'org_only' } });
      clerk.client.sessions.push(finalizedSession);
      clerk.client.lastActiveSessionId = finalizedSession.id;
      clerk.session = finalizedSession;
      return { error: null };
    });
    mockUseClerk.mockReturnValue(clerk);
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
      expect(signIn.finalize).toHaveBeenCalledWith({});
    });
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_finalized', organization: 'org_only' });
    expect(screen.queryByText('We could not complete sign in. Please try again.')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('starts a fresh password sign-in when the user explicitly submits with an active Clerk session', async () => {
    const signIn = createSignIn();
    const clerk = createClerk([createSession('sess_previous')], 'sess_previous');
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockUseClerk.mockReturnValue(clerk);
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ sessionId: 'sess_previous' }));
    expect(signIn.password).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('clears a stale local Clerk session before starting a fresh password sign-in', async () => {
    const signIn = createSignIn();
    const clerk = createClerk([createSession('sess_stale')], 'sess_stale');
    mockUseClerk.mockReturnValue(clerk);
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'new-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ sessionId: 'sess_stale' }));
    expect(signIn.reset.mock.invocationCallOrder[0]).toBeLessThan(signIn.password.mock.invocationCallOrder[0]);
    expect(signIn.password).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('removes a reported stale server session and retries a fresh password sign-in once', async () => {
    const signIn = createSignIn();
    signIn.existingSession = { sessionId: 'sess_server_stale' };
    signIn.password.mockResolvedValueOnce({
      error: { code: 'session_exists' },
    }).mockResolvedValueOnce({ error: null });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => expect(signIn.password).toHaveBeenCalledTimes(2));
    expect(signOut).toHaveBeenCalledWith({ sessionId: 'sess_server_stale' });
    expect(signIn.reset).toHaveBeenCalledTimes(2);
    expect(setActive).not.toHaveBeenCalledWith({ session: 'sess_server_stale' });
  });

  it('shows a safe error when Clerk reports a stale session without an identifiable session ID', async () => {
    const signIn = createSignIn();
    signIn.password.mockResolvedValueOnce({
      error: { code: 'session_exists' },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('You are already signed in. Opening your account.')).toBeTruthy();
    });
    expect(signIn.password).toHaveBeenCalledTimes(1);
  });

  it('shows a safe error when stale-session cleanup fails', async () => {
    const signIn = createSignIn();
    const clerk = createClerk([createSession('sess_stale')], 'sess_stale');
    signOut.mockRejectedValueOnce(new Error('cleanup internals'));
    mockUseClerk.mockReturnValue(clerk);
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('We could not complete sign in. Please try again.')).toBeTruthy();
    });
    expect(signIn.password).not.toHaveBeenCalled();
  });

  it('shows an explicit loading state while Clerk sign-in is pending', async () => {
    const signIn = createSignIn();
    let resolvePassword: ((value: { error: { code: string } }) => void) | undefined;
    signIn.password.mockReturnValueOnce(new Promise((resolve) => {
      resolvePassword = resolve;
    }));
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeTruthy();
      expect(screen.getByTestId('login-continue').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    await act(async () => {
      resolvePassword?.({ error: { code: 'form_password_or_identifier_incorrect' } });
    });
    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy());
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

  it('shows Clerk user-safe guidance for an otherwise unknown sign-in error', async () => {
    const signIn = createSignIn();
    signIn.password.mockResolvedValueOnce({
      error: {
        code: 'future_sign_in_rejection',
        message: 'developer-only provider details',
        longMessage: 'Password sign-in is not available for this account. Use another sign-in method.',
      },
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('login-email'), 'traveller@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'new-password');
    fireEvent.press(screen.getByTestId('login-continue'));

    await waitFor(() => {
      expect(screen.getByText('Password sign-in is not available for this account. Use another sign-in method.')).toBeTruthy();
    });
    expect(screen.queryByText('developer-only provider details')).toBeNull();
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

  it('shows a Clerk finalization error returned without throwing', async () => {
    const signIn = createSignIn();
    signIn.finalize.mockResolvedValueOnce({
      error: { code: 'session_activation_failed' },
    });
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

  it('uses the actual session created during MFA finalization and clears the verification UI', async () => {
    const signIn = createSignIn();
    const clerk = createClerk();
    signIn.status = 'needs_second_factor';
    signIn.createdSessionId = 'sess_pending';
    signIn.mfa.verifyEmailCode.mockImplementationOnce(async () => {
      signIn.status = 'complete';
      return { error: null };
    });
    signIn.finalize.mockImplementationOnce(async () => {
      expect(signIn.createdSessionId).toBe('sess_pending');
      signIn.createdSessionId = 'sess_finalized';
      clerk.client.sessions.push(createSession('sess_finalized'));
      return { error: null };
    });
    mockUseClerk.mockReturnValue(clerk);
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));
    await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '123456');
    fireEvent.press(screen.getByTestId('verify-sign-in-code'));

    await waitFor(() => expect(signIn.finalize).toHaveBeenCalledTimes(1));
    expect(signIn.mfa.verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_finalized' });
    expect(screen.queryByTestId('verify-sign-in-code')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps the MFA UI visible when activating the finalized session fails', async () => {
    const signIn = createSignIn();
    const clerk = createClerk();
    signIn.status = 'needs_second_factor';
    signIn.createdSessionId = 'sess_pending';
    signIn.mfa.verifyEmailCode.mockImplementationOnce(async () => {
      signIn.status = 'complete';
      return { error: null };
    });
    signIn.finalize.mockImplementationOnce(async () => {
      signIn.createdSessionId = 'sess_finalized';
      clerk.client.sessions.push(createSession('sess_finalized'));
      return { error: null };
    });
    setActive.mockRejectedValueOnce(new Error('activation internals'));
    mockUseClerk.mockReturnValue(clerk);
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
    expect(screen.getByTestId('verify-sign-in-code')).toBeTruthy();
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_finalized' });
  });

  it('does not submit MFA verification when Clerk already reports an active session', async () => {
    const signIn = createSignIn();
    signIn.status = 'needs_second_factor';
    signIn.mfa.verifyEmailCode.mockImplementationOnce(async () => {
      signIn.status = 'complete';
      return { error: null };
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));
    await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());

    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    screen.rerender(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '123456');
    fireEvent.press(screen.getByTestId('verify-sign-in-code'));

    await waitFor(() => expect(signIn.mfa.verifyEmailCode).not.toHaveBeenCalled());
    expect(signIn.finalize).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps a returned MFA finalization error visible and does not activate a session', async () => {
    const signIn = createSignIn();
    signIn.status = 'needs_second_factor';
    signIn.createdSessionId = 'sess_created';
    signIn.mfa.verifyEmailCode.mockImplementationOnce(async () => {
      signIn.status = 'complete';
      return { error: null };
    });
    signIn.finalize.mockResolvedValueOnce({ error: { code: 'session_activation_failed' } });
    mockUseClerk.mockReturnValue({ setActive, session: null });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));
    await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '123456');
    fireEvent.press(screen.getByTestId('verify-sign-in-code'));

    await waitFor(() => expect(screen.getByText('We could not complete sign in. Please try again.')).toBeTruthy());
    expect(signIn.finalize).toHaveBeenCalledTimes(1);
    expect(setActive).not.toHaveBeenCalled();
    expect(screen.getByTestId('verify-sign-in-code')).toBeTruthy();
  });

  it('does not fabricate or activate a session when finalization provides no usable session', async () => {
    const signIn = createSignIn();
    signIn.status = 'needs_second_factor';
    signIn.mfa.verifyEmailCode.mockImplementationOnce(async () => {
      signIn.status = 'complete';
      return { error: null };
    });
    mockUseSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'traveller@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-a-real-password');
    fireEvent.press(screen.getByTestId('login-continue'));
    await waitFor(() => expect(screen.getByTestId('sign-in-verification-code')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-verification-code'), '123456');
    fireEvent.press(screen.getByTestId('verify-sign-in-code'));

    await waitFor(() => expect(screen.getByText('We could not complete sign in. Please try again.')).toBeTruthy());
    expect(signIn.finalize).toHaveBeenCalledTimes(1);
    expect(setActive).not.toHaveBeenCalled();
    expect(signIn.createdSessionId).toBeNull();
    expect(screen.getByTestId('verify-sign-in-code')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('signup verification exception handling', () => {
  it('finalizes verified email without choosing an authenticated destination', async () => {
    const signUp = createSignUp();
    mockUseSignUp.mockReturnValue({ signUp, fetchStatus: 'idle' });
    const screen = render(<VerifyScreen />);

    fireEvent.changeText(screen.getByTestId('verification-code'), '123456');
    fireEvent.press(screen.getByText('Verify email'));

    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledWith({}));
    expect(router.replace).not.toHaveBeenCalled();
  });

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