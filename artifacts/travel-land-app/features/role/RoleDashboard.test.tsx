import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RoleDashboard } from './RoleDashboard';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
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