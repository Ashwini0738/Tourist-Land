import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import { getImageSource } from '@/features/home/utils/images';
import { getSearchExploreQueryKey, type ExploreItemType, useSearchExplore } from '@workspace/api-client-react';
import { Gallery } from '@/features/gallery/Gallery';
import { AddToTripButton } from '@/features/trips/AddToTripButton';

export default function ExploreDetailScreen({ defaultType = 'hotel' }: { defaultType?: ExploreItemType } = {}) {
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    location?: string;
    category?: string;
    summary?: string;
    imageKey?: string;
    dateLabel?: string;
    favoriteId?: string;
    type?: ExploreItemType;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useAppState();
  const id = params.id ?? 'explore-item';
  const itemType = params.type ?? defaultType;
  const detailQuery = useSearchExplore(
    { id, category: itemType, limit: 1 },
    { query: { queryKey: getSearchExploreQueryKey({ id, category: itemType, limit: 1 }), enabled: Boolean(params.id), staleTime: 30_000 } },
  );
  const item = detailQuery.data?.items[0];
  const title = item?.title ?? params.title ?? 'Discovery preview';
  const location = item?.location ?? params.location ?? 'Travel & Land';
  const category = item?.category ?? params.category ?? 'Discovery';
  const favoriteId = params.favoriteId ?? `${category.toLowerCase()}:${id}`;
  const imageKey = item?.imageKey ?? params.imageKey ?? 'highlands';
  const source = item?.source ?? 'development';
  const sourceLabel = item?.sourceLabel ?? 'Development preview';
  const sourceNotice = item?.sourceNotice ?? 'Development discovery content only. Current availability and schedules are not connected for this result.';
  const availability = item?.availability;
  const schedule = item?.schedule;
  const description = item?.summary ?? params.summary ?? 'A curated development-content preview to help you discover the places and stories Travel & Land is building toward.';
  const liveStatus = availability?.status === 'available'
    ? availability.priceLabel ?? 'Available now'
    : availability?.status === 'unavailable'
      ? 'Currently unavailable'
      : undefined;
  const eventStatus = schedule?.status === 'cancelled'
    ? schedule.dateLabel ?? 'Cancelled'
    : schedule?.status === 'unavailable'
      ? 'Schedule unavailable'
      : schedule?.dateLabel;
  const detailStatus = liveStatus ?? eventStatus;
  const sourceColor = source === 'live' ? colors.primary : source === 'unavailable' ? colors.destructive : colors.mutedForeground;
  const canSelectDates = itemType === 'hotel' && availability?.status === 'available';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Gallery imageKeys={[imageKey]} label={title} height={420} />
        <View style={[styles.heroActions, { top: insets.top + 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.actionButton}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${title} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(favoriteId)} style={styles.actionButton}>
            <Feather name="heart" size={19} color={isFavorite(favoriteId) ? '#ef4444' : '#fff'} fill={isFavorite(favoriteId) ? '#ef4444' : 'transparent'} />
          </Pressable>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{category.toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={[styles.previewBadge, { backgroundColor: colors.secondary }]}>
          <Feather name={source === 'live' ? 'radio' : source === 'unavailable' ? 'alert-circle' : 'info'} size={15} color={sourceColor} />
          <Text style={[styles.previewBadgeText, { color: sourceColor }]}>{sourceLabel}</Text>
        </View>
        {detailStatus ? <Text style={[styles.date, { color: source === 'unavailable' ? colors.destructive : colors.primary }]}>{detailStatus}</Text> : null}
        {schedule?.venue ? <Text style={[styles.venue, { color: colors.mutedForeground }]}>{schedule.venue}</Text> : null}
        {detailQuery.isLoading ? <Text style={[styles.loading, { color: colors.mutedForeground }]}>Refreshing live details…</Text> : null}
        <Text style={[styles.description, { color: colors.foreground }]}>{description}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ABOUT THIS RESULT</Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>{sourceNotice}</Text>
          {item?.checkedAt ? <Text style={[styles.checkedAt, { color: colors.mutedForeground }]}>Checked {new Date(item.checkedAt).toLocaleString()}</Text> : null}
        </View>
        <View style={styles.actionRow}>
          <AddToTripButton entityType={itemType as any} entityId={id} label={title} compact />
          <Pressable accessibilityRole="button" onPress={() => router.push(canSelectDates ? '/booking' : '/(tabs)/explore')} style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{canSelectDates ? 'Select dates' : 'Continue exploring'}</Text>
            <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 42 },
  hero: { height: 420, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFill, width: undefined, height: undefined },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,35,27,0.42)' },
  heroActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  kicker: { color: '#f4c17f', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '700' },
  location: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 7 },
  body: { padding: 22 },
  previewBadge: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewBadgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 13, fontWeight: '800', marginTop: 22 },
  venue: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  loading: { fontSize: 11, marginTop: 14 },
  description: { fontSize: 18, lineHeight: 27, marginTop: 18 },
  infoCard: { borderWidth: 1, borderRadius: 17, padding: 16, marginTop: 25 },
  infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  infoText: { fontSize: 12, lineHeight: 18, marginTop: 9 },
  checkedAt: { fontSize: 10, marginTop: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 24 },
  button: { flex: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontSize: 14, fontWeight: '800' },
});