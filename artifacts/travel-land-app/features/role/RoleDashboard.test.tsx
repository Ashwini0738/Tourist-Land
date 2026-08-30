import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RoleDashboard, RoleProfileScreen } from './RoleDashboard';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@clerk/expo', () => ({
  useClerk: () => ({ signOut: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#ffffff',
    foreground: '#111111',
    primary: '#14532d',
    primaryForeground: '#ffffff',
    accent: '#f5c26b',
    accentForeground: '#3f2a10',
    secondary: '#eef2ee',
    mutedForeground: '#66736a',
    border: '#d9dfda',
    card: '#ffffff',
  }),
}));

jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('gives vendors access to both the traveller app and vendor tools', () => {
  const screen = render(
    <RoleDashboard role="vendor" status="approved" message="Ready" />,
  );

  fireEvent.press(screen.getByTestId('role-nav-traveller app'));
  expect(router.push).toHaveBeenCalledWith('/(tabs)');
  expect(screen.getByTestId('role-nav-listings')).toBeTruthy();
  expect(screen.getByTestId('role-nav-bookings')).toBeTruthy();
});

it('renders role profile details and logs out from the profile action', async () => {
  const screen = render(
    <RoleProfileScreen
      role="vendor"
      currentUser={{
        id: 'local-user',
        clerkUserId: 'clerk-user',
        email: 'vendor@example.com',
        displayName: 'Vendor Owner',
        phone: '+91 99999 99999',
        avatarUrl: null,
        role: 'vendor',
        status: 'active',
        vendorProfile: {
          id: 'vendor-profile',
          userId: 'local-user',
          businessName: 'Green Valley Stays',
          businessType: 'Homestay',
          contactName: 'Vendor Owner',
          phone: '+91 99999 99999',
          email: 'vendor@example.com',
          description: 'A verified place to stay.',
          address: '1 Valley Road',
          city: 'Munnar',
          state: 'Kerala',
          country: 'India',
          status: 'approved',
          createdAt: '2026-08-30T00:00:00.000Z',
          updatedAt: '2026-08-30T00:00:00.000Z',
        },
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T00:00:00.000Z',
      }}
    />,
  );

  expect(screen.getByText('Green Valley Stays')).toBeTruthy();
  expect(screen.getByText('Vendor access approved')).toBeTruthy();
  expect(screen.getByTestId('vendor-profile-logout')).toBeTruthy();
  fireEvent.press(screen.getByTestId('vendor-profile-logout'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
});