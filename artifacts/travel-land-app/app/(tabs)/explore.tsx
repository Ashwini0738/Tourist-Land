import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ExploreItemType,
  type ExploreCategory,
  type ExploreFiltersResponse,
  type ExploreItem,
  type SearchExploreParams,
  type SearchExploreSort,
  getSearchExploreQueryKey,
  useGetExploreFilters,
  useListExploreCategories,
  useSearchExplore,
} from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import {
  DestinationCard,
  EventCard,
  FoodCard,
  HotelCard,
  PlaceCard,
  PropertyCard,
  ExploreResultCard,
} from '@/features/explore/ExploreCards';
import {
  getExploreFavoriteKey,
  getExplorePriceBounds,
  getNextExploreSort,
  parseExploreRating,
  resolveExploreCategory,
} from '@/features/explore/exploreUtils';

const fallbackCategories: ExploreCategory[] = [
  { id: 'destination', label: 'Destinations', icon: 'map-pin', description: 'Regions worth taking the scenic way', count: 0 },
  { id: 'place', label: 'Places', icon: 'compass', description: 'Slow walks and local stops', count: 0 },
  { id: 'temple', label: 'Temples', icon: 'sun', description: 'Heritage and quiet reflection', count: 0 },
  { id: 'attraction', label: 'Attractions', icon: 'layers', description: 'Landmarks and things to see', count: 0 },
  { id: 'event', label: 'Events', icon: 'calendar', description: 'Development programme previews', count: 0 },
  { id: 'food', label: 'Food', icon: 'coffee', description: 'Local flavours and tables', count: 0 },
  { id: 'hotel', label: 'Hotels', icon: 'home', description: 'Seed stays for discovery', count: 0 },
  { id: 'property', label: 'Land', icon: 'map', description: 'Development property previews', count: 0 },
];

const sortLabels: Record<SearchExploreSort, string> = {
  relevance: 'Recommended',
  popularity: 'Popular',
  distance: 'Nearby',
  rating: 'Top rated',
  price_asc: 'Price low to high',
  price_desc: 'Price high to low',
};

function useDebouncedValue(value: string, delay = 350) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type DiscoveryQuery = {
  data?: { items: ExploreItem[] };
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

function SectionError({ onRetry }: { onRetry: () => unknown }) {
  const colors = useColors();
  return (
    <View style={[styles.inlineError, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.inlineErrorText, { color: colors.mutedForeground }]}>Unable to load results</Text>
      <Pressable accessibilityRole="button" onPress={() => void onRetry()}>
        <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

function SectionSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.horizontalList}>
      {[1, 2].map((item) => <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.muted }]} />)}
    </View>
  );
}

function DiscoverySection({
  title,
  query,
  onOpen,
  renderCard,
}: {
  title: string;
  query: DiscoveryQuery;
  onOpen: () => void;
  renderCard: (item: ExploreItem) => React.ReactElement;
}) {
  const colors = useColors();
  const items = query.data?.items ?? [];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>CURATED FOR YOU</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onOpen}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
        </Pressable>
      </View>
      {query.isLoading ? <SectionSkeleton /> : null}
      {query.isError ? <SectionError onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <Text style={[styles.noSectionResults, { color: colors.mutedForeground }]}>No results found</Text>
      ) : null}
      {!query.isLoading && !query.isError && items.length > 0 ? (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => `${item.type}:${item.id}`}
          renderItem={({ item }) => renderCard(item)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filterChip,
        { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      <Text style={[styles.filterChipText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function FilterPanel({
  filters,
  location,
  rating,
  priceRange,
  type,
  amenity,
  onLocation,
  onRating,
  onPriceRange,
  onType,
  onAmenity,
  onClear,
}: {
  filters?: ExploreFiltersResponse;
  location: string;
  rating: string;
  priceRange: string;
  type: string;
  amenity: string;
  onLocation: (value: string) => void;
  onRating: (value: string) => void;
  onPriceRange: (value: string) => void;
  onType: (value: string) => void;
  onAmenity: (value: string) => void;
  onClear: () => void;
}) {
  const colors = useColors();
  if (!filters) return null;
  return (
    <View style={[styles.filterPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.filterPanelHeader}>
        <Text style={[styles.filterPanelTitle, { color: colors.foreground }]}>Refine results</Text>
        <Pressable accessibilityRole="button" onPress={onClear}>
          <Text style={[styles.clearText, { color: colors.primary }]}>Clear all</Text>
        </Pressable>
      </View>
      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>LOCATION</Text>
      <FlatList
        horizontal
        data={filters.locations}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => <FilterChip label={item.split(',')[0]} selected={location === item} onPress={() => onLocation(location === item ? '' : item)} />}
      />
      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>RATING</Text>
      <View style={styles.wrapRow}>
        {filters.ratings.map((item) => <FilterChip key={item} label={`${item} rating`} selected={rating === item} onPress={() => onRating(rating === item ? '' : item)} />)}
      </View>
      {filters.priceRanges.length > 0 && ['hotel', 'property'].includes(filters.category) ? (
        <>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>PRICE</Text>
          <View style={styles.wrapRow}>
            {filters.priceRanges.map((item) => <FilterChip key={item} label={item.replaceAll('-', ' ')} selected={priceRange === item} onPress={() => onPriceRange(priceRange === item ? '' : item)} />)}
          </View>
        </>
      ) : null}
      {filters.types.length > 0 ? (
        <>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>TYPE</Text>
          <View style={styles.wrapRow}>
            {filters.types.map((item) => <FilterChip key={item} label={item} selected={type === item} onPress={() => onType(type === item ? '' : item)} />)}
          </View>
        </>
      ) : null}
      {filters.amenities.length > 0 ? (
        <>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>AMENITIES</Text>
          <View style={styles.wrapRow}>
            {filters.amenities.map((item) => <FilterChip key={item} label={item} selected={amenity === item} onPress={() => onAmenity(amenity === item ? '' : item)} />)}
          </View>
          <Text style={[styles.filterHint, { color: colors.mutedForeground }]}>Amenities are development-catalog tags, not live hotel inventory.</Text>
        </>
      ) : null}
    </View>
  );
}

function renderDiscoveryCard(item: ExploreItem, isFavorite: (id: string) => boolean, toggleFavorite: (id: string) => void) {
  const props = { item, isFavorite: isFavorite(getExploreFavoriteKey(item)), toggleFavorite: () => toggleFavorite(getExploreFavoriteKey(item)) };
  if (item.type === 'destination') return <DestinationCard {...props} />;
  if (item.type === 'event') return <EventCard {...props} />;
  if (item.type === 'food') return <FoodCard {...props} />;
  if (item.type === 'hotel') return <HotelCard {...props} />;
  if (item.type === 'property') return <PropertyCard {...props} />;
  return <PlaceCard {...props} />;
}

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ query?: string; filter?: string }>();
  const { isFavorite, toggleFavorite } = useAppState();
  const [query, setQuery] = React.useState(Array.isArray(params.query) ? params.query[0] ?? '' : params.query ?? '');
  const [activeCategory, setActiveCategory] = React.useState<ExploreItemType | 'all'>(resolveExploreCategory(params.filter));
  const [sort, setSort] = React.useState<SearchExploreSort>('relevance');
  const [location, setLocation] = React.useState('');
  const [rating, setRating] = React.useState('');
  const [priceRange, setPriceRange] = React.useState('');
  const [type, setType] = React.useState('');
  const [amenity, setAmenity] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [results, setResults] = React.useState<ExploreItem[]>([]);
  const debouncedQuery = useDebouncedValue(query);
  const categoriesQuery = useListExploreCategories();
  const filterCategory = activeCategory === 'all' ? undefined : activeCategory;
  const filtersQuery = useGetExploreFilters({ category: filterCategory });
  const price = getExplorePriceBounds(priceRange);
  const searchParams = React.useMemo<SearchExploreParams>(() => ({
    q: debouncedQuery.trim() || undefined,
    category: filterCategory,
    location: location || undefined,
    page,
    limit: 8,
    sort,
    minRating: parseExploreRating(rating),
    ...price,
    ...(activeCategory === 'property' && type ? { propertyType: type } : {}),
    ...(activeCategory === 'event' && type ? { eventType: type } : {}),
    ...(amenity ? { amenity } : {}),
  }), [activeCategory, amenity, debouncedQuery, filterCategory, location, page, price, rating, sort, type]);
  const searchQuery = useSearchExplore(searchParams);
  const browseEnabled = activeCategory === 'all' && !debouncedQuery.trim();
  const destinationParams = { category: 'destination', limit: 4, sort: 'popularity' as const };
  const placeParams = { category: 'place', limit: 4, sort: 'popularity' as const };
  const eventParams = { category: 'event', limit: 4, sort: 'popularity' as const };
  const hotelParams = { category: 'hotel', limit: 4, sort: 'popularity' as const };
  const propertyParams = { category: 'property', limit: 4, sort: 'popularity' as const };
  const destinationsQuery = useSearchExplore(destinationParams, { query: { queryKey: getSearchExploreQueryKey(destinationParams), enabled: browseEnabled } });
  const placesQuery = useSearchExplore(placeParams, { query: { queryKey: getSearchExploreQueryKey(placeParams), enabled: browseEnabled } });
  const eventsQuery = useSearchExplore(eventParams, { query: { queryKey: getSearchExploreQueryKey(eventParams), enabled: browseEnabled } });
  const hotelsQuery = useSearchExplore(hotelParams, { query: { queryKey: getSearchExploreQueryKey(hotelParams), enabled: browseEnabled } });
  const propertiesQuery = useSearchExplore(propertyParams, { query: { queryKey: getSearchExploreQueryKey(propertyParams), enabled: browseEnabled } });
  const searchSignature = JSON.stringify({ q: debouncedQuery, category: activeCategory, location, rating, priceRange, type, amenity, sort });

  React.useEffect(() => {
    setPage(1);
    setResults([]);
  }, [searchSignature]);

  React.useEffect(() => {
    if (!searchQuery.data) return;
    setResults((current) => {
      if (page === 1) return searchQuery.data.items;
      const existing = new Set(current.map((item) => `${item.type}:${item.id}`));
      return [...current, ...searchQuery.data.items.filter((item) => !existing.has(`${item.type}:${item.id}`))];
    });
  }, [page, searchQuery.data]);

  const categories = categoriesQuery.data?.items ?? fallbackCategories;
  const dataItems = results;
  const hasMore = searchQuery.data?.hasMore ?? false;
  const showSearchSuggestions = query.trim().length >= 2 && searchQuery.data?.suggestions?.length;

  const resetFilters = React.useCallback(() => {
    setLocation('');
    setRating('');
    setPriceRange('');
    setType('');
    setAmenity('');
  }, []);

  const onCategory = React.useCallback((category: ExploreItemType | 'all') => {
    setActiveCategory(category);
    resetFilters();
    setShowFilters(false);
  }, [resetFilters]);

  const retryAll = React.useCallback(() => {
    void Promise.allSettled([searchQuery.refetch(), categoriesQuery.refetch(), filtersQuery.refetch()]);
  }, [categoriesQuery, filtersQuery, searchQuery]);

  const header = (
    <View>
      <View style={[styles.headerRow, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>EXPLORE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Follow your{'\n'}curiosity.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')} style={styles.iconButton}>
          <Feather name="bell" size={21} color={colors.foreground} />
        </Pressable>
      </View>
      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={19} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Search destinations, places, hotels..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          accessibilityLabel="Search destinations, places, hotels"
          returnKeyType="search"
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}><Feather name="x-circle" size={18} color={colors.mutedForeground} /></Pressable> : null}
      </View>
      {showSearchSuggestions ? (
        <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.suggestionLabel, { color: colors.mutedForeground }]}>SUGGESTIONS</Text>
          {searchQuery.data?.suggestions.map((suggestion) => (
            <Pressable key={suggestion.id} accessibilityRole="button" onPress={() => { setQuery(suggestion.title); onCategory(suggestion.type); }}>
              <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>{suggestion.title}</Text>
              <Text style={[styles.suggestionSubtitle, { color: colors.mutedForeground }]}>{suggestion.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FlatList
        horizontal
        data={[{ id: 'all', label: 'All', icon: 'compass', description: '', count: 0 }, ...categories]}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategory === item.id }}
            onPress={() => onCategory(item.id as ExploreItemType | 'all')}
            style={[styles.categoryChip, { backgroundColor: activeCategory === item.id ? colors.primary : colors.card, borderColor: activeCategory === item.id ? colors.primary : colors.border }]}
          >
            <Feather name={item.icon} size={14} color={activeCategory === item.id ? colors.primaryForeground : colors.primary} />
            <Text style={[styles.categoryText, { color: activeCategory === item.id ? colors.primaryForeground : colors.mutedForeground }]}>{item.label}</Text>
          </Pressable>
        )}
      />
      <View style={styles.toolbar}>
        <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>
          {debouncedQuery.trim() ? `${searchQuery.data?.total ?? 0} results for “${debouncedQuery}”` : activeCategory === 'all' ? 'ALL DISCOVERY · CURATED' : `${categories.find((item) => item.id === activeCategory)?.label?.toUpperCase() ?? 'DISCOVERY'} · CURATED`}
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable accessibilityRole="button" onPress={() => setShowFilters((value) => !value)} style={styles.toolbarButton}>
            <Feather name="sliders" size={14} color={colors.primary} />
            <Text style={[styles.toolbarButtonText, { color: colors.primary }]}>Filters</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setSort(getNextExploreSort(sort))} style={styles.toolbarButton}>
            <Text style={[styles.toolbarButtonText, { color: colors.primary }]}>{sortLabels[sort]}</Text>
            <Feather name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </View>
      {showFilters ? (
        <>
          <FilterPanel filters={filtersQuery.data} location={location} rating={rating} priceRange={priceRange} type={type} amenity={amenity} onLocation={setLocation} onRating={setRating} onPriceRange={setPriceRange} onType={setType} onAmenity={setAmenity} onClear={resetFilters} />
          <View style={styles.sortRow}>
            {(filtersQuery.data?.sorts ?? []).map((item) => <FilterChip key={item.value} label={item.label} selected={sort === item.value} onPress={() => setSort(item.value as SearchExploreSort)} />)}
          </View>
        </>
      ) : null}
      {browseEnabled ? (
        <View style={styles.discovery}>
          <DiscoverySection title="Popular destinations" query={destinationsQuery} onOpen={() => onCategory('destination')} renderCard={(item) => renderDiscoveryCard(item, isFavorite, toggleFavorite)} />
          <DiscoverySection title="Popular places" query={placesQuery} onOpen={() => onCategory('place')} renderCard={(item) => renderDiscoveryCard(item, isFavorite, toggleFavorite)} />
          <DiscoverySection title="Upcoming events" query={eventsQuery} onOpen={() => onCategory('event')} renderCard={(item) => renderDiscoveryCard(item, isFavorite, toggleFavorite)} />
          <DiscoverySection title="Recommended hotels" query={hotelsQuery} onOpen={() => onCategory('hotel')} renderCard={(item) => renderDiscoveryCard(item, isFavorite, toggleFavorite)} />
          <DiscoverySection title="Land opportunities" query={propertiesQuery} onOpen={() => onCategory('property')} renderCard={(item) => renderDiscoveryCard(item, isFavorite, toggleFavorite)} />
        </View>
      ) : null}
      <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
        <Feather name="info" size={15} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>Development content only. Hotel availability, pricing, events, and property inventory are not live.</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      testID="explore-list"
      data={dataItems}
      keyExtractor={(item) => `${item.type}:${item.id}`}
      renderItem={({ item }) => (
        <View style={styles.resultItem}>
          <ExploreResultCard item={item} isFavorite={isFavorite(getExploreFavoriteKey(item))} toggleFavorite={() => toggleFavorite(getExploreFavoriteKey(item))} />
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        searchQuery.isLoading ? <View style={styles.emptyState}><ActivityIndicator color={colors.primary} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading discovery…</Text></View>
          : searchQuery.isError ? <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="alert-circle" size={26} color={colors.destructive} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Unable to load results</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Check your connection and try again.</Text><Pressable accessibilityRole="button" onPress={retryAll} style={[styles.retryButton, { backgroundColor: colors.primary }]}><Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Retry</Text></Pressable></View>
          : <View style={styles.emptyState}><Feather name="compass" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results found</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different place, category, or filter.</Text></View>
      }
      ListFooterComponent={
        dataItems.length > 0 ? (
          <View style={styles.footer}>
            {searchQuery.isFetching ? <ActivityIndicator color={colors.primary} /> : hasMore ? <Pressable accessibilityRole="button" onPress={() => setPage((value) => value + 1)} style={[styles.loadMore, { borderColor: colors.border }]}><Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more</Text></Pressable> : <Text style={[styles.endText, { color: colors.mutedForeground }]}>You’ve reached the end of the results</Text>}
          </View>
        ) : null
      }
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={searchQuery.isRefetching && page === 1} onRefresh={retryAll} tintColor={colors.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  search: { height: 54, borderWidth: 1, borderRadius: 16, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 15 },
  input: { flex: 1, fontSize: 14, marginLeft: 10 },
  suggestions: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12, marginTop: 8 },
  suggestionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  suggestionTitle: { fontSize: 14, fontWeight: '700' },
  suggestionSubtitle: { fontSize: 11, marginTop: 3 },
  categories: { gap: 8, paddingVertical: 22 },
  categoryChip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  resultLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, flex: 1 },
  toolbarActions: { flexDirection: 'row', gap: 12 },
  toolbarButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolbarButtonText: { fontSize: 11, fontWeight: '800' },
  filterPanel: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 },
  filterPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterPanelTitle: { fontSize: 16, fontWeight: '700' },
  clearText: { fontSize: 11, fontWeight: '800' },
  filterLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 8, marginBottom: 8 },
  filterRow: { gap: 7 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterChip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 8 },
  filterChipText: { fontSize: 10, fontWeight: '700' },
  filterHint: { fontSize: 11, lineHeight: 16, marginTop: 13 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  discovery: { gap: 25 },
  section: { marginBottom: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  sectionKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  sectionTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  viewAll: { fontSize: 11, fontWeight: '800' },
  horizontalList: { gap: 12 },
  skeletonCard: { width: 224, height: 250, borderRadius: 20, opacity: 0.5 },
  noSectionResults: { fontSize: 12, paddingVertical: 16 },
  inlineError: { borderWidth: 1, borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineErrorText: { fontSize: 12 },
  retryText: { fontSize: 12, fontWeight: '800' },
  notice: { borderRadius: 15, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 28, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16 },
  resultItem: { marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 22, borderWidth: 1, borderRadius: 18, marginTop: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  retryButton: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  retryButtonText: { fontSize: 12, fontWeight: '800' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  loadMore: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11 },
  loadMoreText: { fontSize: 12, fontWeight: '800' },
  endText: { fontSize: 11 },
});