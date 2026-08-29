import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BiometricScreen from '../app/biometric';
import { router } from 'expo-router';
import { useAuthSecurity } from '@/context/AuthSecurityContext';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/context/AuthSecurityContext', () => ({
  useAuthSecurity: jest.fn(),
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fbfaf6',
    foreground: '#14231f',
    primary: '#064e3b',
    primaryForeground: '#ffffff',
    mutedForeground: '#71807a',
    border: '#d7ded9',
    input: '#d7ded9',
  }),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('biometric setup', () => {
  const setBiometricsEnabled = jest.fn().mockResolvedValue(undefined);
  const setDeviceAuthSetupComplete = jest.fn().mockResolvedValue(undefined);
  const unlock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthSecurity as jest.Mock).mockReturnValue({ setBiometricsEnabled, setDeviceAuthSetupComplete, unlock });
  });

  it('persists skip, unlocks the current Clerk session, and navigates once', async () => {
    const { getByText } = render(<BiometricScreen />);

    fireEvent.press(getByText('Skip for now'));

    await waitFor(() => {
      expect(setBiometricsEnabled).toHaveBeenCalledWith(false);
      expect(setDeviceAuthSetupComplete).toHaveBeenCalledWith(true);
      expect(unlock).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('does not start another setup action while skip is saving', async () => {
    let resolveSave: (() => void) | undefined;
    setBiometricsEnabled.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveSave = resolve; }),
    );
    const { getByText } = render(<BiometricScreen />);

    fireEvent.press(getByText('Skip for now'));
    fireEvent.press(getByText('Continuing…'));

    expect(setBiometricsEnabled).toHaveBeenCalledTimes(1);
    resolveSave?.();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)'));
  });
});