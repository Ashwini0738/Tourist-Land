import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { getFavoriteKey, useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '@/features/home/utils/images';
import { getListFavoritesQueryKey, useListFavorites, type Favorite } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radii, spacing } from '@/constants/theme';

function entityLabel(type: Favorite['entityType']) {
  return type === 'destination' ? 'Destination' : type === 'property' ? 'Land opportunity' : type.charAt(0).toUpperCase() + type.slice(1);
}

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favoriteIds, toggleFavorite, isHydrated } = useAppState();
  const favoritesQuery = useListFavorites({ query: { queryKey: getListFavoritesQueryKey(), enabled: isHydrated, staleTime: 30_000, refetchOnReconnect: true } });
  const items = (favoritesQuery.data?.items ?? []).filter((item) => favoriteIds.includes(getFavoriteKey(item.entityType, item.entityId)));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.kicker, { color: colors.primary }]}>YOUR COLLECTION</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Saved for later.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{items.length ? `${items.length} saved item${items.length === 1 ? '' : 's'} across your discovery catalog` : 'Keep the good places close.'}</Text>
      {favoritesQuery.isLoading && !items.length ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : null}
      {favoritesQuery.isError ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="alert-circle" size={23} color={colors.destructive} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your collection could not load</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Saved changes are kept locally and will retry when you reconnect.</Text><Pressable onPress={() => void favoritesQuery.refetch()} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Try again</Text></Pressable></View> : null}
      {!items.length && !favoritesQuery.isLoading && !favoritesQuery.isError ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="heart" size={25} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your collection is waiting</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap the heart on a destination, place, event, food, hotel, or land opportunity to save it here.</Text><Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Start exploring</Text></Pressable></View> : null}
      {items.map((item) => {
        const favoriteId = getFavoriteKey(item.entityType, item.entityId);
        const canOpen = Boolean(item.available && item.route);
        return <View key={favoriteId} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}><Pressable disabled={!canOpen} onPress={() => item.route && router.push(item.route as any)} style={styles.itemPress}><Image source={getImageSource(item.imageKey)} style={styles.image} /><View style={styles.copy}><Text style={[styles.kind, { color: colors.primary }]}>{entityLabel(item.entityType)}</Text><Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{item.name ?? item.entityId}</Text><Text style={[styles.place, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location ?? (canOpen ? 'Catalog location not listed' : 'This item is no longer in the active catalog')}</Text></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name ?? item.entityId} from favorites`} onPress={() => toggleFavorite(favoriteId)} hitSlop={12} style={styles.remove}><Feather name="heart" size={19} color={colors.destructive} fill={colors.destructive} /></Pressable></View>;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -0.9 },
  subtitle: { fontSize: 13, marginTop: 8, marginBottom: 24 },
  loading: { alignItems: 'center', padding: 30 },
  item: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', marginBottom: 12, ...elevation.card },
  itemPress: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  image: { width: 72, height: 72, borderRadius: 12 },
  copy: { flex: 1, marginLeft: 12, paddingRight: 8 },
  kind: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontSize: 16, fontWeight: '700', marginTop: 5 },
  place: { fontSize: 12, marginTop: 6 },
  remove: { padding: 5 },
  empty: { borderWidth: 1, borderRadius: radii.lg, alignItems: 'center', padding: 30, marginTop: 22, ...elevation.card },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  button: { borderRadius: 100, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 },
  buttonText: { fontSize: 13, fontWeight: '700' },
});