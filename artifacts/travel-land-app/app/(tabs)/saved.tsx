import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { getFavoriteKey, useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '@/features/home/utils/images';
import {
  getListFavoritesQueryKey,
  getListTripsQueryKey,
  useAddTripItem,
  useListFavorites,
  useListTrips,
  type Favorite,
  type Trip,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radii, spacing } from '@/constants/theme';

function entityLabel(type: Favorite['entityType']) {
  return type === 'destination' ? 'Destination' : type === 'property' ? 'Land opportunity' : type.charAt(0).toUpperCase() + type.slice(1);
}

const filterOptions: Array<{ value: 'all' | Favorite['entityType']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'destination', label: 'Destinations' },
  { value: 'place', label: 'Places' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'food', label: 'Food' },
  { value: 'event', label: 'Events' },
  { value: 'property', label: 'Land' },
];

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { favoriteIds, toggleFavorite, isHydrated } = useAppState();
  const favoritesQuery = useListFavorites({ query: { queryKey: getListFavoritesQueryKey(), enabled: isHydrated, staleTime: 30_000, refetchOnReconnect: true } });
  const tripsQuery = useListTrips({ query: { queryKey: getListTripsQueryKey(), enabled: isHydrated, staleTime: 30_000 } });
  const addTripItem = useAddTripItem();
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<(typeof filterOptions)[number]['value']>('all');
  const [pickerItem, setPickerItem] = React.useState<Favorite | null>(null);
  const [addingToTrip, setAddingToTrip] = React.useState<string | null>(null);
  const [pickerError, setPickerError] = React.useState<string | null>(null);
  const serverItems = favoritesQuery.data?.items ?? [];
  const items = serverItems.filter((item) => {
    const matchesFilter = filter === 'all' || item.entityType === filter;
    const haystack = `${item.name ?? ''} ${item.location ?? ''} ${item.entityType}`.toLowerCase();
    return matchesFilter && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });
  const activeTrips = (tripsQuery.data?.items ?? []).filter((trip) => trip.status === 'active');

  const addToTrip = async (trip: Trip) => {
    if (!pickerItem) return;
    setAddingToTrip(trip.id);
    setPickerError(null);
    try {
      await addTripItem.mutateAsync({
        id: trip.id,
        data: { entityType: pickerItem.entityType, entityId: pickerItem.entityId },
      });
      await queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
      setPickerItem(null);
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : 'This item could not be added to the trip.');
    } finally {
      setAddingToTrip(null);
    }
  };

  return (
    <>
      <ScrollView
        testID="saved-scroll-view"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>YOUR COLLECTION</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Saved for later.</Text>
          </View>
          <Pressable
            testID="saved-trips-link"
            accessibilityRole="button"
            accessibilityLabel="Open my trips"
            onPress={() => router.push('/trips' as any)}
            style={[styles.tripLink, { backgroundColor: colors.secondary }]}
          >
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.tripLinkText, { color: colors.primary }]}>My trips</Text>
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {serverItems.length ? `${serverItems.length} saved item${serverItems.length === 1 ? '' : 's'} across your discovery catalog` : 'Keep the good places close.'}
        </Text>
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            testID="saved-search"
            accessibilityLabel="Search saved items"
            value={search}
            onChangeText={setSearch}
            placeholder="Search your saved places"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear saved search" onPress={() => setSearch('')}><Feather name="x-circle" size={18} color={colors.mutedForeground} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filterOptions.map((option) => (
            <Pressable
              key={option.value}
              testID={`saved-filter-${option.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === option.value }}
              onPress={() => setFilter(option.value)}
              style={[styles.filter, { backgroundColor: filter === option.value ? colors.primary : colors.card, borderColor: filter === option.value ? colors.primary : colors.border }]}
            >
              <Text style={[styles.filterText, { color: filter === option.value ? colors.primaryForeground : colors.mutedForeground }]}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {favoritesQuery.isLoading && !serverItems.length ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your collection…</Text></View> : null}
        {favoritesQuery.isError ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="alert-circle" size={23} color={colors.destructive} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your collection could not load</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Saved changes are kept locally and will retry when you reconnect.</Text><Pressable onPress={() => void favoritesQuery.refetch()} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Try again</Text></Pressable></View> : null}
        {!items.length && !favoritesQuery.isLoading && !favoritesQuery.isError ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="heart" size={25} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{serverItems.length ? 'Nothing matches this filter' : 'Your collection is waiting'}</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{serverItems.length ? 'Try another category or search term.' : 'Tap the heart on a destination, place, event, food, hotel, or land opportunity to save it here.'}</Text>{!serverItems.length ? <Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Start exploring</Text></Pressable> : null}</View> : null}
        {items.map((item) => {
          const favoriteId = getFavoriteKey(item.entityType, item.entityId);
          const canOpen = Boolean(item.available && item.route);
          return (
            <View key={favoriteId} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable disabled={!canOpen} onPress={() => item.route && router.push(item.route as any)} style={styles.itemPress}>
                <Image source={getImageSource(item.imageKey)} style={styles.image} />
                <View style={styles.copy}>
                  <Text style={[styles.kind, { color: colors.primary }]}>{entityLabel(item.entityType)}</Text>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{item.name ?? item.entityId}</Text>
                  <Text style={[styles.place, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location ?? (canOpen ? 'Catalog location not listed' : 'This item is no longer in the active catalog')}</Text>
                </View>
              </Pressable>
              <View style={styles.itemActions}>
                <Pressable testID={`saved-add-trip-${item.entityType}-${item.entityId}`} accessibilityRole="button" accessibilityLabel={`Add ${item.name ?? item.entityId} to a trip`} onPress={() => { setPickerError(null); setPickerItem(item); }} style={[styles.addTrip, { backgroundColor: colors.secondary }]}>
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.addTripText, { color: colors.primary }]}>Trip</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name ?? item.entityId} from favorites`} onPress={() => toggleFavorite(favoriteId)} hitSlop={12} style={styles.remove}><Feather name="heart" size={19} color={colors.destructive} fill={colors.destructive} /></Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Modal visible={Boolean(pickerItem)} transparent animationType="slide" onRequestClose={() => setPickerItem(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerItem(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}><View><Text style={[styles.sheetKicker, { color: colors.primary }]}>PLAN AHEAD</Text><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add to a trip</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close trip picker" onPress={() => setPickerItem(null)}><Feather name="x" size={20} color={colors.foreground} /></Pressable></View>
            <Text style={[styles.sheetItem, { color: colors.mutedForeground }]} numberOfLines={2}>{pickerItem?.name ?? pickerItem?.entityId}</Text>
            {pickerError ? <Text style={[styles.pickerError, { color: colors.destructive }]}>{pickerError}</Text> : null}
            {!activeTrips.length ? <View style={styles.noTrips}><Feather name="calendar" size={22} color={colors.primary} /><Text style={[styles.noTripsTitle, { color: colors.foreground }]}>Create your first trip</Text><Text style={[styles.noTripsText, { color: colors.mutedForeground }]}>Give your saved places a plan, then come back when you’re ready.</Text><Pressable onPress={() => { setPickerItem(null); router.push('/trips' as any); }} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Open My Trips</Text></Pressable></View> : activeTrips.map((trip) => <Pressable key={trip.id} testID={`saved-trip-option-${trip.id}`} accessibilityRole="button" disabled={Boolean(addingToTrip)} onPress={() => void addToTrip(trip)} style={[styles.tripOption, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.tripOptionCopy}><Text style={[styles.tripOptionTitle, { color: colors.foreground }]}>{trip.title}</Text><Text style={[styles.tripOptionMeta, { color: colors.mutedForeground }]}>{trip.items.length} planned item{trip.items.length === 1 ? '' : 's'}</Text></View>{addingToTrip === trip.id ? <ActivityIndicator color={colors.primary} /> : <Feather name="plus-circle" size={21} color={colors.primary} />}</Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -0.9 },
  subtitle: { fontSize: 13, marginTop: 8, marginBottom: 18 },
  tripLink: { marginTop: 3, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripLinkText: { fontSize: 11, fontWeight: '800' },
  search: { height: 52, borderWidth: 1, borderRadius: radii.md, alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.md, ...elevation.card },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 9 },
  filters: { gap: 8, paddingVertical: spacing.md },
  filter: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 9 },
  filterText: { fontSize: 11, fontWeight: '800' },
  loading: { alignItems: 'center', padding: 30, gap: 9 },
  loadingText: { fontSize: 12 },
  item: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', marginBottom: 12, ...elevation.card },
  itemPress: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  image: { width: 72, height: 72, borderRadius: 12 },
  copy: { flex: 1, marginLeft: 12, paddingRight: 8, minWidth: 0 },
  kind: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontSize: 16, fontWeight: '700', marginTop: 5 },
  place: { fontSize: 12, marginTop: 6 },
  itemActions: { alignItems: 'flex-end', gap: 10 },
  addTrip: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addTripText: { fontSize: 10, fontWeight: '800' },
  remove: { padding: 5 },
  empty: { borderWidth: 1, borderRadius: radii.lg, alignItems: 'center', padding: 30, marginTop: 12, ...elevation.card },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  button: { borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,23,18,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg, paddingBottom: 34, maxHeight: '78%' },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  sheetTitle: { fontSize: 24, fontWeight: '800', marginTop: 5 },
  sheetItem: { fontSize: 13, marginTop: 8, marginBottom: 15 },
  pickerError: { fontSize: 12, marginBottom: 10 },
  tripOption: { borderWidth: 1, borderRadius: radii.md, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripOptionCopy: { flex: 1 },
  tripOptionTitle: { fontSize: 14, fontWeight: '800' },
  tripOptionMeta: { fontSize: 11, marginTop: 4 },
  noTrips: { alignItems: 'center', padding: 18 },
  noTripsTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  noTripsText: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
});