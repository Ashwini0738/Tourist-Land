import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { useGetExploreFilters, useListExploreCategories, useSearchExplore, useGetUnreadNotificationCount, useListFavorites, useListBookings } from '@workspace/api-client-react';
import { HomeScreen } from '@/features/home/HomeScreen';
import ExploreScreen from '@/app/(tabs)/explore';
import SavedScreen from '@/app/(tabs)/saved';
import BookingsScreen from '@/app/(tabs)/bookings';
import LandScreen from '@/app/(tabs)/land';
import ProfileScreen from '@/app/(tabs)/profile';

const mockUseSearchExplore = useSearchExplore as jest.Mock;
const mockUseListExploreCategories = useListExploreCategories as jest.Mock;
const mockUseGetExploreFilters = useGetExploreFilters as jest.Mock;
const mockUseGetUnreadNotificationCount = useGetUnreadNotificationCount as jest.Mock;
const mockUseListFavorites = useListFavorites as jest.Mock;
const mockUseListBookings = useListBookings as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockUseClerk = useClerk as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseQueryClient = useQueryClient as jest.Mock;

const mockColors = {
  background: '#f8f7f3',
  foreground: '#17232b',
  card: '#ffffff',
  cardForeground: '#17232b',
  primary: '#143f4a',
  primaryForeground: '#ffffff',
  secondary: '#e9f0ec',
  secondaryForeground: '#24443d',
  muted: '#f0ede7',
  mutedForeground: '#718087',
  accent: '#e7b76b',
  accentForeground: '#633d20',
  destructive: '#ef4444',
  border: '#dfe5e2',
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock('@workspace/api-client-react', () => ({
  getListHomeFeaturedQueryKey: () => ['/api/v1/home/featured'],
  getListHomeDestinationsQueryKey: () => ['/api/v1/home/destinations'],
  getListHomeNearbyQueryKey: () => ['/api/v1/home/nearby'],
  getListHomeEventsQueryKey: () => ['/api/v1/home/events'],
  getListHomeHotelsQueryKey: () => ['/api/v1/home/hotels'],
  getListHomePropertiesQueryKey: () => ['/api/v1/home/properties'],
  getGetUnreadNotificationCountQueryKey: () => ['/api/v1/notifications/unread-count'],
  getSearchExploreQueryKey: (params: unknown) => ['/api/v1/explore/search', params],
  getListFavoritesQueryKey: () => ['/api/v1/favorites'],
  getListBookingsQueryKey: () => ['/api/v1/bookings'],
  useGetExploreFilters: jest.fn(),
  useListExploreCategories: jest.fn(),
  useSearchExplore: jest.fn(),
  useGetUnreadNotificationCount: jest.fn(),
  useListFavorites: jest.fn(),
  useListBookings: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => mockColors,
}));

jest.mock('@/context/AppStateContext', () => ({
  getFavoriteKey: (type: string, id: string) => `${type}:${id}`,
  useAppState: jest.fn(() => ({
    favoriteIds: [],
    toggleFavorite: jest.fn(),
    isFavorite: jest.fn(() => false),
    isHydrated: true,
  })),
}));

jest.mock('@/context/RoleContext', () => ({
  useRole: jest.fn(() => ({ role: null })),
}));

jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: ({ name }: { name: string }) => require('react').createElement(require('react-native').Text, null, name),
}));

jest.mock('@/features/home/components/Header', () => ({
  Header: () => require('react').createElement(require('react-native').Text, null, 'Header'),
}));
jest.mock('@/features/home/components/WalletCard', () => ({
  WalletCard: () => require('react').createElement(require('react-native').Text, null, 'Wallet'),
}));
jest.mock('@/features/home/components/SearchBar', () => ({
  SearchBar: () => require('react').createElement(require('react-native').Text, null, 'Search'),
}));
jest.mock('@/features/home/components/QuickActions', () => ({
  QuickActions: () => require('react').createElement(require('react-native').Text, null, 'Quick actions'),
}));
jest.mock('@/features/home/sections/BannerSection', () => ({
  BannerSection: () => require('react').createElement(require('react-native').Text, null, 'Featured'),
}));
jest.mock('@/features/home/sections/DestinationSection', () => ({
  DestinationSection: () => require('react').createElement(require('react-native').Text, null, 'Destinations'),
}));
jest.mock('@/features/home/sections/HotelSection', () => ({
  HotelSection: () => require('react').createElement(require('react-native').Text, null, 'Hotels'),
}));
jest.mock('@/features/home/sections/NearbySection', () => ({
  NearbySection: () => require('react').createElement(require('react-native').Text, null, 'Nearby'),
}));
jest.mock('@/features/home/sections/EventSection', () => ({
  EventSection: () => require('react').createElement(require('react-native').Text, null, 'Events'),
}));
jest.mock('@/features/home/sections/PropertySection', () => ({
  PropertySection: () => require('react').createElement(require('react-native').Text, null, 'Land opportunities'),
}));

jest.mock('@/features/explore/ExploreCards', () => ({
  DestinationCard: () => require('react').createElement(require('react-native').Text, null, 'Destination card'),
  EventCard: () => require('react').createElement(require('react-native').Text, null, 'Event card'),
  FoodCard: () => require('react').createElement(require('react-native').Text, null, 'Food card'),
  HotelCard: () => require('react').createElement(require('react-native').Text, null, 'Hotel card'),
  PlaceCard: () => require('react').createElement(require('react-native').Text, null, 'Place card'),
  PropertyCard: () => require('react').createElement(require('react-native').Text, null, 'Property card'),
  ExploreResultCard: () => require('react').createElement(require('react-native').Text, null, 'Explore result'),
}));

jest.mock('@/features/home/utils/images', () => ({
  getImageSource: () => 1,
}));

jest.mock('@/features/hotels/HotelUI', () => ({
  NoticeBanner: ({ children }: { children: React.ReactNode }) => require('react').createElement(require('react-native').Text, null, children),
}));

jest.mock('@/components/DemoBadge', () => ({
  DemoBadge: ({ label = 'Demo' }: { label?: string }) => require('react').createElement(require('react-native').Text, null, label),
}));

function renderAtWidth(element: React.ReactElement, width: number) {
  return render(
    <SafeAreaProvider initialMetrics={{
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      frame: { x: 0, y: 0, width, height: 800 },
    }}>
      {element}
    </SafeAreaProvider>,
  );
}

function expectWebContentSpacing(screen: ReturnType<typeof render>, testID: string) {
  const node = screen.getByTestId(testID);
  const styles = StyleSheet.flatten(node.props.contentContainerStyle);
  expect(styles.paddingBottom).toBe(102);
}

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  isRefetching: false,
  isFetching: false,
  refetch: jest.fn(),
  ...overrides,
});

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQueryClient.mockReturnValue({ refetchQueries: jest.fn() });
  mockUseAuth.mockReturnValue({ isSignedIn: true });
  mockUseUser.mockReturnValue({
    user: {
      firstName: 'Asha',
      fullName: 'Asha Traveller',
      primaryEmailAddress: { emailAddress: 'asha@example.com' },
    },
  });
  mockUseClerk.mockReturnValue({ signOut: jest.fn() });
  mockUseSearchExplore.mockReturnValue(queryResult());
  mockUseListExploreCategories.mockReturnValue(queryResult());
  mockUseGetExploreFilters.mockReturnValue(queryResult());
  mockUseGetUnreadNotificationCount.mockReturnValue(queryResult({ data: { count: 0 } }));
  mockUseListFavorites.mockReturnValue(queryResult({ data: { items: [] } }));
  mockUseListBookings.mockReturnValue(queryResult({ data: { items: [] } }));
});

describe('mobile web visual contracts', () => {
  it.each([375, 768])('keeps the shared hierarchy intact at %ipx', async (width) => {
    const home = renderAtWidth(<HomeScreen />, width);
    expect(home.getByTestId('home-scroll-view')).toBeTruthy();
    expect(home.getByText('Header')).toBeTruthy();
    expect(home.getByText('Land opportunities')).toBeTruthy();
    home.unmount();

    const explore = renderAtWidth(<ExploreScreen />, width);
    expect(explore.getByTestId('explore-list')).toBeTruthy();
    expect(explore.getByText(/Follow your[\s\S]*curiosity\./)).toBeTruthy();
    expect(explore.getByText('ALL DISCOVERY · CURATED')).toBeTruthy();
    explore.unmount();

    const saved = renderAtWidth(<SavedScreen />, width);
    expectWebContentSpacing(saved, 'saved-scroll-view');
    expect(saved.getByText('YOUR COLLECTION')).toBeTruthy();
    expect(saved.getByText('Your collection is waiting')).toBeTruthy();
    saved.unmount();

    const bookings = renderAtWidth(<BookingsScreen />, width);
    expectWebContentSpacing(bookings, 'bookings-scroll-view');
    expect(bookings.getByText('YOUR TRIPS')).toBeTruthy();
    expect(bookings.getByTestId('bookings-empty-upcoming')).toBeTruthy();
    bookings.unmount();

    const land = renderAtWidth(<LandScreen />, width);
    expectWebContentSpacing(land, 'land-scroll-view');
    expect(land.getByText('LAND SOURCING')).toBeTruthy();
    expect(land.getByText('Riverstone Estate')).toBeTruthy();
    land.unmount();

    const profile = renderAtWidth(<ProfileScreen />, width);
    expectWebContentSpacing(profile, 'profile-scroll-view');
    expect(profile.getByText('YOUR SPACE')).toBeTruthy();
    expect(profile.getByText('Asha Traveller')).toBeTruthy();
  });

  it('shows Explore loading, empty, and error structures without catalog fixtures', () => {
    const loadingResult = queryResult({ isLoading: true });
    mockUseSearchExplore.mockImplementation(() => loadingResult);
    const loading = renderAtWidth(<ExploreScreen />, 375);
    expect(loading.getByTestId('explore-loading')).toBeTruthy();
    loading.unmount();

    const errorResult = queryResult({ isError: true });
    mockUseSearchExplore.mockImplementation(() => errorResult);
    const error = renderAtWidth(<ExploreScreen />, 375);
    expect(error.getByTestId('explore-error')).toBeTruthy();
    expect(error.getAllByText('Retry').length).toBeGreaterThan(0);
    error.unmount();

    const emptyResult = queryResult({ data: { items: [] } });
    mockUseSearchExplore.mockImplementation(() => emptyResult);
    const empty = renderAtWidth(<ExploreScreen />, 768);
    expect(empty.getByTestId('explore-empty')).toBeTruthy();
  });

  it('shows Saved loading, empty, and error structures', () => {
    mockUseListFavorites.mockReturnValueOnce(queryResult({ data: undefined, isLoading: true }));
    const loading = renderAtWidth(<SavedScreen />, 375);
    expect(loading.getByTestId('saved-scroll-view')).toBeTruthy();
    loading.unmount();

    mockUseListFavorites.mockReturnValueOnce(queryResult({ data: undefined, isError: true }));
    const error = renderAtWidth(<SavedScreen />, 768);
    expect(error.getByText('Your collection could not load')).toBeTruthy();
    error.unmount();

    const empty = renderAtWidth(<SavedScreen />, 375);
    expect(empty.getByText('Your collection is waiting')).toBeTruthy();
  });

  it('shows Bookings loading, empty, and error structures', () => {
    mockUseListBookings.mockReturnValueOnce(queryResult({ data: undefined, isLoading: true }));
    const loading = renderAtWidth(<BookingsScreen />, 375);
    expect(loading.getByTestId('bookings-loading')).toBeTruthy();
    loading.unmount();

    mockUseListBookings.mockReturnValueOnce(queryResult({ data: undefined, isError: true }));
    const error = renderAtWidth(<BookingsScreen />, 768);
    expect(error.getByText('Your bookings could not be loaded right now. Try again when your account session is ready.')).toBeTruthy();
    error.unmount();

    const empty = renderAtWidth(<BookingsScreen />, 375);
    expect(empty.getByTestId('bookings-empty-upcoming')).toBeTruthy();
  });

  it('keeps authenticated content hierarchy visible for Land and Profile', async () => {
    const land = renderAtWidth(<LandScreen />, 768);
    expect(land.getByText(/Find your[\s\S]*next beginning\./)).toBeTruthy();
    expect(land.getByText('Opportunities near you')).toBeTruthy();
    expect(land.getByText('Sea Wind Grove')).toBeTruthy();
    land.unmount();

    const profile = renderAtWidth(<ProfileScreen />, 375);
    expect(profile.getByText('Asha Traveller')).toBeTruthy();
    expect(profile.getByText('asha@example.com')).toBeTruthy();
    expect(profile.getByText('Favorites')).toBeTruthy();
    expect(profile.getByText('ACCOUNT SECURITY')).toBeTruthy();
    await waitFor(() => expect(profile.getByText('Log out')).toBeTruthy());
  });
});