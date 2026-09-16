import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/expo';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

type AuthProfile = {
  email: string | null;
  displayName: string | null;
  firstName: string | null;
};

type AuthContextValue = {
  provider: 'clerk' | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  profile: AuthProfile;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerk = useClerk();
  const { user: clerkUser } = useUser();

  const getToken = useCallback(() => clerkAuth.getToken(), [clerkAuth]);
  const signOut = useCallback(() => clerk.signOut(), [clerk]);
  const isSignedIn = Boolean(clerkAuth.isSignedIn);
  const profile = useMemo<AuthProfile>(() => ({
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerkUser?.fullName ?? clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    firstName: clerkUser?.firstName ?? null,
  }), [clerkUser]);

  const value = useMemo<AuthContextValue>(() => ({
    provider: isSignedIn ? 'clerk' : null,
    isLoaded: clerkAuth.isLoaded,
    isSignedIn,
    userId: clerkAuth.userId ?? null,
    profile,
    getToken,
    signOut,
  }), [clerkAuth.isLoaded, clerkAuth.userId, getToken, isSignedIn, profile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMobileAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useMobileAuth must be used inside MobileAuthProvider');
  return value;
}