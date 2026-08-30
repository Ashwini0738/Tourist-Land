import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  useListHomeFeatured,
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
  useListHomeFeatured: jest.fn(),
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
      emptyMessage,
      children,
    }: {
      title: string;
      isLoading: boolean;
      isError: boolean;
      isEmpty: boolean;
      onRetry: () => void;
      emptyMessage?: string;
      children: React.ReactNode;
    }) => (
      <NativeView>
        <NativeText>{title}</NativeText>
        <NativeText>{isLoading ? 'loading' : isError ? 'error' : isEmpty ? 'empty' : 'content'}</NativeText>
        {isError && <NativeText>Failed to load {title.toLowerCase()}</NativeText>}
        {!isLoading && !isError && isEmpty && <NativeText>{emptyMessage ?? `No ${title.toLowerCase()} found.`}</NativeText>}
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
  { name: 'Featured for you', Component: BannerSection, hook: useListHomeFeatured },
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

describe('Featured for you section', () => {
  const mockedFeaturedHook = useListHomeFeatured as unknown as QueryHook;

  beforeEach(() => {
    mockedFeaturedHook.mockReset();
  });

  it('renders persisted featured items in the API-provided order', () => {
    mockedFeaturedHook.mockReturnValue(queryResult({
      data: {
        items: [
          { id: 'featured-offer', entityType: 'offer', entityId: 'offer-1', title: 'Weekend escape offer', subtitle: 'Offer', location: 'Coorg', summary: 'Save on your next stay.', imageKey: null, destinationId: 'coorg', dateLabel: null, ratingLabel: null, priceLabel: '15% off' },
          { id: 'featured-destination', entityType: 'destination', entityId: 'coorg', title: 'Coorg Highlands', subtitle: 'Karnataka', location: 'Karnataka, India', summary: 'Misty hills and coffee estates.', imageKey: null, destinationId: 'coorg', dateLabel: null, ratingLabel: null, priceLabel: null },
          { id: 'featured-hotel', entityType: 'hotel', entityId: 'hotel-1', title: 'Rainforest Retreat', subtitle: 'Hotel', location: 'Coorg, Karnataka, India', summary: 'A quiet stay in the hills.', imageKey: null, destinationId: 'coorg', dateLabel: null, ratingLabel: null, priceLabel: null },
        ],
      },
    }));

    const { toJSON } = render(<BannerSection />);
    const labels: string[] = [];
    const collectLabels = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const candidate = node as { props?: { accessibilityLabel?: string }; children?: unknown[] };
      if (candidate.props?.accessibilityLabel?.startsWith('View featured')) {
        labels.push(candidate.props.accessibilityLabel);
      }
      candidate.children?.forEach(collectLabels);
    };
    collectLabels(toJSON());

    expect(labels).toEqual([
      'View featured Offer Weekend escape offer',
      'View featured Destination Coorg Highlands',
      'View featured Hotel Rainforest Retreat',
    ]);
  });

  it('shows the explicit empty and unavailable states', () => {
    mockedFeaturedHook.mockReturnValue(queryResult({ data: { items: [] } }));
    const empty = render(<BannerSection />);
    expect(empty.getByText('No featured content is available right now.')).toBeTruthy();

    mockedFeaturedHook.mockReturnValue(queryResult({ data: undefined, isError: true }));
    const unavailable = render(<BannerSection />);
    expect(unavailable.getByText('Failed to load featured for you')).toBeTruthy();
  });
});