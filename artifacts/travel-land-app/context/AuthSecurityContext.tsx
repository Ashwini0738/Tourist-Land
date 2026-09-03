import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useMobileAuth } from './AuthContext';

type SecurityError = 'SECURE_STORAGE_UNAVAILABLE';
type SecurityContextValue = {
  isReady: boolean;
  isUnlocked: boolean;
  biometricsEnabled: boolean;
  deviceAuthSetupComplete: boolean;
  securityError: SecurityError | null;
  retrySecurityState: () => Promise<void>;
  unlock: () => Promise<void>;
  lock: () => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  setDeviceAuthSetupComplete: (complete: boolean) => Promise<void>;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);
const BIOMETRICS = 'travel-land.biometrics-enabled';
const SETUP_COMPLETE = 'travel-land.device-auth-setup-complete';
const LEGACY_HAS_PIN = 'travel-land.has-pin';

export function AuthSecurityProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useMobileAuth();
  const [isReady, setReady] = useState(false);
  const [biometricsEnabled, setBiometrics] = useState(false);
  const [deviceAuthSetupComplete, setDeviceAuthSetupCompleteState] = useState(false);
  const [isUnlocked, setUnlocked] = useState(false);
  const [securityError, setSecurityError] = useState<SecurityError | null>(null);
  const loadGeneration = useRef(0);

  const storageKey = useCallback((key: string) => `${key}.${userId ?? 'signed-out'}`, [userId]);

  const readSecurityState = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isCurrent = () => loadGeneration.current === generation;
    setReady(false);
    setUnlocked(false);
    setSecurityError(null);
    if (!isSignedIn || !userId) {
      if (!isCurrent()) return;
      setBiometrics(false);
      setDeviceAuthSetupCompleteState(false);
      setReady(true);
      return;
    }

    try {
      const [biometrics, setupComplete, legacyPin] = await Promise.all([
        SecureStore.getItemAsync(storageKey(BIOMETRICS)),
        SecureStore.getItemAsync(storageKey(SETUP_COMPLETE)),
        SecureStore.getItemAsync(storageKey(LEGACY_HAS_PIN)),
      ]);
      if (!isCurrent()) return;
        const enabled = biometrics === 'true';
        const hasCompletedSetup = setupComplete === 'true' || biometrics !== null || legacyPin === 'true';
        setBiometrics(enabled);
        setDeviceAuthSetupCompleteState(hasCompletedSetup);
        setUnlocked(hasCompletedSetup && !enabled);
        if (hasCompletedSetup && setupComplete !== 'true') {
          await SecureStore.setItemAsync(storageKey(SETUP_COMPLETE), 'true');
        }
        if (!isCurrent()) return;
        await SecureStore.deleteItemAsync(storageKey(LEGACY_HAS_PIN));
        setReady(true);
    } catch {
      if (!isCurrent()) return;
      setBiometrics(false);
      setDeviceAuthSetupCompleteState(false);
      setUnlocked(false);
      setSecurityError('SECURE_STORAGE_UNAVAILABLE');
      setReady(true);
    }
  }, [isSignedIn, storageKey, userId]);

  useEffect(() => {
    void readSecurityState();
    return () => {
      loadGeneration.current += 1;
    };
  }, [readSecurityState]);

  const retrySecurityState = useCallback(async () => {
    await readSecurityState();
  }, [readSecurityState]);

  const setBiometricsEnabled = useCallback(async (enabled: boolean) => {
    setBiometrics(enabled);
    await SecureStore.setItemAsync(storageKey(BIOMETRICS), String(enabled));
  }, [storageKey]);
  const setDeviceAuthSetupComplete = useCallback(async (complete: boolean) => {
    setDeviceAuthSetupCompleteState(complete);
    await SecureStore.setItemAsync(storageKey(SETUP_COMPLETE), String(complete));
  }, [storageKey]);
  const unlock = useCallback(async () => setUnlocked(true), []);
  const lock = useCallback(async () => setUnlocked(false), []);

  return <SecurityContext.Provider value={{ isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete, securityError, retrySecurityState, unlock, lock, setBiometricsEnabled, setDeviceAuthSetupComplete }}>{children}</SecurityContext.Provider>;
}

export function useAuthSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useAuthSecurity must be used inside AuthSecurityProvider');
  return value;
}