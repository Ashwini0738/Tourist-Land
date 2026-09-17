import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { getFavoriteKey, useAppState } from '@/context/AppStateContext';
import { getImageSource } from '@/features/home/utils/images';
import { Gallery } from '@/features/gallery/Gallery';
import { AddToTripButton } from '@/features/trips/AddToTripButton';
import { useColors } from '@/hooks/useColors';
import {
  useGetDestination,
  getGetDestinationQueryKey,
  type DestinationDetail,
  type Event,
  type Food,
  type Hotel,
  type Place,
} from '@workspace/api-client-react';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Platform as NativePlatform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SectionProps<T> = {
  title: string;
  eyebrow?: string;
  emptyLabel: string;
  items: readonly T[];
  renderItem: (item: T) => React.ReactElement | null;
  emptyState?: boolean;
};

function Skeleton({ style }: { style?: object }) {
  const colors = useColors();
  return <View style={[styles.skeleton, { backgroundColor: colors.muted }, style]} />;
}

function DestinationLoading() {
  const colors = useColors();
  return (
    <ScrollView
      testID="destination-loading"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      scrollEnabled={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.secondary }]}>
        <Skeleton style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}>
          <Skeleton style={styles.kickerSkeleton} />
          <Skeleton style={styles.titleSkeleton} />
          <Skeleton style={styles.locationSkeleton} />
        </View>
      </View>
      <View style={styles.body}>
        <Skeleton style={styles.introSkeleton} />
        <Skeleton style={styles.descriptionSkeleton} />
        <Skeleton style={styles.descriptionSkeletonShort} />
        {[0, 1, 2].map((section) => (
          <View key={section} style={styles.loadingSection}>
            <Skeleton style={styles.sectionTitleSkeleton} />
            <View style={styles.skeletonRow}>
              <Skeleton style={styles.cardSkeleton} />
              <Skeleton style={styles.cardSkeleton} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function DestinationError({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.errorPage, { backgroundColor: colors.background }]}>
      <View style={[styles.errorIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="alert-circle" size={28} color={colors.destructive} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>Unable to load destination</Text>
      <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
        We couldn’t bring this destination into view. Check your connection and try again.
      </Text>
      <Pressable
        testID="destination-retry"
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Retry</Text>
        <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

function Section<T>({ title, eyebrow, emptyLabel, items, renderItem, emptyState = true }: SectionProps<T>) {
  const colors = useColors();
  if (!items.length && !emptyState) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        {items.length ? <Text style={[styles.count, { color: colors.mutedForeground }]}>{items.length}</Text> : null}
      </View>
      {items.length ? (
        <FlatList
          horizontal
          data={items}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={(_, index) => `${title}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          scrollEnabled={items.length > 0}
        />
      ) : (
        <View style={[styles.emptySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="box" size={21} color={colors.mutedForeground} />
          <Text style={[styles.emptySectionText, { color: colors.mutedForeground }]}>{emptyLabel}</Text>
        </View>
      )}
    </View>
  );
}

function FavoriteButton({
  favoriteId,
  label,
  onPress,
}: {
  favoriteId: string;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const { isFavorite } = useAppState();
  const active = isFavorite(favoriteId);
  return (
    <Pressable
      testID={`favorite-${favoriteId}`}
      accessibilityRole="button"
      accessibilityLabel={`${active ? 'Remove' : 'Add'} ${label} ${active ? 'from' : 'to'} favorites`}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      hitSlop={8}
      style={[styles.cardFavorite, { backgroundColor: colors.card }]}
    >
      <Feather name="heart" size={16} color={active ? colors.destructive : colors.foreground} fill={active ? colors.destructive : 'transparent'} />
    </Pressable>
  );
}

function DiscoveryCardFrame({
  testID,
  onPress,
  favoriteId,
  label,
  onFavorite,
  children,
}: {
  testID: string;
  onPress: () => void;
  favoriteId: string;
  label: string;
  onFavorite: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.discoveryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable testID={testID} accessibilityRole="button" onPress={onPress}>
        {children}
      </Pressable>
      <FavoriteButton favoriteId={favoriteId} label={label} onPress={onFavorite} />
    </View>
  );
}

function PlaceCard({ item, onFavorite }: { item: Place; onFavorite: () => void }) {
  const colors = useColors();
  const favoriteId = getFavoriteKey(item.category.toLowerCase() === 'temple' ? 'temple' : 'place', item.id);
  return (
    <DiscoveryCardFrame
      testID={`place-${item.id}`}
      onPress={() => router.push(`/place/${item.id}`)}
      favoriteId={favoriteId}
      label={item.name}
      onFavorite={onFavorite}
    >
      <Image source={getImageSource(item.imageKey)} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={[styles.cardCategory, { color: colors.primary }]} numberOfLines={1}>{item.category}</Text>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        {item.ratingLabel ? <Text style={[styles.cardMeta, { color: colors.accentForeground }]} numberOfLines={1}>★ {item.ratingLabel}</Text> : null}
      </View>
    </DiscoveryCardFrame>
  );
}

function EventCard({ item, onFavorite }: { item: Event; onFavorite: () => void }) {
  const colors = useColors();
  const favoriteId = getFavoriteKey('event', item.id);
  return (
    <DiscoveryCardFrame
      testID={`event-${item.id}`}
      onPress={() => router.push(`/event/${item.id}`)}
      favoriteId={favoriteId}
      label={item.title}
      onFavorite={onFavorite}
    >
      <Image source={getImageSource(item.imageKey)} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={[styles.cardCategory, { color: colors.primary }]} numberOfLines={2}>{item.dateLabel}</Text>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.cardLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        <Text style={[styles.cardDescription, { color: colors.foreground }]} numberOfLines={2}>{item.summary}</Text>
      </View>
    </DiscoveryCardFrame>
  );
}

function FoodCard({ item, onFavorite }: { item: Food; onFavorite: () => void }) {
  const colors = useColors();
  const favoriteId = getFavoriteKey('food', item.id);
  return (
    <DiscoveryCardFrame
      testID={`food-${item.id}`}
      onPress={() => router.push(`/food/${item.id}`)}
      favoriteId={favoriteId}
      label={item.name}
      onFavorite={onFavorite}
    >
      <Image source={getImageSource(item.imageKey)} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={[styles.cardCategory, { color: colors.primary }]} numberOfLines={1}>{item.category}</Text>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        {item.ratingLabel ? <Text style={[styles.cardMeta, { color: colors.accentForeground }]} numberOfLines={1}>★ {item.ratingLabel}</Text> : null}
      </View>
    </DiscoveryCardFrame>
  );
}

function HotelCard({ item, onFavorite }: { item: Hotel; onFavorite: () => void }) {
  const colors = useColors();
  const favoriteId = getFavoriteKey('hotel', item.id);
  return (
    <DiscoveryCardFrame
      testID={`hotel-${item.id}`}
      onPress={() => router.push(`/hotel/${item.id}`)}
      favoriteId={favoriteId}
      label={item.name}
      onFavorite={onFavorite}
    >
      <Image source={getImageSource(item.imageKey)} style={styles.cardImage} />
      <View style={[styles.sampleBadge, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.sampleBadgeText, { color: colors.secondaryForeground }]}>SAMPLE</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        <Text style={[styles.cardMeta, { color: colors.accentForeground }]} numberOfLines={1}>★ {item.ratingLabel}</Text>
        <Text style={[styles.cardPrice, { color: colors.foreground }]} numberOfLines={1}>{item.priceLabel}</Text>
      </View>
    </DiscoveryCardFrame>
  );
}

function DestinationMapCard({ destination }: { destination: DestinationDetail['destination'] }) {
  const colors = useColors();
  return (
    <Pressable
      testID="view-on-map"
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/maps', params: { destinationId: destination.id } })}
      style={[styles.mapCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}
    >
      <View style={[styles.mapIllustration, { backgroundColor: colors.card }]}>
        <View style={[styles.mapGridHorizontal, { top: '32%', borderColor: colors.border }]} />
        <View style={[styles.mapGridHorizontal, { top: '64%', borderColor: colors.border }]} />
        <View style={[styles.mapGridVertical, { left: '30%', borderColor: colors.border }]} />
        <View style={[styles.mapGridVertical, { left: '67%', borderColor: colors.border }]} />
        <View style={[styles.mapPin, { backgroundColor: colors.primary }]}>
          <Feather name="map-pin" size={16} color={colors.primaryForeground} />
        </View>
      </View>
      <View style={styles.mapCopy}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MAP PREVIEW</Text>
        <Text style={[styles.mapTitle, { color: colors.foreground }]}>View {destination.name} on the map</Text>
        <Text style={[styles.mapText, { color: colors.mutedForeground }]}>
          Open the existing map experience to explore this destination and nearby places.
        </Text>
        <View style={styles.mapAction}>
          <Text style={[styles.mapActionText, { color: colors.primary }]}>View on Map</Text>
          <Feather name="arrow-up-right" size={16} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function DestinationDetail() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const destinationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFavorite } = useAppState();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const detailQuery = useGetDestination(destinationId ?? '', {
    query: {
      queryKey: getGetDestinationQueryKey(destinationId ?? ''),
      enabled: Boolean(destinationId),
      staleTime: 60_000,
      retry: 1,
    },
  });
  const detail = detailQuery.data;
  const destination = detail?.destination;
  const favoriteId = destination ? getFavoriteKey('destination', destination.id) : '';
  const description = destination?.summary ?? '';
  const isLongDescription = description.length > 150;
  const visibleDescription = descriptionExpanded || !isLongDescription ? description : `${description.slice(0, 150).trim()}…`;
  const location = destination ? `${destination.region}, ${destination.country}` : '';
  const shareUrl = useMemo(
    () => (destination ? `travel-land-app://destination/${destination.id}` : ''),
    [destination],
  );

  const handleShare = async () => {
    if (!destination) return;
    const message = `${destination.name}\n${location}\n${destination.summary}\n${shareUrl}`;
    try {
      if (NativePlatform.OS === 'web') {
        const webNavigator = globalThis.navigator as Navigator & {
          share?: (data: { title: string; text: string; url: string }) => Promise<void>;
          clipboard?: { writeText: (value: string) => Promise<void> };
        };
        if (webNavigator.share) {
          await webNavigator.share({ title: destination.name, text: `${destination.summary}\n${location}`, url: shareUrl });
          setShareMessage('Destination shared');
          return;
        }
        if (webNavigator.clipboard) {
          await webNavigator.clipboard.writeText(shareUrl);
          setShareMessage('Destination link copied');
          return;
        }
        setShareMessage(`Share link: ${shareUrl}`);
        return;
      }
      await Share.share({ title: destination.name, message });
      setShareMessage('Destination shared');
    } catch {
      setShareMessage('Sharing is unavailable right now');
    }
  };

  if (detailQuery.isLoading && !detail) return <DestinationLoading />;
  if (detailQuery.isError && !detail) return <DestinationError onRetry={() => void detailQuery.refetch()} />;
  if (!detail || !destination) return <DestinationError onRetry={() => void detailQuery.refetch()} />;

  const onFavorite = (id: string) => () => toggleFavorite(id);
  const places = detail.places;
  const events = detail.events;
  const foods = detail.foods;
  const hotels = detail.hotels;
  const nearby = detail.nearby;

  return (
    <ScrollView
      testID="destination-details"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={detailQuery.isRefetching} onRefresh={() => void detailQuery.refetch()} tintColor={colors.primary} />}
    >
      <View style={styles.hero}>
        <Gallery imageKeys={[destination.imageKey]} label={destination.name} height={360} />
        <View style={[styles.heroActions, { top: insets.top + 10 }]}>
          <Pressable
            testID="destination-back"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.actionButton, { backgroundColor: colors.card }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.heroRightActions}>
            <Pressable
              testID="destination-share"
              accessibilityRole="button"
              accessibilityLabel={`Share ${destination.name}`}
              onPress={() => void handleShare()}
              style={[styles.actionButton, { backgroundColor: colors.card }]}
            >
              <Feather name="share" size={19} color={colors.foreground} />
            </Pressable>
            <Pressable
              testID="destination-favorite"
              accessibilityRole="button"
              accessibilityLabel={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${destination.name} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`}
              onPress={() => toggleFavorite(favoriteId)}
              style={[styles.actionButton, { backgroundColor: colors.card }]}
            >
              <Feather name="heart" size={19} color={isFavorite(favoriteId) ? colors.destructive : colors.foreground} fill={isFavorite(favoriteId) ? colors.destructive : 'transparent'} />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>{destination.country.toUpperCase()} · DESTINATION</Text>
          <Text style={styles.heroTitle}>{destination.name}</Text>
          <View style={styles.heroLocation}>
            <Feather name="map-pin" size={14} color="rgba(255,255,255,0.86)" />
            <Text style={styles.heroLocationText}>{location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.previewNotice, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.previewNoticeText, { color: colors.secondaryForeground }]}>{detail.sourceNotice}</Text>
        </View>

        <Text style={[styles.intro, { color: colors.primary }]}>DISCOVER SLOWLY</Text>
        <Text style={[styles.description, { color: colors.foreground }]}>{visibleDescription}</Text>
        {isLongDescription ? (
          <Pressable testID="description-toggle" accessibilityRole="button" onPress={() => setDescriptionExpanded((expanded) => !expanded)}>
            <Text style={[styles.readMore, { color: colors.primary }]}>{descriptionExpanded ? 'Read less' : 'Read more'}</Text>
          </Pressable>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Destination information</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="REGION" value={destination.region} />
            <InfoItem label="COUNTRY" value={destination.country} />
          </View>
        </View>
        <AddToTripButton entityType="destination" entityId={destination.id} label={destination.name} />

        <Section
          title="Places to visit"
          eyebrow="DISCOVER"
          emptyLabel="No places available"
          items={places}
          renderItem={() => {
            const item = places[0];
            return item ? <PlaceCard item={item} onFavorite={onFavorite(getFavoriteKey(item.category.toLowerCase() === 'temple' ? 'temple' : 'place', item.id))} /> : null;
          }}
        />

        <Section
          title="Events"
          eyebrow="ON THE CALENDAR"
          emptyLabel="No events available"
          items={events}
          renderItem={() => {
            const item = events[0];
            return item ? <EventCard item={item} onFavorite={onFavorite(getFavoriteKey('event', item.id))} /> : null;
          }}
        />

        <Section
          title="Food & local experiences"
          eyebrow="TASTE THE PLACE"
          emptyLabel="No food experiences available"
          items={foods}
          renderItem={() => {
            const item = foods[0];
            return item ? <FoodCard item={item} onFavorite={onFavorite(getFavoriteKey('food', item.id))} /> : null;
          }}
        />

        <Section
          title="Stays"
          eyebrow="STAY A WHILE"
          emptyLabel="No stays available"
          items={hotels}
          renderItem={() => {
            const item = hotels[0];
            return item ? <HotelCard item={item} onFavorite={onFavorite(getFavoriteKey('hotel', item.id))} /> : null;
          }}
        />

        <Section
          title="Nearby places"
          eyebrow="A LITTLE DETOUR"
          emptyLabel="No nearby places available"
          items={nearby}
          renderItem={() => {
            const item = nearby[0];
            return item ? <PlaceCard item={item} onFavorite={onFavorite(getFavoriteKey('place', item.id))} /> : null;
          }}
        />

        <DestinationMapCard destination={destination} />

        {shareMessage ? (
          <Text accessibilityLiveRegion="polite" style={[styles.shareMessage, { color: colors.mutedForeground }]}>
            {shareMessage}
          </Text>
        ) : null}

        {detailQuery.isError ? (
          <Pressable testID="destination-refresh-error" onPress={() => void detailQuery.refetch()} style={styles.refreshNotice}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.refreshNoticeText, { color: colors.mutedForeground }]}>Some details could not refresh. Tap to retry.</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 46 },
  hero: { height: 430, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFill, width: undefined, height: undefined },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,35,27,0.42)' },
  heroActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroRightActions: { flexDirection: 'row', gap: 10 },
  actionButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { position: 'absolute', left: 22, right: 22, bottom: 30 },
  heroKicker: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  heroTitle: { color: '#fff', fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -0.7 },
  heroLocation: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  heroLocationText: { color: 'rgba(255,255,255,0.86)', fontSize: 13 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  previewNotice: { borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  previewNoticeText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  intro: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 26 },
  description: { fontSize: 19, lineHeight: 28, letterSpacing: -0.25, marginTop: 9 },
  readMore: { fontSize: 13, fontWeight: '800', marginTop: 10 },
  infoCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 24 },
  infoCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 15 },
  infoGrid: { flexDirection: 'row', gap: 24 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  infoValue: { fontSize: 13, fontWeight: '700', marginTop: 7, lineHeight: 18 },
  section: { marginTop: 30 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 13 },
  sectionHeadingCopy: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.25, marginBottom: 5 },
  sectionTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  count: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  listContent: { gap: 12, paddingRight: 2 },
  discoveryCard: { width: 238, borderRadius: 18, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  cardImage: { width: '100%', height: 142 },
  cardBody: { padding: 13 },
  cardCategory: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginTop: 5 },
  cardLocation: { fontSize: 11, marginTop: 5 },
  cardMeta: { fontSize: 11, fontWeight: '700', marginTop: 10 },
  cardDescription: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  cardPrice: { fontSize: 13, fontWeight: '800', marginTop: 10 },
  cardFavorite: { position: 'absolute', right: 11, top: 11, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sampleBadge: { position: 'absolute', left: 11, top: 11, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  sampleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  emptySection: { minHeight: 104, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptySectionText: { fontSize: 12, fontWeight: '600' },
  mapCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginTop: 32, flexDirection: 'row', gap: 14 },
  mapIllustration: { width: 106, height: 136, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  mapGridHorizontal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1 },
  mapGridVertical: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 1 },
  mapPin: { position: 'absolute', left: 38, top: 52, width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mapCopy: { flex: 1, paddingVertical: 3 },
  mapTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  mapText: { fontSize: 11, lineHeight: 16, marginTop: 8 },
  mapAction: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 13 },
  mapActionText: { fontSize: 12, fontWeight: '800' },
  shareMessage: { textAlign: 'center', fontSize: 11, marginTop: 16 },
  refreshNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 },
  refreshNoticeText: { fontSize: 11 },
  primaryButton: { borderRadius: 16, paddingHorizontal: 19, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryButtonText: { fontSize: 14, fontWeight: '800' },
  errorPage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  errorText: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9, marginBottom: 22 },
  skeleton: { borderRadius: 8 },
  kickerSkeleton: { width: 120, height: 10 },
  titleSkeleton: { width: '78%', height: 40, marginTop: 13 },
  locationSkeleton: { width: '56%', height: 13, marginTop: 10 },
  introSkeleton: { width: 115, height: 11 },
  descriptionSkeleton: { width: '100%', height: 22, marginTop: 13 },
  descriptionSkeletonShort: { width: '72%', height: 22, marginTop: 9 },
  loadingSection: { marginTop: 29 },
  sectionTitleSkeleton: { width: 160, height: 20, marginBottom: 13 },
  skeletonRow: { flexDirection: 'row', gap: 12 },
  cardSkeleton: { width: 238, height: 220 },
});