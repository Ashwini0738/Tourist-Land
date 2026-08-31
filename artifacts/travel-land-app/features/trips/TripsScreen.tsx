import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '@/features/home/utils/images';
import {
  getListTripsQueryKey,
  useCreateTrip,
  useRemoveTripItem,
  useReorderTripItems,
  useListTrips,
  type Trip,
  type TripItem,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radii, spacing } from '@/constants/theme';

function itemLabel(type: TripItem['entityType']) {
  return type === 'property' ? 'Land' : type.charAt(0).toUpperCase() + type.slice(1);
}

function dateRange(trip: Trip) {
  if (!trip.startsOn && !trip.endsOn) return 'Dates to be decided';
  if (trip.startsOn && trip.endsOn) return `${trip.startsOn} – ${trip.endsOn}`;
  return trip.startsOn ? `From ${trip.startsOn}` : `Until ${trip.endsOn}`;
}

function tripError(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'This trip could not be updated.';
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const tripsQuery = useListTrips({ query: { queryKey: getListTripsQueryKey(), staleTime: 15_000, refetchOnReconnect: true } });
  const createTrip = useCreateTrip();
  const removeTripItem = useRemoveTripItem();
  const reorderTripItems = useReorderTripItems();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [startsOn, setStartsOn] = React.useState('');
  const [endsOn, setEndsOn] = React.useState('');
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);
  const trips = (tripsQuery.data?.items ?? []).filter((trip) => trip.status === 'active');
  const selectedTrip = trips.find((trip) => trip.id === selectedId) ?? trips[0];

  const submitTrip = async () => {
    if (title.trim().length < 1) {
      setCreateError('Give this trip a name first.');
      return;
    }
    setWorking(true);
    setCreateError(null);
    try {
      const created = await createTrip.mutateAsync({ data: { title: title.trim(), startsOn: startsOn.trim() || null, endsOn: endsOn.trim() || null } });
      await queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
      setTitle('');
      setStartsOn('');
      setEndsOn('');
      setCreateOpen(false);
      setSelectedId(created.id);
    } catch (error) {
      setCreateError(tripError(error));
    } finally {
      setWorking(false);
    }
  };

  const moveItem = async (trip: Trip, index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= trip.items.length) return;
    const itemIds = trip.items.map((item) => item.id);
    [itemIds[index], itemIds[nextIndex]] = [itemIds[nextIndex], itemIds[index]];
    setWorking(true);
    setCreateError(null);
    try {
      await reorderTripItems.mutateAsync({ id: trip.id, data: { itemIds } });
      await queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
    } catch (error) {
      setCreateError(tripError(error));
    } finally {
      setWorking(false);
    }
  };

  const removeItem = async (trip: Trip, item: TripItem) => {
    setWorking(true);
    try {
      await removeTripItem.mutateAsync({ tripId: trip.id, itemId: item.id });
      await queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
    } catch (error) {
      setCreateError(tripError(error));
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <ScrollView
        testID="trips-scroll-view"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable testID="trips-back" accessibilityRole="button" accessibilityLabel="Back to saved" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
          <View style={styles.headerCopy}><Text style={[styles.kicker, { color: colors.primary }]}>YOUR ITINERARIES</Text><Text style={[styles.title, { color: colors.foreground }]}>My trips.</Text></View>
          <Pressable testID="trips-create" accessibilityRole="button" accessibilityLabel="Create a trip" onPress={() => { setCreateError(null); setCreateOpen(true); }} style={[styles.create, { backgroundColor: colors.primary }]}><Feather name="plus" size={17} color={colors.primaryForeground} /><Text style={[styles.createText, { color: colors.primaryForeground }]}>New</Text></Pressable>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Keep the places, stays, and experiences you are considering together. Book only when the plan feels right.</Text>
        {tripsQuery.isLoading && !trips.length ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your trips…</Text></View> : null}
        {tripsQuery.isError ? <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="alert-circle" size={22} color={colors.destructive} /><Text style={[styles.errorTitle, { color: colors.foreground }]}>Trips could not load</Text><Text style={[styles.errorText, { color: colors.mutedForeground }]}>Your plans are safe. Check your connection and try again.</Text><Pressable onPress={() => void tripsQuery.refetch()} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Try again</Text></Pressable></View> : null}
        {!trips.length && !tripsQuery.isLoading && !tripsQuery.isError ? <View testID="trips-empty" style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="calendar" size={26} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>A blank page, in a good way.</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Start with a name, then add saved places as your route takes shape.</Text><Pressable onPress={() => setCreateOpen(true)} style={[styles.button, { backgroundColor: colors.primary }]}><Feather name="plus" size={16} color={colors.primaryForeground} /><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Create a trip</Text></Pressable></View> : null}
        {trips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripRail}>
            {trips.map((trip) => (
              <Pressable key={trip.id} testID={`trip-card-${trip.id}`} accessibilityRole="button" accessibilityState={{ selected: selectedTrip?.id === trip.id }} onPress={() => setSelectedId(trip.id)} style={[styles.tripCard, { backgroundColor: selectedTrip?.id === trip.id ? colors.primary : colors.card, borderColor: selectedTrip?.id === trip.id ? colors.primary : colors.border }]}>
                <Text style={[styles.tripCardTitle, { color: selectedTrip?.id === trip.id ? colors.primaryForeground : colors.foreground }]} numberOfLines={1}>{trip.title}</Text>
                <Text style={[styles.tripCardMeta, { color: selectedTrip?.id === trip.id ? 'rgba(255,255,255,0.78)' : colors.mutedForeground }]}>{trip.items.length} item{trip.items.length === 1 ? '' : 's'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {selectedTrip ? (
          <View testID="selected-trip" style={[styles.detail, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailHeader}><View style={styles.detailCopy}><Text style={[styles.detailTitle, { color: colors.foreground }]}>{selectedTrip.title}</Text><Text style={[styles.detailDate, { color: colors.mutedForeground }]}>{dateRange(selectedTrip)}</Text></View><View style={[styles.count, { backgroundColor: colors.secondary }]}><Text style={[styles.countText, { color: colors.primary }]}>{selectedTrip.items.length}</Text><Text style={[styles.countLabel, { color: colors.mutedForeground }]}>planned</Text></View></View>
            <View style={[styles.provenance, { backgroundColor: colors.secondary }]}><Feather name="info" size={14} color={colors.primary} /><Text style={[styles.provenanceText, { color: colors.mutedForeground }]}>Trip items reference the current discovery catalog. Dates and prices are planning details until a server booking is created.</Text></View>
            {!selectedTrip.items.length ? <View style={styles.detailEmpty}><Feather name="compass" size={22} color={colors.primary} /><Text style={[styles.detailEmptyTitle, { color: colors.foreground }]}>Your route starts here</Text><Text style={[styles.detailEmptyText, { color: colors.mutedForeground }]}>Open Saved to add places, stays, food, events, or land opportunities.</Text><Pressable onPress={() => router.push('/(tabs)/saved')} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.outlineText, { color: colors.primary }]}>Open Saved</Text></Pressable></View> : selectedTrip.items.map((item, index) => (
              <View key={item.id} style={[styles.item, { borderColor: colors.border }]}>
                <View style={[styles.index, { backgroundColor: colors.secondary }]}><Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text></View>
                <Pressable disabled={!item.available || !item.route} onPress={() => item.route && router.push(item.route as any)} style={styles.itemPress}><Image source={getImageSource(item.imageKey)} style={styles.itemImage} /><View style={styles.itemCopy}><Text style={[styles.itemType, { color: colors.primary }]}>{itemLabel(item.entityType)}</Text><Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.name ?? item.entityId}</Text><Text style={[styles.itemLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location ?? 'Catalog location not listed'}</Text></View></Pressable>
                <View style={styles.itemControls}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${item.name ?? item.entityId} earlier`} disabled={working || index === 0} onPress={() => void moveItem(selectedTrip, index, -1)} style={styles.move}><Text style={[styles.moveText, { color: index === 0 ? colors.border : colors.primary }]}>↑</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${item.name ?? item.entityId} later`} disabled={working || index === selectedTrip.items.length - 1} onPress={() => void moveItem(selectedTrip, index, 1)} style={styles.move}><Text style={[styles.moveText, { color: index === selectedTrip.items.length - 1 ? colors.border : colors.primary }]}>↓</Text></Pressable>
                  <Pressable testID={`trip-remove-${item.id}`} accessibilityRole="button" accessibilityLabel={`Remove ${item.name ?? item.entityId} from ${selectedTrip.title}`} disabled={working} onPress={() => void removeItem(selectedTrip, item)}><Feather name="trash-2" size={17} color={colors.destructive} /></Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.exploreButton, { borderColor: colors.border }]}><Feather name="search" size={16} color={colors.primary} /><Text style={[styles.exploreText, { color: colors.primary }]}>Find something to add</Text></Pressable>
      </ScrollView>
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}><View><Text style={[styles.sheetKicker, { color: colors.primary }]}>A NEW CHAPTER</Text><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Name your trip</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close create trip dialog" onPress={() => setCreateOpen(false)}><Feather name="x" size={20} color={colors.foreground} /></Pressable></View>
            <TextInput testID="trip-title-input" accessibilityLabel="Trip name" autoFocus value={title} onChangeText={setTitle} onSubmitEditing={() => void submitTrip()} placeholder="Goa weekend" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} maxLength={200} />
            <View style={styles.dateRow}>
              <TextInput testID="trip-start-date" accessibilityLabel="Trip start date" value={startsOn} onChangeText={setStartsOn} placeholder="Start YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} maxLength={10} />
              <TextInput testID="trip-end-date" accessibilityLabel="Trip end date" value={endsOn} onChangeText={setEndsOn} placeholder="End YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} maxLength={10} />
            </View>
            {createError ? <Text style={[styles.formError, { color: colors.destructive }]}>{createError}</Text> : null}
            <Pressable testID="trip-create-submit" disabled={working} onPress={() => void submitTrip()} style={[styles.submit, { backgroundColor: working ? colors.muted : colors.primary }]}>{working ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Create trip</Text>}</Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -0.9 },
  create: { borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', gap: 5, alignItems: 'center' },
  createText: { fontSize: 11, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 18 },
  loading: { alignItems: 'center', padding: 30, gap: 9 },
  loadingText: { fontSize: 12 },
  errorCard: { borderWidth: 1, borderRadius: radii.lg, padding: 24, alignItems: 'center' },
  errorTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  errorText: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 5 },
  empty: { borderWidth: 1, borderRadius: radii.lg, alignItems: 'center', padding: 30, marginTop: 8, ...elevation.card },
  emptyIcon: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 19, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  button: { marginTop: 20, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  buttonText: { fontSize: 12, fontWeight: '800' },
  tripRail: { gap: 9, paddingVertical: 4, paddingBottom: 16 },
  tripCard: { width: 155, borderWidth: 1, borderRadius: radii.md, padding: 14 },
  tripCardTitle: { fontSize: 14, fontWeight: '800' },
  tripCardMeta: { fontSize: 11, marginTop: 6 },
  detail: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, ...elevation.card },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  detailCopy: { flex: 1, paddingRight: 10 },
  detailTitle: { fontSize: 21, fontWeight: '800' },
  detailDate: { fontSize: 11, marginTop: 5 },
  count: { minWidth: 58, borderRadius: 12, padding: 8, alignItems: 'center' },
  countText: { fontSize: 19, fontWeight: '800' },
  countLabel: { fontSize: 9, marginTop: 2 },
  provenance: { borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 15 },
  provenanceText: { flex: 1, fontSize: 10, lineHeight: 14 },
  detailEmpty: { alignItems: 'center', padding: 25 },
  detailEmptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 9 },
  detailEmptyText: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  outlineButton: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10, marginTop: 15 },
  outlineText: { fontSize: 12, fontWeight: '800' },
  item: { borderTopWidth: 1, paddingTop: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  index: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  indexText: { fontSize: 10, fontWeight: '800' },
  itemPress: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  itemImage: { width: 58, height: 58, borderRadius: 11 },
  itemCopy: { flex: 1, marginLeft: 9, minWidth: 0 },
  itemType: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  itemName: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  itemLocation: { fontSize: 10, marginTop: 3 },
  itemControls: { alignItems: 'center', gap: 2 },
  move: { paddingHorizontal: 5, paddingVertical: 1 },
  moveText: { fontSize: 18, lineHeight: 18, fontWeight: '800' },
  exploreButton: { borderWidth: 1, borderRadius: radii.md, padding: 14, marginTop: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  exploreText: { fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,23,18,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg, paddingBottom: 34 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  sheetTitle: { fontSize: 24, fontWeight: '800', marginTop: 5 },
  input: { height: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 14, marginTop: 20 },
  dateRow: { flexDirection: 'row', gap: 9, marginTop: 9 },
  dateInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, fontSize: 11 },
  formError: { fontSize: 12, marginTop: 8 },
  submit: { minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  submitText: { fontSize: 13, fontWeight: '800' },
});