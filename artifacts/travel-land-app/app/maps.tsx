import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type ExploreItem,
  type ExploreItemType,
  useSearchExplore,
} from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import { getImageSource } from '@/features/home/utils/images';
import { getExploreFavoriteKey } from '@/features/explore/exploreUtils';
import { getExploreRoute } from '@/features/explore/ExploreCards';
import { MapCanvas, MapSkeleton } from '@/features/maps/MapCanvas';
import { getDirectionsUrl, openDirections } from '@/features/maps/directions';
import { getMapLocationMessage, useMapLocation } from '@/features/maps/useMapLocation';

type MapCategory = Exclude<ExploreItemType, 'food'>;
type Center = { latitude: number; longitude: number };

const categories: Array<{ id: MapCategory | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: 'compass' },
  { id: 'destination', label: 'Destinations', icon: 'map-pin' },
  { id: 'place', label: 'Places', icon: 'compass' },
  { id: 'temple', label: 'Temples', icon: 'sun' },
  { id: 'event', label: 'Events', icon: 'calendar' },
  { id: 'hotel', label: 'Hotels', icon: 'home' },
  { id: 'property', label: 'Land', icon: 'map' },
];

const categoryLabels: Record<string, string> = {
  destination: 'DESTINATION',
  place: 'PLACE',
  temple: 'TEMPLE',
  event: 'EVENT',
  hotel: 'HOTEL',
  property: 'LAND',
};

function useDebouncedValue(value: string, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function itemKey(item: ExploreItem) {
  return `${item.type}:${item.id}`;
}

function getCenter(item?: ExploreItem | null): Center | undefined {
  return item?.coordinates ? { latitude: item.coordinates.latitude, longitude: item.coordinates.longitude } : undefined;
}

function MapHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Pressable testID="maps-back" accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerButton}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={[styles.headerKicker, { color: colors.primary }]}>THE DETOUR ATLAS</Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Around you</Text>
      </View>
      <View style={styles.headerButton} />
    </View>
  );
}

function CategoryRail({
  active,
  onChange,
}: {
  active: MapCategory | 'all';
  onChange: (category: MapCategory | 'all') => void;
}) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
      {categories.map((category) => {
        const selected = active === category.id;
        return (
          <Pressable
            key={category.id}
            testID={`map-category-${category.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(category.id)}
            style={[styles.categoryChip, { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.accent : colors.border }]}
          >
            <Feather name={category.icon} size={13} color={selected ? colors.accentForeground : colors.primary} />
            <Text style={[styles.categoryText, { color: selected ? colors.accentForeground : colors.mutedForeground }]}>{category.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MapStatusBanner({
  message,
  error,
  onRetry,
  actionLabel = 'Retry',
}: {
  message: string;
  error?: boolean;
  onRetry?: () => void;
  actionLabel?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statusBanner, { backgroundColor: error ? colors.card : colors.secondary, borderColor: colors.border }]}>
      <Feather name={error ? 'alert-circle' : 'info'} size={15} color={error ? colors.destructive : colors.primary} />
      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={[styles.statusAction, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ResultCard({ item, selected, onPress }: { item: ExploreItem; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      testID={`map-result-${item.type}-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Select ${item.title}`}
      onPress={onPress}
      style={[styles.resultCard, { backgroundColor: selected ? colors.secondary : colors.card, borderColor: selected ? colors.accent : colors.border }]}
    >
      <Image source={getImageSource(item.imageKey)} style={styles.resultImage} />
      <View style={styles.resultCopy}>
        <Text style={[styles.resultCategory, { color: colors.primary }]} numberOfLines={1}>{categoryLabels[item.type] ?? item.category.toUpperCase()}</Text>
        <Text style={[styles.resultTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.resultLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        {item.distanceKm !== undefined ? <Text style={[styles.resultDistance, { color: colors.primary }]}>{item.distanceKm.toFixed(1)} km away</Text> : null}
      </View>
    </Pressable>
  );
}

function navigationParams(item: ExploreItem) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    location: item.location,
    category: item.category,
    summary: item.summary,
    imageKey: item.imageKey,
    dateLabel: item.dateLabel,
    favoriteId: getExploreFavoriteKey(item),
  };
}

function openDetails(item: ExploreItem) {
  const route = getExploreRoute(item.type, item.id);
  if (item.type === 'destination' || item.type === 'hotel' || item.type === 'property') {
    router.push(route as any);
    return;
  }
  router.push({ pathname: route as any, params: navigationParams(item) } as any);
}

function SelectedPreview({
  item,
  onDirections,
  onOpen,
}: {
  item: ExploreItem;
  onDirections: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const { isFavorite, toggleFavorite } = useAppState();
  const favoriteId = getExploreFavoriteKey(item);
  const favorite = isFavorite(favoriteId);
  return (
    <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={getImageSource(item.imageKey)} style={styles.previewImage} />
      <View style={styles.previewCopy}>
        <Text style={[styles.previewCategory, { color: colors.primary }]}>{categoryLabels[item.type] ?? item.category.toUpperCase()}</Text>
        <Text style={[styles.previewTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.previewLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        <Text style={[styles.previewSource, { color: item.source === 'unavailable' ? colors.destructive : colors.mutedForeground }]} numberOfLines={1}>{item.sourceLabel}</Text>
        {item.distanceKm !== undefined ? <Text style={[styles.previewDistance, { color: colors.primary }]}>{item.distanceKm.toFixed(1)} km from you</Text> : null}
      </View>
      <Pressable
        testID={`map-favorite-${item.type}-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${favorite ? 'Remove' : 'Add'} ${item.title} ${favorite ? 'from' : 'to'} favorites`}
        onPress={() => toggleFavorite(favoriteId)}
        style={[styles.previewFavorite, { backgroundColor: colors.secondary }]}
      >
        <Feather name="heart" size={16} color={favorite ? colors.destructive : colors.foreground} fill={favorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <View style={styles.previewActions}>
        <Pressable testID="map-view-details" accessibilityRole="button" onPress={onOpen} style={[styles.previewButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.previewButtonText, { color: colors.primaryForeground }]}>View details</Text>
          <Feather name="arrow-up-right" size={15} color={colors.primaryForeground} />
        </Pressable>
        {item.coordinates ? (
          <Pressable testID="map-directions" accessibilityRole="button" onPress={onDirections} style={[styles.directionButton, { borderColor: colors.border }]}>
            <Feather name="arrow-right" size={15} color={colors.primary} />
            <Text style={[styles.directionText, { color: colors.primary }]}>Directions</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function MapsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ destinationId?: string | string[]; itemId?: string | string[]; itemType?: string | string[] }>();
  const { permission, location, loading: locationLoading, error: locationError, requestLocation } = useMapLocation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MapCategory | 'all'>('all');
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [center, setCenter] = useState<Center | undefined>();
  const [directionMessage, setDirectionMessage] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query);
  const didFocus = useRef(false);
  const destinationId = Array.isArray(params.destinationId) ? params.destinationId[0] : params.destinationId;
  const itemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const itemType = Array.isArray(params.itemType) ? params.itemType[0] : params.itemType;
  const targetKey = itemId && itemType ? `${itemType}:${itemId}` : destinationId ? `destination:${destinationId}` : undefined;
  const searchParams = useMemo(() => ({
    q: debouncedQuery.trim() || undefined,
    category: activeCategory === 'all' ? undefined : activeCategory,
    limit: 50,
    sort: location ? 'distance' as const : 'relevance' as const,
    latitude: location?.latitude,
    longitude: location?.longitude,
  }), [activeCategory, debouncedQuery, location]);
  const searchQuery = useSearchExplore(searchParams);
  const allItems = searchQuery.data?.items ?? [];
  const mapItems = allItems.filter((item) => item.coordinates && item.type !== 'food');
  const selectedItem = mapItems.find((item) => itemKey(item) === selectedKey);
  const locationMessage = getMapLocationMessage(permission, locationError);

  useEffect(() => {
    if (didFocus.current || !targetKey || !mapItems.length) return;
    const target = mapItems.find((item) => itemKey(item) === targetKey);
    if (target) {
      setSelectedKey(itemKey(target));
      setCenter(getCenter(target));
    }
    didFocus.current = true;
  }, [mapItems, targetKey]);

  useEffect(() => {
    if (location) setCenter({ latitude: location.latitude, longitude: location.longitude });
  }, [location]);

  const selectItem = (item: ExploreItem | null) => {
    if (!item) {
      setSelectedKey(undefined);
      return;
    }
    setSelectedKey(itemKey(item));
    setCenter(getCenter(item));
  };

  const handleDirections = async () => {
    if (!selectedItem?.coordinates) return;
    const opened = await openDirections({ title: selectedItem.title, ...selectedItem.coordinates });
    setDirectionMessage(opened ? 'Directions opened in your map app.' : `Directions are unavailable here. Open ${getDirectionsUrl({ title: selectedItem.title, ...selectedItem.coordinates })} on a map service.`);
  };

  const handleLocationRecovery = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // The recovery copy remains visible if the platform cannot open Settings.
    }
  };

  const locationNeedsSettings = Platform.OS !== 'web' && (permission === 'blocked' || locationError === 'permission-blocked' || locationError === 'gps-disabled');
  const mapMessage = Platform.OS === 'web'
    ? 'Map tiles are unavailable here — showing an atlas view.'
    : 'Showing a provider-free atlas view so discovery works without map keys.';

  return (
    <View testID="maps-screen" style={[styles.container, { backgroundColor: colors.background }]}>
      <MapHeader />
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          testID="map-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search places, stays, temples..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          accessibilityLabel="Search map places"
          returnKeyType="search"
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear map search" onPress={() => setQuery('')}><Feather name="x-circle" size={18} color={colors.mutedForeground} /></Pressable> : null}
      </View>
      <CategoryRail active={activeCategory} onChange={(category) => { setActiveCategory(category); setSelectedKey(undefined); }} />
      <View style={styles.mapFrame}>
        {searchQuery.isLoading && !searchQuery.data ? <MapSkeleton /> : <MapCanvas items={mapItems} selectedKey={selectedKey} center={center} onSelect={selectItem} />}
        <Pressable
          testID="use-my-location"
          accessibilityRole="button"
          accessibilityLabel="Use my location"
          onPress={() => void requestLocation()}
          style={[styles.locationButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {locationLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="map-pin" size={18} color={colors.primary} />}
        </Pressable>
        {location ? <View style={[styles.currentPill, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.currentDot, { backgroundColor: colors.primary }]} /><Text style={[styles.currentText, { color: colors.foreground }]} numberOfLines={1}>{location.name ?? 'Your location'}</Text></View> : null}
      </View>
      <View style={styles.content}>
        <MapStatusBanner message={mapMessage} />
        {locationMessage ? (
          <MapStatusBanner
            message={locationMessage}
            onRetry={locationNeedsSettings ? () => void handleLocationRecovery() : undefined}
            actionLabel="Open Settings"
          />
        ) : null}
        {directionMessage ? <MapStatusBanner message={directionMessage} /> : null}
        {searchQuery.isError ? <MapStatusBanner message="The catalog could not be refreshed. Your map remains available; try again." error onRetry={() => void searchQuery.refetch()} /> : null}
        {searchQuery.data && searchQuery.data.total > mapItems.length ? <Text style={[styles.coordinateNote, { color: colors.mutedForeground }]}>{searchQuery.data.total - mapItems.length} result{searchQuery.data.total - mapItems.length === 1 ? '' : 's'} not shown on this map because this view only plots coordinate-backed map categories.</Text> : null}
        {selectedItem ? (
          <SelectedPreview item={selectedItem} onDirections={() => void handleDirections()} onOpen={() => openDetails(selectedItem)} />
        ) : (
          <View style={styles.restingCopy}>
            <Text style={[styles.restingKicker, { color: colors.primary }]}>DISCOVER BY DETOUR</Text>
            <Text style={[styles.restingTitle, { color: colors.foreground }]}>Worth the turn.</Text>
            <Text style={[styles.restingText, { color: colors.mutedForeground }]}>Find something to make the route yours.</Text>
          </View>
        )}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: colors.foreground }]}>Map results</Text>
          <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>{mapItems.length} places</Text>
        </View>
        {mapItems.length ? (
          <FlatList
            testID="map-results"
            horizontal
            data={mapItems}
            keyExtractor={itemKey}
            renderItem={({ item }) => <ResultCard item={item} selected={itemKey(item) === selectedKey} onPress={() => selectItem(item)} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        ) : searchQuery.isLoading ? (
          <View style={styles.resultsLoading}><ActivityIndicator color={colors.primary} /><Text style={[styles.resultsEmptyText, { color: colors.mutedForeground }]}>Loading catalog places…</Text></View>
        ) : (
          <View style={[styles.resultsEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="compass" size={22} color={colors.primary} />
            <Text style={[styles.resultsEmptyTitle, { color: colors.foreground }]}>Nothing close enough for this detour.</Text>
            <Text style={[styles.resultsEmptyText, { color: colors.mutedForeground }]}>Try another search or category. Manual discovery always stays available.</Text>
          </View>
        )}
      </View>
      <View style={{ height: Platform.OS === 'web' ? 12 : insets.bottom + 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { alignItems: 'center' },
  headerKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginTop: 3 },
  searchRow: { height: 50, marginHorizontal: 18, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 9 },
  categoryRail: { gap: 8, paddingHorizontal: 18, paddingVertical: 12 },
  categoryChip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontSize: 10, fontWeight: '800' },
  mapFrame: { flex: 1, minHeight: 275, marginHorizontal: 12, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  locationButton: { position: 'absolute', right: 15, bottom: 17, width: 43, height: 43, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#1f2a24', shadowOpacity: 0.13, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  currentPill: { position: 'absolute', left: 14, bottom: 16, maxWidth: '58%', borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentDot: { width: 7, height: 7, borderRadius: 4 },
  currentText: { fontSize: 10, fontWeight: '700' },
  content: { paddingHorizontal: 18, paddingTop: 12 },
  statusBanner: { minHeight: 35, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  statusText: { flex: 1, fontSize: 10, lineHeight: 14 },
  statusAction: { fontSize: 10, fontWeight: '800' },
  coordinateNote: { fontSize: 10, lineHeight: 14, marginBottom: 6 },
  restingCopy: { paddingVertical: 4, marginBottom: 8 },
  restingKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  restingTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  restingText: { fontSize: 12, marginTop: 2 },
  preview: { minHeight: 119, borderWidth: 1, borderRadius: 18, padding: 10, flexDirection: 'row', position: 'relative', marginBottom: 10 },
  previewImage: { width: 78, height: 98, borderRadius: 12 },
  previewCopy: { flex: 1, paddingLeft: 11, paddingRight: 32 },
  previewCategory: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  previewTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  previewLocation: { fontSize: 11, marginTop: 4 },
  previewSource: { fontSize: 9, marginTop: 8 },
  previewDistance: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  previewFavorite: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  previewActions: { position: 'absolute', left: 99, right: 10, bottom: 10, flexDirection: 'row', gap: 7 },
  previewButton: { borderRadius: 100, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewButtonText: { fontSize: 10, fontWeight: '800' },
  directionButton: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  directionText: { fontSize: 10, fontWeight: '800' },
  resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 3, marginBottom: 8 },
  resultsTitle: { fontSize: 16, fontWeight: '700' },
  resultsCount: { fontSize: 10, fontWeight: '700' },
  resultsList: { gap: 8, paddingBottom: 4 },
  resultCard: { width: 205, minHeight: 84, borderWidth: 1, borderRadius: 15, padding: 7, flexDirection: 'row' },
  resultImage: { width: 68, height: 68, borderRadius: 10 },
  resultCopy: { flex: 1, paddingLeft: 8, paddingTop: 2 },
  resultCategory: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  resultTitle: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  resultLocation: { fontSize: 10, marginTop: 3 },
  resultDistance: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  resultsLoading: { minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: 7 },
  resultsEmpty: { minHeight: 88, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  resultsEmptyTitle: { fontSize: 13, fontWeight: '700', marginTop: 7, textAlign: 'center' },
  resultsEmptyText: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
});