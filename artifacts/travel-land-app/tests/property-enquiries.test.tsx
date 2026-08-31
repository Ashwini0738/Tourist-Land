import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseListMyPropertyEnquiries = jest.fn();

jest.mock('@workspace/api-client-react', () => ({
  getListMyPropertyEnquiriesQueryKey: jest.fn(() => ['my-property-enquiries']),
  useListMyPropertyEnquiries: mockUseListMyPropertyEnquiries,
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: () => null,
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#ffffff',
    foreground: '#111111',
    primary: '#14532d',
    primaryForeground: '#ffffff',
    secondary: '#eef2ee',
    mutedForeground: '#66736a',
    border: '#d9dfda',
    card: '#ffffff',
    destructive: '#b42318',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const PropertyEnquiriesScreen = require('../app/property-enquiries').default as typeof import('../app/property-enquiries').default;

describe('PropertyEnquiriesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListMyPropertyEnquiries.mockReturnValue({
      data: {
        items: [{
          id: 'enquiry-1',
          property: { id: 'property-1', title: 'Misty Valley Plot', address: 'Munnar, Kerala' },
          status: 'contacted',
          createdAt: '2026-08-30T08:00:00.000Z',
          history: [
            { id: 'history-1', status: 'new', createdAt: '2026-08-30T08:00:00.000Z' },
            { id: 'history-2', status: 'contacted', createdAt: '2026-08-31T09:00:00.000Z' },
          ],
        }],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it('shows the property, current status, submitted date, and safe status timeline', () => {
    const screen = render(<PropertyEnquiriesScreen />);

    expect(screen.getByText('Misty Valley Plot')).toBeTruthy();
    expect(screen.getByText('Munnar, Kerala')).toBeTruthy();
    expect(screen.getAllByText('Vendor contacted')).toHaveLength(2);
    expect(screen.getByText(/Submitted\s+Aug 30, 2026/)).toBeTruthy();
    expect(screen.getAllByText('Received')).toHaveLength(1);
    expect(screen.queryByText('Internal vendor note')).toBeNull();
  });
});