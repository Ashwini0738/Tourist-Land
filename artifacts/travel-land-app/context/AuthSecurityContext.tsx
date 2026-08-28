import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@clerk/expo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type SecurityContextValue = {
  isReady: boolean;
  isUnlocked: boolean;
  hasPin: boolean;
  biometricsEnabled: boolean;
  unlock: () => Promise<void>;
  lock: () => Promise<void>;
  setPinConfigured: (configured: boolean) => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  callPinEndpoint: (path: string, body: Record<string, string>) => Promise<{ ok: boolean; message?: string; code?: string }>;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);
const HAS_PIN = 'travel-land.has-pin';
const BIOMETRICS = 'travel-land.biometrics-enabled';

export function AuthSecurityProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth();
  const [isReady, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [biometricsEnabled, setBiometrics] = useState(false);
  const [isUnlocked, setUnlocked] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const storageKey = useCallback((key: string) => `${key}.${userId ?? 'signed-out'}`, [userId]);

  useEffect(() => {
    let active = true;
    setReady(false);
    setUnlocked(false);
    if (!isSignedIn || !userId) {
      setHasPin(false);
      setBiometrics(false);
      setReady(true);
      return () => { active = false; };
    }
    Promise.all([
      SecureStore.getItemAsync(storageKey(HAS_PIN)),
      SecureStore.getItemAsync(storageKey(BIOMETRICS)),
      getTokenRef.current(),
    ])
      .then(async ([localPin, biometrics, token]) => {
        if (!active) return;
        let serverHasPin = localPin === 'true';
        try {
          const response = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/v1/auth/session`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            const status = await response.json() as { pinConfigured?: boolean };
            serverHasPin = status.pinConfigured === true;
            await SecureStore.setItemAsync(storageKey(HAS_PIN), String(serverHasPin));
          }
        } catch {
          // A local hint keeps returning users usable during a temporary outage.
        }
        if (!active) return;
        setHasPin(serverHasPin);
        setBiometrics(biometrics === 'true');
        setReady(true);
      })
      .catch(() => active && setReady(true));
    return () => { active = false; };
  }, [isSignedIn, storageKey, userId]);

  const setPinConfigured = useCallback(async (configured: boolean) => {
    setHasPin(configured);
    await SecureStore.setItemAsync(storageKey(HAS_PIN), String(configured));
  }, [storageKey]);
  const setBiometricsEnabled = useCallback(async (enabled: boolean) => {
    setBiometrics(enabled);
    await SecureStore.setItemAsync(storageKey(BIOMETRICS), String(enabled));
  }, [storageKey]);
  const unlock = useCallback(async () => setUnlocked(true), []);
  const lock = useCallback(async () => setUnlocked(false), []);
  const callPinEndpoint = useCallback(async (path: string, body: Record<string, string>) => {
    try {
      const token = await getTokenRef.current();
      const response = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: { code?: string; message?: string };
        message?: string;
      };
      if (!response.ok) {
        return {
          ok: false,
          code: payload.error?.code,
          message: payload.error?.message ?? 'We could not verify that. Please try again.',
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, message: 'We could not reach your account. Please try again.' };
    }
  }, []);

  return <SecurityContext.Provider value={{ isReady, isUnlocked, hasPin, biometricsEnabled, unlock, lock, setPinConfigured, setBiometricsEnabled, callPinEndpoint }}>{children}</SecurityContext.Provider>;
}

export function useAuthSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useAuthSecurity must be used inside AuthSecurityProvider');
  return value;
}