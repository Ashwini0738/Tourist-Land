import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchHotelsParams, SearchHotelsSort, getSearchHotelsQueryKey, useSearchHotels } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import { getMapLocationMessage, useMapLocation } from '@/features/maps/useMapLocation';
import { DateGuestControls, EmptyHotels, HotelCard, HotelHeader, HotelSearchSelection, HotelSkeleton, NoticeBanner, SearchBar } from '@/features/hotels/HotelUI';

type HotelFilters = { hotelType?: string; amenity?: string; minRating?: number; maxPrice?: number; radiusKm?: number; sort: SearchHotelsSort };
const ratingOptions = [0, 3, 4, 4.5];
const priceOptions = [0, 5000, 10000, 15000];
const sortOptions: Array<{ value: SearchHotelsSort; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Lowest sample price' },
  { value: 'price_desc', label: 'Highest sample price' },
  { value: 'distance', label: 'Nearest first' },
];

function useDebouncedValue(value: string, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Choice({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID: string }) {
  const colors = useColors();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.card }]}><Text style={[styles.choiceText, { color: selected ? colors.primary : colors.foreground }]}>{label}</Text>{selected ? <Feather name="check" size={15} color={colors.primary} /> : null}</Pressable>;
}

function FilterSheet({ visible, filters, types, amenities, locationAvailable, onChange, onClose }: { visible: boolean; filters: HotelFilters; types: string[]; amenities: string[]; locationAvailable: boolean; onChange: (next: HotelFilters) => void; onClose: () => void }) {
  const colors = useColors();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={[styles.filterSheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}><View style={[styles.sheetHandle, { backgroundColor: colors.border }]} /><View style={styles.filterHeader}><View><Text style={[styles.kicker, { color: colors.primary }]}>NARROW THE FIELD</Text><Text style={[styles.filterTitle, { color: colors.foreground }]}>Keep it honest.</Text></View><Pressable testID="hotel-filter-close" accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={styles.closeButton}><Feather name="x" size={19} color={colors.foreground} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false}><Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>HOTEL TYPE</Text><View style={styles.choiceWrap}>{types.map((item) => <Choice key={item} testID={`hotel-type-${item}`} label={item} selected={filters.hotelType === item} onPress={() => onChange({ ...filters, hotelType: filters.hotelType === item ? undefined : item })} />)}</View><Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>AMENITY</Text><View style={styles.choiceWrap}>{amenities.map((item) => <Choice key={item} testID={`hotel-amenity-${item}`} label={item} selected={filters.amenity === item} onPress={() => onChange({ ...filters, amenity: filters.amenity === item ? undefined : item })} />)}</View><Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>MINIMUM RATING</Text><View style={styles.choiceWrap}>{ratingOptions.map((item) => <Choice key={item} testID={`hotel-rating-${item}`} label={item ? `${item}+` : 'Any'} selected={filters.minRating === (item || undefined)} onPress={() => onChange({ ...filters, minRating: item || undefined })} />)}</View><Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>SAMPLE NIGHTLY CEILING</Text><View style={styles.choiceWrap}>{priceOptions.map((item) => <Choice key={item} testID={`hotel-price-${item}`} label={item ? `Under ${item.toLocaleString()}` : 'Any'} selected={filters.maxPrice === (item || undefined)} onPress={() => onChange({ ...filters, maxPrice: item || undefined })} />)}</View><Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>DISTANCE FROM YOU</Text>{locationAvailable ? <View style={styles.choiceWrap}>{[0, 5, 25, 100].map((item) => <Choice key={item} testID={`hotel-radius-${item}`} label={item ? `Within ${item} km` : 'Any distance'} selected={filters.radiusKm === (item || undefined)} onPress={() => onChange({ ...filters, radiusKm: item || undefined })} />)}</View> : <Text style={[styles.filterHint, { color: colors.mutedForeground }]}>Use your location above to filter by distance.</Text>}<Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>SORT BY</Text>{sortOptions.map((item) => <Choice key={item.value} testID={`hotel-sort-${item.value}`} label={item.label} selected={filters.sort === item.value} onPress={() => onChange({ ...filters, sort: item.value })} />)}<Pressable testID="hotel-filter-done" accessibilityRole="button" accessibilityLabel="Apply hotel filters" onPress={onClose} style={[styles.applyButton, { backgroundColor: colors.primary }]}><Text style={[styles.applyText, { color: colors.primaryForeground }]}>Apply filters</Text></Pressable></ScrollView></Pressable></Pressable></Modal>;
}

export default function HotelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useAppState();
  const { location, loading: locationLoading, error: locationError, permission, requestLocation } = useMapLocation();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<HotelSearchSelection>({ adults: 1, children: 0, rooms: 1 });
  const [filters, setFilters] = useState<HotelFilters>({ sort: 'recommended' });
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const params = useMemo<SearchHotelsParams>(() => ({
    q: debouncedQuery.trim() || undefined,
    checkIn: selection.checkIn,
    checkOut: selection.checkOut,
    adults: selection.adults,
    children: selection.children,
    rooms: selection.rooms,
    latitude: location?.latitude,
    longitude: location?.longitude,
    hotelType: filters.hotelType,
    amenity: filters.amenity,
    minRating: filters.minRating,
    maxPrice: filters.maxPrice,
    radiusKm: filters.radiusKm,
    page,
    limit: 10,
    sort: filters.sort,
  }), [debouncedQuery, filters, location, page, selection]);
  const search = useSearchHotels(params, { query: { queryKey: getSearchHotelsQueryKey(params), staleTime: 30_000, retry: 1 } });
  const items = search.data?.items ?? [];
  const types = useMemo(() => [...new Set(items.map((item) => item.hotelType).filter(Boolean))], [items]);
  const amenities = useMemo(() => [...new Set(items.flatMap((item) => item.amenities).filter(Boolean))], [items]);
  useEffect(() => { setPage(1); }, [debouncedQuery, filters.hotelType, filters.amenity, filters.minRating, filters.maxPrice, filters.radiusKm, filters.sort, selection.checkIn, selection.checkOut, selection.adults, selection.children, selection.rooms]);
  const reset = () => { setQuery(''); setFilters({ sort: 'recommended' }); setSelection({ adults: 1, children: 0, rooms: 1 }); setPage(1); };
  const activeFilterCount = [filters.hotelType, filters.amenity, filters.minRating, filters.maxPrice, filters.radiusKm].filter(Boolean).length;

  return <View testID="hotels-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
    <HotelHeader onBack={() => router.back()} title="Hotels" right={<Pressable testID="hotel-filter-button" accessibilityRole="button" accessibilityLabel={`Open hotel filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`} onPress={() => setFilterOpen(true)} style={styles.headerFilter}><Feather name="sliders" size={18} color={colors.primary} />{activeFilterCount ? <View style={[styles.filterDot, { backgroundColor: colors.accent }]} /> : null}</Pressable>} />
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 18 }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.kicker, { color: colors.primary }]}>STAYS, NOT INVENTORY</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Sleep somewhere{'\n'}worth waking up in.</Text>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>A grounded catalog of places to know. Every card is clearly marked when it is sample or development data.</Text>
       <SearchBar value={query} onChangeText={(value) => { setQuery(value); setPage(1); }} />
       <Pressable testID="hotel-use-location" accessibilityRole="button" accessibilityLabel={location ? 'Refresh hotels near my location' : 'Use my location to sort hotels by distance'} onPress={() => void requestLocation()} style={[styles.locationButton, { backgroundColor: location ? colors.secondary : colors.card, borderColor: colors.border }]}>
         <Feather name="map-pin" size={15} color={colors.primary} />
         <Text style={[styles.locationButtonText, { color: colors.primary }]}>{location ? `Near ${location.name ?? 'your location'}` : locationLoading ? 'Finding your location…' : 'Use my location for distance sorting'}</Text>
       </Pressable>
      <DateGuestControls selection={selection} onChange={(next) => { setSelection(next); setPage(1); }} />
      <NoticeBanner>{search.data?.notice ?? 'Catalog discovery only. Dates and prices are sample context, not live availability.'}</NoticeBanner>
      {search.isError && !search.data ? <NoticeBanner error onRetry={() => void search.refetch()}>The hotel catalog could not be refreshed.</NoticeBanner> : null}
       {getMapLocationMessage(permission, locationError) ? <NoticeBanner error>{getMapLocationMessage(permission, locationError)}</NoticeBanner> : null}
      <View style={styles.resultsHeader}><Text style={[styles.resultsTitle, { color: colors.foreground }]}>{search.data ? `${search.data.total} catalog ${search.data.total === 1 ? 'stay' : 'stays'}` : 'Catalog stays'}</Text><Pressable testID="hotel-sort-quick" accessibilityRole="button" accessibilityLabel="Change hotel sort" onPress={() => setFilterOpen(true)}><Text style={[styles.sortText, { color: colors.primary }]}>{sortOptions.find((item) => item.value === filters.sort)?.label}</Text></Pressable></View>
      {search.isLoading && !search.data ? <><HotelSkeleton /><HotelSkeleton /></> : items.length ? items.map((item) => { const favoriteId = `hotel:${item.id}`; return <HotelCard key={item.id} item={item} favorite={isFavorite(favoriteId)} onFavorite={() => toggleFavorite(favoriteId)} onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: item.id, checkIn: selection.checkIn ?? '', checkOut: selection.checkOut ?? '', adults: String(selection.adults), children: String(selection.children), rooms: String(selection.rooms) } } as any)} />; }) : search.isError ? null : <EmptyHotels query={query} onReset={reset} />}
      {search.data?.total ? <View style={styles.pagination}><Pressable testID="hotel-page-prev" accessibilityRole="button" accessibilityLabel="Previous hotel page" disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.pageButton, { borderColor: colors.border, opacity: page <= 1 ? 0.35 : 1 }]}><Feather name="chevron-left" size={16} color={colors.primary} /><Text style={[styles.pageText, { color: colors.primary }]}>Back</Text></Pressable><Text style={[styles.pageNumber, { color: colors.mutedForeground }]}>Page {search.data.page}</Text><Pressable testID="hotel-page-next" accessibilityRole="button" accessibilityLabel="Next hotel page" disabled={!search.data.hasMore} onPress={() => setPage((value) => value + 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: search.data.hasMore ? 1 : 0.35 }]}><Text style={[styles.pageText, { color: colors.primary }]}>More</Text><Feather name="chevron-right" size={16} color={colors.primary} /></Pressable></View> : null}
    </ScrollView>
    <FilterSheet visible={filterOpen} filters={filters} types={types} amenities={amenities} locationAvailable={Boolean(location)} onChange={(next) => { setFilters(next); setPage(1); }} onClose={() => setFilterOpen(false)} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  headerFilter: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginTop: 3 },
  title: { fontSize: 31, lineHeight: 35, fontWeight: '700', letterSpacing: -0.9, marginTop: 7 },
  intro: { fontSize: 12, lineHeight: 18, marginTop: 11, marginBottom: 18, maxWidth: 340 },
  locationButton: { minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  locationButtonText: { flex: 1, fontSize: 11, fontWeight: '700' },
  resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  resultsTitle: { fontSize: 15, fontWeight: '700' },
  sortText: { fontSize: 11, fontWeight: '800' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 14 },
  pageButton: { minHeight: 38, borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pageText: { fontSize: 11, fontWeight: '800' },
  pageNumber: { fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,42,36,0.42)' },
  filterSheet: { maxHeight: '89%', borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 21, paddingTop: 14, paddingBottom: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 17 },
  filterHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 19 },
  filterTitle: { fontSize: 25, fontWeight: '700', marginTop: 4 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  filterLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 12, marginBottom: 9 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 39, borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  choiceText: { fontSize: 11, fontWeight: '700' },
  filterHint: { fontSize: 11, lineHeight: 17 },
  applyButton: { minHeight: 51, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 5 },
  applyText: { fontSize: 12, fontWeight: '800' },
});