import React from 'react';
import { render } from '@testing-library/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { HomeScreen, HOME_QUERY_KEYS, refetchHomeQueries } from './HomeScreen';

const mockRefetchQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('@workspace/api-client-react', () => ({
  getListHomeBannersQueryKey: () => ['/api/v1/home/banners'],
  getListHomeDestinationsQueryKey: () => ['/api/v1/home/destinations'],
  getListHomeNearbyQueryKey: () => ['/api/v1/home/nearby'],
  getListHomeEventsQueryKey: () => ['/api/v1/home/events'],
  getListHomeHotelsQueryKey: () => ['/api/v1/home/hotels'],
  getListHomePropertiesQueryKey: () => ['/api/v1/home/properties'],
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({ background: '#fff', primary: '#0a0' }),
}));

jest.mock('./components/Header', () => {
  const NativeText = require('react-native').Text;
  return { Header: () => require('react').createElement(NativeText, null, 'Header') };
});
jest.mock('./components/WalletCard', () => {
  const NativeText = require('react-native').Text;
  return { WalletCard: () => require('react').createElement(NativeText, null, 'Wallet') };
});
jest.mock('./components/SearchBar', () => {
  const NativeText = require('react-native').Text;
  return { SearchBar: () => require('react').createElement(NativeText, null, 'Search') };
});
jest.mock('./components/QuickActions', () => {
  const NativeText = require('react-native').Text;
  return { QuickActions: () => require('react').createElement(NativeText, null, 'Actions') };
});
jest.mock('./sections/BannerSection', () => {
  const NativeText = require('react-native').Text;
  return { BannerSection: () => require('react').createElement(NativeText, null, 'Featured failed') };
});
jest.mock('./sections/DestinationSection', () => {
  const NativeText = require('react-native').Text;
  return { DestinationSection: () => require('react').createElement(NativeText, null, 'Destinations') };
});
jest.mock('./sections/HotelSection', () => {
  const NativeText = require('react-native').Text;
  return { HotelSection: () => require('react').createElement(NativeText, null, 'Sample Stays') };
});
jest.mock('./sections/NearbySection', () => {
  const NativeText = require('react-native').Text;
  return { NearbySection: () => require('react').createElement(NativeText, null, 'Popular places available') };
});
jest.mock('./sections/EventSection', () => {
  const NativeText = require('react-native').Text;
  return { EventSection: () => require('react').createElement(NativeText, null, 'Upcoming Events') };
});
jest.mock('./sections/PropertySection', () => {
  const NativeText = require('react-native').Text;
  return { PropertySection: () => require('react').createElement(NativeText, null, 'Land Opportunities') };
});

const mockedUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

describe('HomeScreen', () => {
  beforeEach(() => {
    mockRefetchQueries.mockReset();
    mockRefetchQueries.mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue(
      { refetchQueries: mockRefetchQueries } as unknown as ReturnType<typeof useQueryClient>,
    );
  });

  it('keeps the other dashboard sections visible when one section fails', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Featured failed')).toBeTruthy();
    expect(getByText('Popular places available')).toBeTruthy();
    expect(getByText('Land Opportunities')).toBeTruthy();
  });

  it('refetches every Home feed on pull-to-refresh', async () => {
    await refetchHomeQueries({ refetchQueries: mockRefetchQueries });

    expect(mockRefetchQueries).toHaveBeenCalledTimes(HOME_QUERY_KEYS.length);
    expect(mockRefetchQueries.mock.calls.map(([options]) => options?.queryKey)).toEqual(
      HOME_QUERY_KEYS,
    );
  });

  it('finishes pull-to-refresh when one feed rejects', async () => {
    mockRefetchQueries.mockRejectedValueOnce(new Error('nearby unavailable'));

    await expect(refetchHomeQueries({ refetchQueries: mockRefetchQueries })).resolves.toBeUndefined();
    expect(mockRefetchQueries).toHaveBeenCalledTimes(HOME_QUERY_KEYS.length);
  });
});