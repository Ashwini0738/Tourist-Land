import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AuthSecurityProvider, useAuthSecurity } from './AuthSecurityContext';

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const { useAuth } = jest.requireMock('@clerk/expo') as { useAuth: jest.Mock };

function SecurityState() {
  const { isReady, hasPin, biometricsEnabled, isUnlocked } = useAuthSecurity();
  return <Text>{`${isReady}:${hasPin}:${biometricsEnabled}:${isUnlocked}`}</Text>;
}

describe('AuthSecurityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pinConfigured: true }),
    });
    useAuth.mockImplementation(() => ({
      isSignedIn: true,
      userId: 'user-1',
      // Deliberately returns a new function identity on every provider render.
      getToken: () => Promise.resolve('clerk-token'),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes once per signed-in user even when Clerk changes getToken identity', async () => {
    const result = render(
      <AuthSecurityProvider>
        <SecurityState />
      </AuthSecurityProvider>,
    );

    await waitFor(() => expect(result.getByText('true:true:false:false')).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});