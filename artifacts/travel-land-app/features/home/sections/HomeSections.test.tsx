import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  useListHomeBanners,
  useListHomeDestinations,
  useListHomeEvents,
  useListHomeHotels,
  useListHomeNearby,
  useListHomeProperties,
} from '@workspace/api-client-react';
import { BannerSection } from './BannerSection';
import { DestinationSection } from './DestinationSection';
import { EventSection } from './EventSection';
import { HotelSection } from './HotelSection';
import { NearbySection } from './NearbySection';
import { PropertySection } from './PropertySection';

jest.mock('@workspace/api-client-react', () => ({
  useListHomeBanners: jest.fn(),
  useListHomeDestinations: jest.fn(),
  useListHomeEvents: jest.fn(),
  useListHomeHotels: jest.fn(),
  useListHomeNearby: jest.fn(),
  useListHomeProperties: jest.fn(),
}));

jest.mock('../components/SectionContainer', () => ({
  SectionContainer: (() => {
    const NativeView = require('react-native').View;
    const NativeText = require('react-native').Text;
    return ({
      title,
      isLoading,
      isError,
      isEmpty,
      onRetry,
      children,
    }: {
      title: string;
      isLoading: boolean;
      isError: boolean;
      isEmpty: boolean;
      onRetry: () => void;
      children: React.ReactNode;
    }) => (
      <NativeView>
        <NativeText>{title}</NativeText>
        <NativeText>{isLoading ? 'loading' : isError ? 'error' : isEmpty ? 'empty' : 'content'}</NativeText>
        <NativeText testID={`retry-${title}`} onPress={onRetry}>
          retry
        </NativeText>
        {!isLoading && !isError && !isEmpty && children}
      </NativeView>
    );
  })(),
}));

jest.mock('../components/Cards', () => {
  const NativeText = require('react-native').Text;
  return {
    BannerCard: () => <NativeText>banner card</NativeText>,
    DestinationCard: () => <NativeText>destination card</NativeText>,
    PlaceCard: () => <NativeText>place card</NativeText>,
  };
});

jest.mock('../components/Cards2', () => {
  const NativeText = require('react-native').Text;
  return {
    EventCard: () => <NativeText>event card</NativeText>,
    HotelCard: () => <NativeText>hotel card</NativeText>,
    PropertyCard: () => <NativeText>property card</NativeText>,
  };
});

jest.mock('@/context/AppStateContext', () => ({
  useAppState: () => ({
    isFavorite: () => false,
    toggleFavorite: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const sectionCases = [
  { name: 'Featured', Component: BannerSection, hook: useListHomeBanners },
  { name: 'Destinations', Component: DestinationSection, hook: useListHomeDestinations },
  { name: 'Upcoming Events', Component: EventSection, hook: useListHomeEvents },
  { name: 'Sample Stays', Component: HotelSection, hook: useListHomeHotels },
  { name: 'Popular places', Component: NearbySection, hook: useListHomeNearby },
  { name: 'Land Opportunities', Component: PropertySection, hook: useListHomeProperties },
] as const;

type QueryHook = {
  mockReturnValue: (value: unknown) => unknown;
  mockReset: () => unknown;
};

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: { items: [{ id: 'one', name: 'A result' }] },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  ...overrides,
});

describe.each(sectionCases)('$name section', ({ Component, hook }) => {
  const mockedHook = hook as unknown as QueryHook;

  beforeEach(() => {
    mockedHook.mockReset();
  });

  it.each([
    ['loading', { data: undefined, isLoading: true, isError: false }],
    ['empty', { data: { items: [] }, isLoading: false, isError: false }],
    ['error', { data: undefined, isLoading: false, isError: true }],
  ])('shows the %s state without affecting its container', (state, result) => {
    const refetch = jest.fn();
    mockedHook.mockReturnValue(queryResult({ ...result, refetch }));

    const { getByText, getByTestId } = render(<Component />);

    expect(getByText(state)).toBeTruthy();
    expect(getByText(sectionCases.find((item) => item.Component === Component)?.name ?? '')).toBeTruthy();

    if (state === 'error') {
      fireEvent.press(getByTestId(`retry-${sectionCases.find((item) => item.Component === Component)?.name}`));
      expect(refetch).toHaveBeenCalledTimes(1);
    }
  });

  it('renders feed content when the query succeeds', () => {
    mockedHook.mockReturnValue(queryResult());

    const { getByText } = render(<Component />);

    expect(getByText('content')).toBeTruthy();
  });
});