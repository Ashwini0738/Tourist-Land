import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/expo';
import {
  createMobileSupabaseClient,
  type Session,
  type User,
} from '@workspace/supabase/mobile';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';
import { supabaseSecureStorage } from '@/lib/supabaseSecureStorage';
import {
  PASSWORD_RECOVERY_REDIRECT_URI,
  parsePasswordRecoveryLink,
} from '@/features/auth/passwordRecovery';

export type MobileAuthProvider = 'clerk' | 'supabase';
export type MobileAuthAccessError = 'ACCOUNT_NOT_LINKED' | null;

type AuthProfile = {
  email: string | null;
  displayName: string | null;
  firstName: string | null;
};

type PasswordSignUpResult = {
  requiresEmailConfirmation: boolean;
};

export type PasswordRecoveryStatus = 'idle' | 'processing' | 'ready' | 'error';

type AuthContextValue = {
  provider: MobileAuthProvider | null;
  isIdentityLinking: boolean;
  isPasswordRecovery: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  profile: AuthProfile;
  supabaseAvailable: boolean;
  supabaseConfigurationError: string | null;
  pendingSupabaseSignupEmail: string | null;
  accessError: MobileAuthAccessError;
  getToken: () => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInForIdentityLink: (email: string, password: string) => Promise<string>;
  finishIdentityLinking: () => void;
  cancelIdentityLinking: () => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<PasswordSignUpResult>;
  verifySupabaseSignup: (code: string) => Promise<void>;
  resendSupabaseSignupCode: () => Promise<void>;
  clearPendingSupabaseSignup: () => void;
  requestSupabasePasswordReset: (email: string) => Promise<void>;
  updateSupabasePassword: (password: string) => Promise<void>;
  processSupabasePasswordRecoveryUrl: (url: string) => Promise<void>;
  clearPasswordRecovery: () => void;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  passwordRecoveryError: string | null;
  signOut: () => Promise<void>;
  markAccountNotLinked: () => void;
  clearAccessError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function supabaseConfiguration() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (!url || !publishableKey) {
    return {
      client: null,
      error: 'Supabase email authentication is not configured for this build.',
    } as const;
  }
  try {
    return {
      client: createMobileSupabaseClient({ url, publishableKey, storage: supabaseSecureStorage }),
      error: null,
    } as const;
  } catch (error) {
    return {
      client: null,
      error: error instanceof Error ? error.message : 'Supabase email authentication is unavailable.',
    } as const;
  }
}

function supabaseProfile(user: User): AuthProfile {
  const displayName = typeof user.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name
    : null;
  return {
    email: user.email ?? null,
    displayName: displayName ?? user.email ?? null,
    firstName: displayName?.trim().split(/\s+/)[0] ?? null,
  };
}

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerk = useClerk();
  const { user: clerkUser } = useUser();
  const configuration = useMemo(supabaseConfiguration, []);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  const [pendingSupabaseSignupEmail, setPendingSupabaseSignupEmail] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<MobileAuthAccessError>(null);
  const [isIdentityLinking, setIsIdentityLinking] = useState(false);
  const [passwordRecoveryStatus, setPasswordRecoveryStatus] = useState<PasswordRecoveryStatus>('idle');
  const [passwordRecoveryError, setPasswordRecoveryError] = useState<string | null>(null);
  const recoveryUrl = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const client = configuration.client;
    if (!client) {
      setSupabaseLoaded(true);
      return () => {
        mounted.current = false;
      };
    }

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted.current) return;
      setSupabaseSession(error ? null : data.session);
      setSupabaseLoaded(true);
    });
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      setSupabaseSession(session);
      setAccessError(null);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryStatus('ready');
        setPasswordRecoveryError(null);
      } else if (event === 'SIGNED_OUT') {
        setPasswordRecoveryStatus('idle');
        setPasswordRecoveryError(null);
        recoveryUrl.current = null;
      }
      setSupabaseLoaded(true);
    });
    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, [configuration.client]);

  const provider: MobileAuthProvider | null = supabaseSession
    ? 'supabase'
    : clerkAuth.isSignedIn
      ? 'clerk'
      : null;
  const isLoaded = clerkAuth.isLoaded && supabaseLoaded;
  const isSignedIn = Boolean(provider);
  const isPasswordRecovery = passwordRecoveryStatus !== 'idle';
  const userId = provider === 'supabase'
    ? supabaseSession?.user.id ?? null
    : clerkAuth.userId ?? null;
  const profile = provider === 'supabase' && supabaseSession
    ? supabaseProfile(supabaseSession.user)
    : {
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
        displayName: clerkUser?.fullName ?? null,
        firstName: clerkUser?.firstName ?? null,
      };

  const requireSupabase = useCallback(() => {
    if (!configuration.client) {
      throw new Error(configuration.error ?? 'Supabase email authentication is unavailable.');
    }
    return configuration.client;
  }, [configuration]);

  const processSupabasePasswordRecoveryUrl = useCallback(async (url: string) => {
    const link = parsePasswordRecoveryLink(url);
    if (!link || recoveryUrl.current === url) return;

    recoveryUrl.current = url;
    setPasswordRecoveryStatus('processing');
    setPasswordRecoveryError(null);
    try {
      const client = requireSupabase();
      if (link.kind === 'invalid') {
        setPasswordRecoveryStatus('error');
        setPasswordRecoveryError('This password reset link is invalid, expired, or has already been used.');
        return;
      }

      const result = link.kind === 'code'
        ? await client.auth.exchangeCodeForSession(link.code)
        : await client.auth.setSession({
            access_token: link.accessToken,
            refresh_token: link.refreshToken,
          });
      if (result.error || !result.data.session) {
        setPasswordRecoveryStatus('error');
        setPasswordRecoveryError('This password reset link is invalid, expired, or has already been used.');
        return;
      }
      setSupabaseSession(result.data.session);
      setPasswordRecoveryStatus('ready');
    } catch {
      setPasswordRecoveryStatus('error');
      setPasswordRecoveryError('This password reset link is invalid, expired, or has already been used.');
    }
  }, [requireSupabase]);

  useEffect(() => {
    let active = true;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void processSupabasePasswordRecoveryUrl(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (active && url) void processSupabasePasswordRecoveryUrl(url);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [processSupabasePasswordRecoveryUrl]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    setAccessError(null);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Supabase did not establish an authenticated session.');
    setPendingSupabaseSignupEmail(null);
    setSupabaseSession(data.session);
  }, [requireSupabase]);

  const signInForIdentityLink = useCallback(async (email: string, password: string) => {
    if (!clerkAuth.isSignedIn) {
      throw new Error('A verified Clerk session is required to link email sign-in.');
    }
    const client = requireSupabase();
    setIsIdentityLinking(true);
    setAccessError(null);
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('Supabase did not establish an authenticated session.');
      setSupabaseSession(data.session);
      return data.session.access_token;
    } catch (error) {
      setIsIdentityLinking(false);
      throw error;
    }
  }, [clerkAuth.isSignedIn, requireSupabase]);

  const finishIdentityLinking = useCallback(() => {
    setAccessError(null);
    setIsIdentityLinking(false);
  }, []);

  const cancelIdentityLinking = useCallback(async () => {
    if (configuration.client && supabaseSession) {
      const { error } = await configuration.client.auth.signOut();
      if (error) throw error;
      setSupabaseSession(null);
    }
    setAccessError(null);
    setIsIdentityLinking(false);
  }, [configuration.client, supabaseSession]);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    setAccessError(null);
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      setPendingSupabaseSignupEmail(null);
      setSupabaseSession(data.session);
      return { requiresEmailConfirmation: false };
    }
    setPendingSupabaseSignupEmail(email);
    return { requiresEmailConfirmation: true };
  }, [requireSupabase]);

  const verifySupabaseSignup = useCallback(async (code: string) => {
    const client = requireSupabase();
    if (!pendingSupabaseSignupEmail) throw new Error('No Supabase email signup is awaiting verification.');
    const { data, error } = await client.auth.verifyOtp({
      email: pendingSupabaseSignupEmail,
      token: code,
      type: 'signup',
    });
    if (error) throw error;
    if (!data.session) throw new Error('Email verification completed without an authenticated session.');
    setPendingSupabaseSignupEmail(null);
    setSupabaseSession(data.session);
  }, [pendingSupabaseSignupEmail, requireSupabase]);

  const resendSupabaseSignupCode = useCallback(async () => {
    const client = requireSupabase();
    if (!pendingSupabaseSignupEmail) throw new Error('No Supabase email signup is awaiting verification.');
    const { error } = await client.auth.resend({
      email: pendingSupabaseSignupEmail,
      type: 'signup',
    });
    if (error) throw error;
  }, [pendingSupabaseSignupEmail, requireSupabase]);

  const requestSupabasePasswordReset = useCallback(async (email: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: PASSWORD_RECOVERY_REDIRECT_URI,
    });
    if (error) throw error;
  }, [requireSupabase]);

  const updateSupabasePassword = useCallback(async (password: string) => {
    const client = requireSupabase();
    if (passwordRecoveryStatus !== 'ready' || !supabaseSession) {
      throw new Error('Your password reset session is no longer available. Request a new reset link.');
    }
    const { data, error } = await client.auth.updateUser({ password });
    if (error) throw error;
    if (!data.user) throw new Error('Your password could not be updated. Request a new reset link.');
  }, [passwordRecoveryStatus, requireSupabase, supabaseSession]);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecoveryStatus('idle');
    setPasswordRecoveryError(null);
    recoveryUrl.current = null;
  }, []);

  const getToken = useCallback(async () => {
    if (provider === 'supabase') {
      const client = requireSupabase();
      const { data, error } = await client.auth.getSession();
      if (error) return null;
      return data.session?.access_token ?? null;
    }
    return provider === 'clerk' ? clerkAuth.getToken() : null;
  }, [clerkAuth, provider, requireSupabase]);

  const signOut = useCallback(async () => {
    setAccessError(null);
    if (provider === 'supabase') {
      const client = requireSupabase();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setSupabaseSession(null);
      setPasswordRecoveryStatus('idle');
      setPasswordRecoveryError(null);
      recoveryUrl.current = null;
      return;
    }
    if (provider === 'clerk') await clerk.signOut();
  }, [clerk, provider, requireSupabase]);

  const value = useMemo<AuthContextValue>(() => ({
    provider,
    isIdentityLinking,
    isPasswordRecovery,
    isLoaded,
    isSignedIn,
    userId,
    profile,
    supabaseAvailable: Boolean(configuration.client),
    supabaseConfigurationError: configuration.error,
    pendingSupabaseSignupEmail,
    accessError,
    getToken,
    signInWithPassword,
    signInForIdentityLink,
    finishIdentityLinking,
    cancelIdentityLinking,
    signUpWithPassword,
    verifySupabaseSignup,
    resendSupabaseSignupCode,
    clearPendingSupabaseSignup: () => setPendingSupabaseSignupEmail(null),
    requestSupabasePasswordReset,
    updateSupabasePassword,
    processSupabasePasswordRecoveryUrl,
    clearPasswordRecovery,
    passwordRecoveryStatus,
    passwordRecoveryError,
    signOut,
    markAccountNotLinked: () => setAccessError('ACCOUNT_NOT_LINKED'),
    clearAccessError: () => setAccessError(null),
  }), [
    accessError,
    configuration.client,
    configuration.error,
    cancelIdentityLinking,
    finishIdentityLinking,
    getToken,
    isLoaded,
    isSignedIn,
    isPasswordRecovery,
    isIdentityLinking,
    pendingSupabaseSignupEmail,
    passwordRecoveryError,
    passwordRecoveryStatus,
    processSupabasePasswordRecoveryUrl,
    clearPasswordRecovery,
    profile,
    provider,
    resendSupabaseSignupCode,
    requestSupabasePasswordReset,
    signInWithPassword,
    signInForIdentityLink,
    signOut,
    signUpWithPassword,
    updateSupabasePassword,
    userId,
    verifySupabaseSignup,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMobileAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useMobileAuth must be used inside MobileAuthProvider');
  return value;
}