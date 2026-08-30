import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSearchExplore } from '@workspace/api-client-react';
import MapsScreen from '../app/maps';

jest.mock('@workspace/api-client-react', () => ({
  useSearchExplore: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/context/AppStateContext', () => ({
  useAppState: () => ({ isFavorite: () => false, toggleFavorite: jest.fn() }),
}));

jest.mock('@/features/maps/useMapLocation', () => ({
  getMapLocationMessage: () => null,
  useMapLocation: () => ({
    permission: 'denied',
    location: null,
    loading: false,
    error: null,
    requestLocation: mockRequestLocation,
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

jest.mock('@/features/home/utils/images', () => ({ getImageSource: () => 1 }));
jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: ({ name }: { name: string }) => {
    const NativeText = require('react-native').Text;
    return <NativeText>{name}</NativeText>;
  },
}));

const mockedSearch = useSearchExplore as jest.Mock;
const mockedParams = useLocalSearchParams as jest.Mock;
const mockRequestLocation = jest.fn();

const items = [
  {
    id: 'coorg',
    type: 'destination',
    title: 'Coorg Highlands',
    location: 'Karnataka, India',
    summary: 'Misty mornings and open roads.',
    category: 'Destination',
    imageKey: 'highlands',
    coordinates: { latitude: 12.42, longitude: 75.74, precision: 'region', source: 'catalog' },
    source: 'development',
    sourceLabel: 'Development preview',
    sourceNotice: 'Development discovery content only.',
  },
  {
    id: 'riverstone-estate',
    type: 'property',
    title: 'Riverstone Estate',
    location: 'Sakleshpur, Karnataka',
    summary: 'A development property preview.',
    category: 'Agri-tourism',
    imageKey: 'highlands',
    coordinates: { latitude: 12.94, longitude: 75.78, precision: 'area', source: 'catalog' },
    source: 'development',
    sourceLabel: 'Development preview',
    sourceNotice: 'Development discovery content only.',
  },
];

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={{ insets: { top: 0, right: 0, bottom: 0, left: 0 }, frame: { x: 0, y: 0, width: 400, height: 720 } }}>
      <MapsScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedParams.mockReturnValue({});
  mockedSearch.mockReturnValue({
    data: { items, total: items.length },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
});

it('renders coordinate-backed markers and result cards', () => {
  const screen = renderScreen();

  expect(screen.getByTestId('maps-screen')).toBeTruthy();
  expect(screen.getByTestId('map-canvas')).toBeTruthy();
  expect(screen.getByTestId('map-marker-destination-coorg')).toBeTruthy();
  expect(screen.getByTestId('map-marker-property-riverstone-estate')).toBeTruthy();
  expect(screen.getByTestId('map-result-destination-coorg')).toBeTruthy();
  expect(screen.getByTestId('map-result-property-riverstone-estate')).toBeTruthy();
});

it('does not request device location until the user taps Use my location', () => {
  const screen = renderScreen();

  expect(mockRequestLocation).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('use-my-location'));
  expect(mockRequestLocation).toHaveBeenCalledTimes(1);
});

it('keeps discovery usable while catalog results load or fail', () => {
  mockedSearch.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  });
  const loadingScreen = renderScreen();
  expect(loadingScreen.getByTestId('map-skeleton')).toBeTruthy();
  expect(loadingScreen.getByText('Loading catalog places…')).toBeTruthy();

  loadingScreen.unmount();
  mockedSearch.mockReturnValue({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: true,
    refetch: jest.fn(),
  });
  const errorScreen = renderScreen();
  expect(errorScreen.getByText('The catalog could not be refreshed. Your map remains available; try again.')).toBeTruthy();
  expect(errorScreen.getByText('Nothing close enough for this detour.')).toBeTruthy();
});

it('passes category and debounced search choices to the shared Explore query', () => {
  jest.useFakeTimers();
  const screen = renderScreen();

  fireEvent.press(screen.getByTestId('map-category-property'));
  expect(mockedSearch.mock.calls.at(-1)?.[0]).toMatchObject({ category: 'property' });
  fireEvent.changeText(screen.getByTestId('map-search'), 'riverstone');
  act(() => { jest.advanceTimersByTime(400); });
  expect(mockedSearch.mock.calls.at(-1)?.[0]).toMatchObject({ q: 'riverstone', category: 'property' });
  jest.useRealTimers();
});

it('selects a marker, shows its preview, and opens the existing detail route', () => {
  const screen = renderScreen();

  fireEvent.press(screen.getByTestId('map-marker-destination-coorg'));
  expect(screen.getAllByText('Coorg Highlands').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByTestId('map-view-details')).toBeTruthy();

  fireEvent.press(screen.getByTestId('map-view-details'));
  expect(router.push).toHaveBeenCalledWith('/destination/coorg');
});

it('focuses the destination passed by View on Map', () => {
  mockedParams.mockReturnValue({ destinationId: 'coorg' });
  const screen = renderScreen();

  expect(screen.getAllByText('Coorg Highlands').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByTestId('map-view-details')).toBeTruthy();
});