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
import { supabaseSecureStorage } from '@/lib/supabaseSecureStorage';

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

type AuthContextValue = {
  provider: MobileAuthProvider | null;
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
  signUpWithPassword: (email: string, password: string) => Promise<PasswordSignUpResult>;
  verifySupabaseSignup: (code: string) => Promise<void>;
  resendSupabaseSignupCode: () => Promise<void>;
  clearPendingSupabaseSignup: () => void;
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
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      setSupabaseSession(session);
      setAccessError(null);
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

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    setAccessError(null);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Supabase did not establish an authenticated session.');
    setPendingSupabaseSignupEmail(null);
    setSupabaseSession(data.session);
  }, [requireSupabase]);

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
      return;
    }
    if (provider === 'clerk') await clerk.signOut();
  }, [clerk, provider, requireSupabase]);

  const value = useMemo<AuthContextValue>(() => ({
    provider,
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
    signUpWithPassword,
    verifySupabaseSignup,
    resendSupabaseSignupCode,
    clearPendingSupabaseSignup: () => setPendingSupabaseSignupEmail(null),
    signOut,
    markAccountNotLinked: () => setAccessError('ACCOUNT_NOT_LINKED'),
    clearAccessError: () => setAccessError(null),
  }), [
    accessError,
    configuration.client,
    configuration.error,
    getToken,
    isLoaded,
    isSignedIn,
    pendingSupabaseSignupEmail,
    profile,
    provider,
    resendSupabaseSignupCode,
    signInWithPassword,
    signOut,
    signUpWithPassword,
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