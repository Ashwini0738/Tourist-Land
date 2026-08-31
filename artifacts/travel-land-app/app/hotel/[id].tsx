import React, { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getGetHotelQueryKey,
  getListHotelNearbyQueryKey,
  getListHotelRoomsQueryKey,
  getListHotelReviewsForHotelQueryKey,
  useGetHotel,
  useListHotelNearby,
  useListHotelRooms,
  useListHotelReviewsForHotel,
} from '@workspace/api-client-react';
import type { HotelDetail } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import {
  DateGuestControls,
  FavoriteButton,
  HotelHeader,
  HotelSearchSelection,
  ImageWithFallback,
  NearbyRow,
  NoticeBanner,
  RoomRow,
  SourceBadge,
} from '@/features/hotels/HotelUI';
import { DemoBadge } from '@/components/DemoBadge';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function HotelDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; checkIn?: string | string[]; checkOut?: string | string[]; adults?: string | string[]; children?: string | string[]; rooms?: string | string[] }>();
  const id = firstParam(params.id) ?? '';
  const { isFavorite, toggleFavorite } = useAppState();
  const [selection, setSelection] = useState<HotelSearchSelection>(() => ({ checkIn: firstParam(params.checkIn) || undefined, checkOut: firstParam(params.checkOut) || undefined, adults: Number(firstParam(params.adults)) || 1, children: Number(firstParam(params.children)) || 0, rooms: Number(firstParam(params.rooms)) || 1 }));
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const detailQuery = useGetHotel(id, { query: { queryKey: getGetHotelQueryKey(id), enabled: Boolean(id), staleTime: 60_000, retry: 1 } });
  const roomsQuery = useListHotelRooms(id, { query: { queryKey: getListHotelRoomsQueryKey(id), enabled: Boolean(id), staleTime: 60_000, retry: 1 } });
  const nearbyQuery = useListHotelNearby(id, { query: { queryKey: getListHotelNearbyQueryKey(id), enabled: Boolean(id), staleTime: 60_000, retry: 1 } });
  const reviewsQuery = useListHotelReviewsForHotel(id, undefined, { query: { queryKey: getListHotelReviewsForHotelQueryKey(id), enabled: Boolean(id), staleTime: 60_000, retry: 1 } });
  const detail: HotelDetail | undefined = detailQuery.data;
  const hotel = detail?.hotel;
  const favoriteId = `hotel:${id}`;
  const shareUrl = useMemo(() => `travel-land-app://hotel/${id}`, [id]);

  const handleShare = async () => {
    if (!hotel) return;
    const message = `${hotel.name}\n${hotel.location}\n${hotel.summary}\n${shareUrl}`;
    try {
      if (Platform.OS === 'web') {
        const webNavigator = globalThis.navigator as Navigator & { share?: (data: { title: string; text: string; url: string }) => Promise<void>; clipboard?: { writeText: (value: string) => Promise<void> } };
        if (webNavigator.share) {
          await webNavigator.share({ title: hotel.name, text: `${hotel.summary}\n${hotel.location}`, url: shareUrl });
          setShareMessage('Hotel shared');
        } else if (webNavigator.clipboard) {
          await webNavigator.clipboard.writeText(shareUrl);
          setShareMessage('Hotel link copied');
        } else {
          setShareMessage(`Share link: ${shareUrl}`);
        }
        return;
      }
      await Share.share({ title: hotel.name, message });
      setShareMessage('Hotel shared');
    } catch {
      setShareMessage('Sharing is unavailable right now');
    }
  };

  if (detailQuery.isLoading && !detail) return <HotelLoading />;
  if (detailQuery.isError || !detail || !hotel) return <HotelError onRetry={() => void detailQuery.refetch()} />;

  const gallery = detail.galleryImageKeys.length ? detail.galleryImageKeys : [hotel.imageKey];
  const openAvailability = () => router.push({ pathname: '/hotel/availability', params: { hotelId: hotel.id, hotelName: hotel.name, location: hotel.location, checkIn: selection.checkIn ?? '', checkOut: selection.checkOut ?? '', adults: String(selection.adults), children: String(selection.children), rooms: String(selection.rooms) } } as any);
  const openMap = () => router.push({ pathname: '/maps', params: { itemId: hotel.id, itemType: 'hotel' } } as any);

  return (
    <View testID="hotel-details" style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={detailQuery.isRefetching} onRefresh={() => void detailQuery.refetch()} tintColor={colors.primary} />}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 18 }]}
      >
        <View style={styles.hero}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
            {gallery.map((imageKey, index) => <ImageWithFallback key={`${imageKey}-${index}`} imageKey={imageKey} label={`${hotel.name} gallery image ${index + 1}`} style={styles.heroImage} />)}
          </ScrollView>
          <View style={styles.heroShade} />
          <View style={[styles.heroHeader, { paddingTop: insets.top + 4 }]}>
            <Pressable testID="hotel-detail-back" accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.heroIcon, { backgroundColor: 'rgba(31,42,36,0.44)' }]}><Feather name="arrow-left" size={20} color={colors.primaryForeground} /></Pressable>
            <View style={styles.heroActions}>
              <Pressable testID="hotel-share" accessibilityRole="button" accessibilityLabel={`Share ${hotel.name}`} onPress={() => void handleShare()} style={[styles.heroIcon, { backgroundColor: 'rgba(31,42,36,0.44)' }]}><Feather name="share" size={18} color={colors.primaryForeground} /></Pressable>
              <FavoriteButton favorite={isFavorite(favoriteId)} label={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${hotel.name} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(favoriteId)} light />
            </View>
          </View>
          <View style={styles.heroCopy}><SourceBadge label={hotel.sourceLabel} source={hotel.source} /><Text style={[styles.heroTitle, { color: colors.primaryForeground }]}>{hotel.name}</Text><Text style={[styles.heroLocation, { color: colors.primaryForeground }]}><Feather name="map-pin" size={13} color={colors.primaryForeground} /> {hotel.location}</Text></View>
        </View>
        {shareMessage ? <Pressable testID="hotel-share-message" accessibilityRole="button" accessibilityLabel="Dismiss share message" onPress={() => setShareMessage(null)} style={[styles.shareMessage, { backgroundColor: colors.secondary, borderColor: colors.border }]}><Feather name="check-circle" size={15} color={colors.primary} /><Text style={[styles.shareMessageText, { color: colors.foreground }]}>{shareMessage}</Text><Feather name="x" size={14} color={colors.mutedForeground} /></Pressable> : null}
        <NoticeBanner>{detail.sourceNotice || hotel.sourceNotice}</NoticeBanner>
         <View style={styles.demoBadge}><DemoBadge label="Demo hotel record" /></View>
        <Text style={[styles.description, { color: colors.foreground }]}>{detail.description || hotel.summary}</Text>
        <View style={styles.factGrid}>
          <Fact label="GUEST RATING" value={reviewsQuery.data?.ratingAverage != null ? `${reviewsQuery.data.ratingAverage.toFixed(1)} · ${reviewsQuery.data.reviewCount} review${reviewsQuery.data.reviewCount === 1 ? '' : 's'}` : 'No guest ratings yet'} icon="star" />
          <Fact label="SAMPLE PRICE" value={hotel.priceLabel} icon="credit-card" />
          {detail.checkInTime ? <Fact label="CHECK IN" value={detail.checkInTime} icon="clock" /> : null}
          {detail.checkOutTime ? <Fact label="CHECK OUT" value={detail.checkOutTime} icon="clock" /> : null}
        </View>
        {detail.address || hotel.coordinates ? <View style={[styles.addressRow, { borderColor: colors.border }]}><Feather name="map-pin" size={16} color={colors.primary} /><Text style={[styles.address, { color: colors.mutedForeground }]}>{detail.address || hotel.location}</Text>{hotel.coordinates ? <Pressable testID="hotel-open-map" accessibilityRole="button" accessibilityLabel="Open hotel on map" onPress={openMap}><Text style={[styles.mapText, { color: colors.primary }]}>Map</Text></Pressable> : null}</View> : null}
        <Text style={[styles.sectionKicker, { color: colors.primary }]}>CHECK A STAY</Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Plan the shape of your stay.</Text>
        <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>Choose a future stay window to view clearly labeled development room availability. No booking is created here.</Text>
        <DateGuestControls selection={selection} onChange={setSelection} onPrepare={openAvailability} />
        {hotel.amenities.length ? <><Text style={[styles.sectionKicker, { color: colors.primary }]}>WHAT IS CATALOGUED</Text><View style={styles.amenities}>{hotel.amenities.map((amenity) => <View key={amenity} style={[styles.amenity, { backgroundColor: colors.secondary }]}><Feather name="check" size={13} color={colors.primary} /><Text style={[styles.amenityText, { color: colors.secondaryForeground }]}>{amenity}</Text></View>)}</View></> : null}
         <Text style={[styles.sectionKicker, { color: colors.primary }]}>ROOM NOTES</Text>
         {roomsQuery.isLoading ? <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>Loading room notes…</Text> : roomsQuery.data?.items.length ? <><Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{roomsQuery.data.notice}</Text>{roomsQuery.data.items.map((room) => <RoomRow key={room.id} room={room} />)}</> : <NoticeBanner>{roomsQuery.data?.notice ?? 'No room data is catalogued for this hotel yet.'}</NoticeBanner>}
        {roomsQuery.isError ? <NoticeBanner error onRetry={() => void roomsQuery.refetch()}>Room notes could not be loaded. The hotel page is still available.</NoticeBanner> : null}
         <Text style={[styles.sectionKicker, { color: colors.primary }]}>GUEST REVIEWS</Text>
         {reviewsQuery.isLoading ? <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>Loading verified traveller reviews…</Text> : reviewsQuery.data?.items.length ? reviewsQuery.data.items.slice(0, 3).map((review) => <View key={review.id} style={[styles.review, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.reviewHead}><Text style={[styles.reviewAuthor, { color: colors.foreground }]}>{review.authorName}</Text><View style={styles.stars}>{Array.from({ length: 5 }, (_, index) => <Feather key={index} name="star" size={13} color={index < review.rating ? '#EAB308' : colors.border} fill={index < review.rating ? '#EAB308' : 'transparent'} />)}</View></View>{review.title ? <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{review.title}</Text> : null}{review.body ? <Text style={[styles.reviewBody, { color: colors.mutedForeground }]}>{review.body}</Text> : null}</View>) : <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>No verified traveller reviews are published for this hotel yet.</Text>}
         {reviewsQuery.isError ? <NoticeBanner error onRetry={() => void reviewsQuery.refetch()}>Guest reviews could not be loaded.</NoticeBanner> : null}
         <Text style={[styles.sectionKicker, { color: colors.primary }]}>NEARBY, IN THE CATALOG</Text>
         {nearbyQuery.isLoading ? <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>Loading nearby catalog places…</Text> : nearbyQuery.data?.items.length ? <><Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{nearbyQuery.data.notice}</Text>{nearbyQuery.data.items.map((place) => <NearbyRow key={place.id} place={place} onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id, title: place.name, location: place.location, category: place.category, summary: place.summary, imageKey: place.imageKey, destinationId: place.destinationId } } as any)} />)}</> : <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>No nearby catalog places are linked yet.</Text>}
        {nearbyQuery.isError ? <NoticeBanner error onRetry={() => void nearbyQuery.refetch()}>Nearby catalog places could not be loaded.</NoticeBanner> : null}
      </ScrollView>
    </View>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon: string }) {
  const colors = useColors();
  return <View style={[styles.fact, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={16} color={colors.primary} /><Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.factValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text></View>;
}

function HotelLoading() {
  const colors = useColors();
  return <View testID="hotel-detail-loading" style={[styles.loading, { backgroundColor: colors.background }]}><HotelHeader onBack={() => router.back()} /><View style={[styles.loadingHero, { backgroundColor: colors.secondary }]} /><View style={styles.loadingCopy}><View style={[styles.loadingLine, { backgroundColor: colors.secondary, width: '38%' }]} /><View style={[styles.loadingLine, { backgroundColor: colors.secondary, width: '78%', height: 27 }]} /><View style={[styles.loadingLine, { backgroundColor: colors.secondary, width: '62%' }]} /><View style={[styles.loadingBlock, { backgroundColor: colors.secondary }]} /></View></View>;
}

function HotelError({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return <View testID="hotel-detail-error" style={[styles.error, { backgroundColor: colors.background }]}><Feather name="alert-circle" size={28} color={colors.destructive} /><Text style={[styles.errorTitle, { color: colors.foreground }]}>This hotel could not be opened.</Text><Text style={[styles.errorBody, { color: colors.mutedForeground }]}>The catalog may be resting. Try once more before heading elsewhere.</Text><Pressable testID="hotel-detail-retry" accessibilityRole="button" accessibilityLabel="Retry hotel details" onPress={onRetry} style={[styles.retry, { backgroundColor: colors.primary }]}><Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: { height: 354, position: 'relative', overflow: 'hidden' },
  heroImage: { width: 390, height: 354 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,42,36,0.3)' },
  heroHeader: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 22 },
  heroTitle: { fontSize: 29, lineHeight: 33, fontWeight: '700', letterSpacing: -0.8, marginTop: 11 },
  heroLocation: { fontSize: 12, marginTop: 6 },
  shareMessage: { borderWidth: 1, margin: 14, marginBottom: 2, borderRadius: 13, minHeight: 41, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareMessageText: { flex: 1, fontSize: 11, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 23, paddingHorizontal: 18, marginTop: 16 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, marginTop: 17 },
  fact: { width: '47.8%', minHeight: 82, borderWidth: 1, borderRadius: 16, padding: 12 },
  factLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.9, marginTop: 10 },
  factValue: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  addressRow: { marginHorizontal: 18, marginTop: 10, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  address: { flex: 1, fontSize: 11, lineHeight: 16 },
  mapText: { fontSize: 11, fontWeight: '800' },
  sectionKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginTop: 27, marginHorizontal: 18 },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginHorizontal: 18, marginTop: 6 },
  sectionBody: { fontSize: 12, lineHeight: 18, marginHorizontal: 18, marginTop: 6, marginBottom: 10 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, marginTop: 4 },
  amenity: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  amenityText: { fontSize: 11, fontWeight: '700' },
  review: { borderWidth: 1, borderRadius: 16, padding: 13, marginHorizontal: 18, marginBottom: 9 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: 12, fontWeight: '800' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewTitle: { fontSize: 13, fontWeight: '700', marginTop: 9 },
  reviewBody: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  demoBadge: { paddingHorizontal: 18, marginTop: 10 },
  loading: { flex: 1 },
  loadingHero: { height: 354 },
  loadingCopy: { padding: 20 },
  loadingLine: { height: 13, borderRadius: 7, marginBottom: 12 },
  loadingBlock: { height: 100, borderRadius: 18, marginTop: 12 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 15 },
  errorBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  retry: { minHeight: 48, paddingHorizontal: 22, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  retryText: { fontSize: 12, fontWeight: '800' },
});