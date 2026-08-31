import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import {
  getListTripsQueryKey,
  useAddTripItem,
  useListTrips,
  type Trip,
  type TripItemEntityType,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing } from '@/constants/theme';

type AddToTripButtonProps = {
  entityType: TripItemEntityType;
  entityId: string;
  label: string;
  compact?: boolean;
};

export function AddToTripButton({ entityType, entityId, label, compact = false }: AddToTripButtonProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const tripsQuery = useListTrips({ query: { queryKey: getListTripsQueryKey(), staleTime: 30_000 } });
  const addTripItem = useAddTripItem();
  const [open, setOpen] = React.useState(false);
  const [working, setWorking] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const trips = (tripsQuery.data?.items ?? []).filter((trip) => trip.status === 'active');

  const add = async (trip: Trip) => {
    setWorking(trip.id);
    setMessage(null);
    try {
      await addTripItem.mutateAsync({ id: trip.id, data: { entityType, entityId } });
      await queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
      setMessage(`Added to ${trip.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'This item could not be added to the trip.');
    } finally {
      setWorking(null);
    }
  };

  return (
    <>
      <Pressable
        testID={`add-to-trip-${entityType}-${entityId}`}
        accessibilityRole="button"
        accessibilityLabel={`Add ${label} to a trip`}
        onPress={() => { setMessage(null); setOpen(true); }}
        style={[styles.button, compact ? styles.compactButton : null, { borderColor: colors.border, backgroundColor: compact ? colors.card : colors.secondary }]}
      >
        <Feather name="plus" size={compact ? 14 : 16} color={colors.primary} />
        <Text style={[styles.buttonText, { color: colors.primary }]}>{compact ? 'Trip' : 'Add to trip'}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.header}><View><Text style={[styles.kicker, { color: colors.primary }]}>PLAN AHEAD</Text><Text style={[styles.title, { color: colors.foreground }]}>Choose a trip</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close add to trip dialog" onPress={() => setOpen(false)}><Feather name="x" size={20} color={colors.foreground} /></Pressable></View>
            <Text style={[styles.itemLabel, { color: colors.mutedForeground }]} numberOfLines={2}>{label}</Text>
            {message ? <Text style={[styles.message, { color: message.startsWith('Added') ? colors.primary : colors.destructive }]}>{message}</Text> : null}
            {tripsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : trips.length ? trips.map((trip) => <Pressable key={trip.id} testID={`detail-trip-option-${trip.id}`} accessibilityRole="button" disabled={Boolean(working)} onPress={() => void add(trip)} style={[styles.trip, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={styles.tripCopy}><Text style={[styles.tripTitle, { color: colors.foreground }]}>{trip.title}</Text><Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>{trip.items.length} planned item{trip.items.length === 1 ? '' : 's'}</Text></View>{working === trip.id ? <ActivityIndicator color={colors.primary} /> : <Feather name="plus-circle" size={20} color={colors.primary} />}</Pressable>) : <View style={styles.empty}><Feather name="calendar" size={22} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No active trips yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Create one in My Trips, then return here to keep planning.</Text></View>}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  compactButton: { minHeight: 36, borderRadius: radii.pill, paddingHorizontal: 11 },
  buttonText: { fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,23,18,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg, paddingBottom: 34 },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 5 },
  itemLabel: { fontSize: 13, marginTop: 8, marginBottom: 14 },
  message: { fontSize: 12, marginBottom: 10 },
  trip: { borderWidth: 1, borderRadius: radii.md, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripCopy: { flex: 1 },
  tripTitle: { fontSize: 14, fontWeight: '800' },
  tripMeta: { fontSize: 11, marginTop: 4 },
  empty: { alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 9 },
  emptyText: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
});