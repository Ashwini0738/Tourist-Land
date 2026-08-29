import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
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
  const { isReady, deviceAuthSetupComplete, biometricsEnabled, isUnlocked } = useAuthSecurity();
  return <Text>{`${isReady}:${deviceAuthSetupComplete}:${biometricsEnabled}:${isUnlocked}`}</Text>;
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

    await waitFor(() => expect(result.getByText('true:false:false:false')).toBeTruthy());
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

    await waitFor(() => expect(result.getByText('true:true:false:true')).toBeTruthy());
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

    await waitFor(() => expect(result.getByText('true:true:true:false')).toBeTruthy());
  });
});