import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@clerk/expo';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type SecurityContextValue = {
  isReady: boolean;
  isUnlocked: boolean;
  biometricsEnabled: boolean;
  deviceAuthSetupComplete: boolean;
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
  const { isSignedIn, userId } = useAuth();
  const [isReady, setReady] = useState(false);
  const [biometricsEnabled, setBiometrics] = useState(false);
  const [deviceAuthSetupComplete, setDeviceAuthSetupCompleteState] = useState(false);
  const [isUnlocked, setUnlocked] = useState(false);

  const storageKey = useCallback((key: string) => `${key}.${userId ?? 'signed-out'}`, [userId]);

  useEffect(() => {
    let active = true;
    setReady(false);
    setUnlocked(false);
    if (!isSignedIn || !userId) {
      setBiometrics(false);
      setDeviceAuthSetupCompleteState(false);
      setReady(true);
      return () => { active = false; };
    }
    Promise.all([
      SecureStore.getItemAsync(storageKey(BIOMETRICS)),
      SecureStore.getItemAsync(storageKey(SETUP_COMPLETE)),
      SecureStore.getItemAsync(storageKey(LEGACY_HAS_PIN)),
    ])
      .then(async ([biometrics, setupComplete, legacyPin]) => {
        if (!active) return;
        const enabled = biometrics === 'true';
        const hasCompletedSetup = setupComplete === 'true' || biometrics !== null || legacyPin === 'true';
        setBiometrics(enabled);
        setDeviceAuthSetupCompleteState(hasCompletedSetup);
        setUnlocked(hasCompletedSetup && !enabled);
        if (hasCompletedSetup && setupComplete !== 'true') {
          await SecureStore.setItemAsync(storageKey(SETUP_COMPLETE), 'true');
        }
        await SecureStore.deleteItemAsync(storageKey(LEGACY_HAS_PIN));
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setBiometrics(false);
        setDeviceAuthSetupCompleteState(true);
        setUnlocked(true);
        setReady(true);
      });
    return () => { active = false; };
  }, [isSignedIn, storageKey, userId]);

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

  return <SecurityContext.Provider value={{ isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete, unlock, lock, setBiometricsEnabled, setDeviceAuthSetupComplete }}>{children}</SecurityContext.Provider>;
}

export function useAuthSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useAuthSecurity must be used inside AuthSecurityProvider');
  return value;
}