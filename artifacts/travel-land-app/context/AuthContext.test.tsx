import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/expo';
import { MobileAuthProvider, useMobileAuth } from './AuthContext';

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
  useUser: jest.fn(),
}));

const mockUseClerkAuth = useClerkAuth as jest.Mock;
const mockUseClerk = useClerk as jest.Mock;
const mockUseUser = useUser as jest.Mock;

function Probe() {
  const auth = useMobileAuth();
  return <Text testID="state">{`${auth.isLoaded}:${auth.provider ?? 'none'}:${auth.userId ?? 'none'}:${auth.profile.email ?? 'none'}`}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseClerkAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: 'clerk-user-1',
    getToken: jest.fn().mockResolvedValue('clerk-token'),
  });
  mockUseClerk.mockReturnValue({ signOut: jest.fn().mockResolvedValue(undefined) });
  mockUseUser.mockReturnValue({
    user: {
      primaryEmailAddress: { emailAddress: 'traveller@example.com' },
      fullName: 'Asha Traveller',
      firstName: 'Asha',
    },
  });
});

it('exposes Clerk as the only authenticated provider', async () => {
  const screen = render(<MobileAuthProvider><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('true:clerk:clerk-user-1:traveller@example.com'));
});

it('exposes signed-out Clerk state without a parallel provider', async () => {
  mockUseClerkAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    getToken: jest.fn().mockResolvedValue(null),
  });
  mockUseUser.mockReturnValue({ user: null });
  const screen = render(<MobileAuthProvider><Probe /></MobileAuthProvider>);
  await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('true:none:none:none'));
});