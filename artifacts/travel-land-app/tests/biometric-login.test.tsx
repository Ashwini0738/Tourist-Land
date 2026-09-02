import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import BiometricLoginScreen from '../app/biometric-login';
import { useAuthSecurity } from '@/context/AuthSecurityContext';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
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
    destructive: '#b42318',
  }),
}));

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('biometric login', () => {
  const unlock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthSecurity as jest.Mock).mockReturnValue({ unlock });
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  });

  it('unlocks after successful native authentication for root navigation', async () => {
    render(<BiometricLoginScreen />);

    await waitFor(() => {
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Unlock Travel & Land',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });
      expect(unlock).toHaveBeenCalledTimes(1);
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  it('stays on the unlock screen after cancellation without navigating to a PIN route', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'user_cancel',
    });
    const { getByText } = render(<BiometricLoginScreen />);

    await waitFor(() => {
      expect(getByText('Device authentication was cancelled or unsuccessful. Try again to use your device security.')).toBeTruthy();
    });
    expect(unlock).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(getByText('Try device authentication again')).toBeTruthy();

    fireEvent.press(getByText('Try device authentication again'));
    await waitFor(() => {
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(2);
        expect(unlock).toHaveBeenCalledTimes(1);
    });
      expect(router.replace).not.toHaveBeenCalled();
  });
});