import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGetDestination } from '@workspace/api-client-react';
import DestinationDetail from '../app/destination/[id]';

const mockToggleFavorite = jest.fn();

jest.mock('@workspace/api-client-react', () => ({
  getGetDestinationQueryKey: (id: string) => [`/api/v1/destinations/${id}`],
  getListTripsQueryKey: () => ['/api/v1/trips'],
  useGetDestination: jest.fn(),
  useListTrips: jest.fn(() => ({ data: { items: [] }, isLoading: false })),
  useAddTripItem: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/context/AppStateContext', () => ({
  getFavoriteKey: (entityType: string, entityId: string) => `${entityType}:${entityId}`,
  useAppState: () => ({
    isFavorite: () => false,
    toggleFavorite: mockToggleFavorite,
  }),
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fbfaf6',
    foreground: '#1f2a24',
    card: '#ffffff',
    cardForeground: '#1f2a24',
    primary: '#1f5a46',
    primaryForeground: '#ffffff',
    secondary: '#eef1e9',
    secondaryForeground: '#1f2a24',
    muted: '#f3eee7',
    mutedForeground: '#718078',
    accent: '#e8b478',
    accentForeground: '#5c351c',
    destructive: '#ef4444',
    border: '#e2e6df',
    radius: 8,
  }),
}));

jest.mock('@/features/home/utils/images', () => ({
  getImageSource: () => 1,
}));

jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: ({ name }: { name: string }) => {
    const NativeText = require('react-native').Text;
    return <NativeText>{name}</NativeText>;
  },
}));

const detail = {
  destination: {
    id: 'coorg',
    slug: 'coorg-highlands',
    name: 'Coorg Highlands',
    region: 'Karnataka',
    country: 'India',
    summary: 'Misty mornings and open roads through coffee country.',
    imageKey: 'highlands',
  },
  places: [
    {
      id: 'coorg-omkareshwara-temple',
      name: 'Omkareshwara Temple',
      category: 'Temple',
      location: 'Madikeri, Karnataka',
      summary: 'A heritage stop.',
      ratingLabel: 'Sample visitor note · 4.7',
      destinationId: 'coorg',
      imageKey: 'highlands',
    },
    {
      id: 'coorg-coffee-trail',
      name: 'Coffee Estate Trail',
      category: 'Attraction',
      location: 'Coorg Highlands, Karnataka',
      summary: 'A highland outing.',
      destinationId: 'coorg',
      imageKey: 'highlands',
    },
  ],
  events: [
    {
      id: 'coorg-harvest-notes',
      title: 'Harvest Notes',
      dateLabel: 'Sample programme · Sunday morning',
      location: 'Coorg Highlands, Karnataka',
      summary: 'A development event preview.',
      destinationId: 'coorg',
      imageKey: 'highlands',
    },
  ],
  foods: [
    {
      id: 'coorg-pepper-kitchen',
      name: 'Pepper Kitchen',
      category: 'Highland cuisine',
      location: 'Coorg, Karnataka',
      summary: 'A development food preview.',
      ratingLabel: 'Sample guest note · 4.8',
      destinationId: 'coorg',
      imageKey: 'highlands',
    },
  ],
  hotels: [
    {
      id: '02',
      name: 'Misty Fig Estate',
      location: 'Coorg, Karnataka',
      summary: 'A seed stay listing.',
      ratingLabel: 'Sample guest note · 4.8',
      priceLabel: 'Sample nightly rate · ₹6,400',
      destinationId: 'coorg',
      imageKey: 'highlands',
    },
  ],
  nearby: [],
  sourceNotice: 'Development discovery content only.',
};

const mockedUseGetDestination = useGetDestination as jest.Mock;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const renderScreen = () => render(
  <SafeAreaProvider initialMetrics={{
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: 400, height: 720 },
  }}>
    <DestinationDetail />
  </SafeAreaProvider>,
);

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: detail,
  isLoading: false,
  isError: false,
  isRefetching: false,
  refetch: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockToggleFavorite.mockReset();
  mockedUseLocalSearchParams.mockReturnValue({ id: 'coorg' });
  mockedUseGetDestination.mockReturnValue(queryResult());
});

it('loads destination information and related discovery sections', () => {
  const { getByTestId, getByText, getAllByText } = renderScreen();

  expect(getByTestId('destination-details')).toBeTruthy();
  expect(getByText('Coorg Highlands')).toBeTruthy();
  expect(getByText('Karnataka, India')).toBeTruthy();
  expect(getByText('Destination information')).toBeTruthy();
  expect(getByText('Places to visit')).toBeTruthy();
  expect(getAllByText('Omkareshwara Temple').length).toBeGreaterThanOrEqual(1);
  expect(getByText('Events')).toBeTruthy();
  expect(getByText('Harvest Notes')).toBeTruthy();
  expect(getByText('Food & local experiences')).toBeTruthy();
  expect(getByText('Pepper Kitchen')).toBeTruthy();
  expect(getByText('Stays')).toBeTruthy();
  expect(getByText('Misty Fig Estate')).toBeTruthy();
  expect(getByText('No nearby places available')).toBeTruthy();
});

it('supports favorite, related navigation, map navigation, and native sharing', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);

  const { getByTestId, getAllByTestId, getByLabelText } = renderScreen();

  fireEvent.press(getByTestId('destination-favorite'));
  expect(mockToggleFavorite).toHaveBeenCalledWith('destination:coorg');

  fireEvent.press(getAllByTestId('place-coorg-omkareshwara-temple')[0]);
  expect(router.push).toHaveBeenCalledWith('/place/coorg-omkareshwara-temple');

  fireEvent.press(getByTestId('view-on-map'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/maps', params: { destinationId: 'coorg' } });

  fireEvent.press(getByLabelText('Share Coorg Highlands'));
  await waitFor(() => expect(share).toHaveBeenCalled());

  share.mockRestore();
});

it('shows a stable loading skeleton and a retryable error state', () => {
  mockedUseGetDestination.mockReturnValueOnce(queryResult({ data: undefined, isLoading: true }));
  const loading = renderScreen();
  expect(loading.getByTestId('destination-loading')).toBeTruthy();
  loading.unmount();

  const refetch = jest.fn();
  mockedUseGetDestination.mockReturnValueOnce(queryResult({ data: undefined, isLoading: false, isError: true, refetch }));
  const error = renderScreen();
  fireEvent.press(error.getByTestId('destination-retry'));
  expect(error.getByText('Unable to load destination')).toBeTruthy();
  expect(refetch).toHaveBeenCalledTimes(1);
});

it('keeps optional sections honest when the catalog has no items', () => {
  mockedUseGetDestination.mockReturnValueOnce(queryResult({
    data: { ...detail, places: [], events: [], foods: [], hotels: [], nearby: [] },
  }));

  const { getByText } = renderScreen();

  expect(getByText('No places available')).toBeTruthy();
  expect(getByText('No events available')).toBeTruthy();
  expect(getByText('No food experiences available')).toBeTruthy();
  expect(getByText('No stays available')).toBeTruthy();
  expect(getByText('No nearby places available')).toBeTruthy();
});