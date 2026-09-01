import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthSecurityProvider, useAuthSecurity } from './AuthSecurityContext';
import * as SecureStore from 'expo-secure-store';

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const { useAuth } = jest.requireMock('@clerk/expo') as { useAuth: jest.Mock };

function SecurityState() {
  const { isReady, deviceAuthSetupComplete, biometricsEnabled, isUnlocked, securityError, retrySecurityState } = useAuthSecurity();
  return (
    <>
      <Text>{`${isReady}:${deviceAuthSetupComplete}:${biometricsEnabled}:${isUnlocked}:${securityError ?? 'none'}`}</Text>
      <Pressable testID="security-retry" onPress={() => void retrySecurityState()} />
    </>
  );
}

describe('AuthSecurityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    useAuth.mockImplementation(() => ({
      isSignedIn: true,
      userId: 'user-1',
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires device-auth setup for a fresh Clerk session', async () => {
    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:false:false:false:none')).toBeTruthy());
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(3);
  });

  it('restores a skipped device-auth setup without forcing a local unlock', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key.includes('biometrics-enabled')) return Promise.resolve('false');
      if (key.includes('device-auth-setup-complete')) return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:true:false:true:none')).toBeTruthy());
  });

  it('restores enabled device authentication as locked until native auth succeeds', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key.includes('biometrics-enabled')) return Promise.resolve('true');
      if (key.includes('device-auth-setup-complete')) return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:true:true:false:none')).toBeTruthy());
  });

  it('fails closed when SecureStore cannot be read', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('native storage details'));

    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:false:false:false:SECURE_STORAGE_UNAVAILABLE')).toBeTruthy());
    expect(result.queryByText('native storage details')).toBeNull();
  });

  it('recovers after a SecureStore retry succeeds', async () => {
    let readAttempts = 0;
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(() => {
      readAttempts += 1;
      return readAttempts <= 3 ? Promise.reject(new Error('temporary storage failure')) : Promise.resolve(null);
    });

    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:false:false:false:SECURE_STORAGE_UNAVAILABLE')).toBeTruthy());
    fireEvent.press(result.getByTestId('security-retry'));

    await waitFor(() => expect(result.getByText('true:false:false:false:none')).toBeTruthy());
    expect(readAttempts).toBe(6);
  });

  it('stays locked when repeated SecureStore retries fail', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('persistent storage failure'));

    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:false:false:false:SECURE_STORAGE_UNAVAILABLE')).toBeTruthy());
    fireEvent.press(result.getByTestId('security-retry'));

    await waitFor(() => expect(result.getByText('true:false:false:false:SECURE_STORAGE_UNAVAILABLE')).toBeTruthy());
    expect(result.queryByText('persistent storage failure')).toBeNull();
  });
});