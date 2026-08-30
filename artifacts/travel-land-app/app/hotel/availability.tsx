import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGetHotelQueryKey, useGetHotel } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { HotelHeader, ImageWithFallback, NoticeBanner, formatDate } from '@/features/hotels/HotelUI';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function HotelAvailabilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ hotelId?: string | string[]; hotelName?: string | string[]; location?: string | string[]; checkIn?: string | string[]; checkOut?: string | string[]; adults?: string | string[]; children?: string | string[]; rooms?: string | string[] }>();
  const hotelId = firstParam(params.hotelId) ?? '';
  const hotelQuery = useGetHotel(hotelId, { query: { queryKey: getGetHotelQueryKey(hotelId), enabled: Boolean(hotelId), staleTime: 60_000, retry: 1 } });
  const hotel = hotelQuery.data?.hotel;
  const hotelName = hotel?.name ?? firstParam(params.hotelName) ?? 'Selected hotel';
  const location = hotel?.location ?? firstParam(params.location) ?? 'Selected place';
  const checkIn = firstParam(params.checkIn);
  const checkOut = firstParam(params.checkOut);
  const adults = Number(firstParam(params.adults) ?? 1);
  const children = Number(firstParam(params.children) ?? 0);
  const rooms = Number(firstParam(params.rooms) ?? 1);

  return (
    <View testID="hotel-availability" style={[styles.screen, { backgroundColor: colors.background }]}>
      <HotelHeader onBack={() => router.back()} title="Availability request" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }]}>
        {hotel ? <ImageWithFallback imageKey={hotel.imageKey} label={`${hotel.name} image`} style={styles.image} /> : null}
        <Text style={[styles.kicker, { color: colors.primary }]}>PREPARATION ONLY</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Your request is ready to review.</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Travel & Land is a discovery catalog. Live hotel availability, reservations, payments, and booking confirmation are not implemented here.</Text>
        <NoticeBanner>This page does not contact a booking provider or invent room availability.</NoticeBanner>
        <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardKicker, { color: colors.primary }]}>SELECTED REQUEST</Text>
          <Text style={[styles.hotelName, { color: colors.foreground }]}>{hotelName}</Text>
          <Text style={[styles.location, { color: colors.mutedForeground }]}><Feather name="map-pin" size={13} color={colors.mutedForeground} /> {location}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <RequestRow icon="calendar" label="Dates" value={checkIn && checkOut ? `${formatDate(checkIn)} – ${formatDate(checkOut)}` : 'Dates not selected'} />
          <RequestRow icon="user" label="Travellers" value={`${Number.isFinite(adults) ? adults : 1} adult${adults === 1 ? '' : 's'}${children > 0 ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''}`} />
          <RequestRow icon="home" label="Rooms" value={`${Number.isFinite(rooms) ? rooms : 1} room${rooms === 1 ? '' : 's'}`} />
        </View>
        {hotelQuery.isError ? <NoticeBanner error onRetry={() => void hotelQuery.refetch()}>The selected hotel could not be refreshed. Your request details are still shown.</NoticeBanner> : null}
        <Pressable testID="availability-back-to-hotel" accessibilityRole="button" accessibilityLabel="Return to hotel details" onPress={() => hotelId ? router.replace(`/hotel/${hotelId}`) : router.back()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Feather name="arrow-left" size={16} color={colors.primaryForeground} /><Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Return to hotel details</Text></Pressable>
        <Pressable testID="availability-back-to-hotels" accessibilityRole="button" accessibilityLabel="Return to hotel discovery" onPress={() => router.replace('/hotels')} style={styles.secondaryButton}><Text style={[styles.secondaryText, { color: colors.primary }]}>Keep exploring stays</Text></Pressable>
      </ScrollView>
    </View>
  );
}

function RequestRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.requestRow}><View style={[styles.requestIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={15} color={colors.primary} /></View><View style={styles.requestCopy}><Text style={[styles.requestLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.requestValue, { color: colors.foreground }]}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 10 },
  image: { width: '100%', height: 172, borderRadius: 21, marginBottom: 22 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 29, lineHeight: 34, letterSpacing: -0.8, fontWeight: '700', marginTop: 7 },
  body: { fontSize: 13, lineHeight: 20, marginTop: 10, marginBottom: 17 },
  requestCard: { borderWidth: 1, borderRadius: 21, padding: 16, marginTop: 2 },
  cardKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  hotelName: { fontSize: 19, fontWeight: '700', marginTop: 9 },
  location: { fontSize: 11, marginTop: 5 },
  divider: { height: 1, marginVertical: 14 },
  requestRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  requestIcon: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  requestCopy: { marginLeft: 10 },
  requestLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  requestValue: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  primaryButton: { minHeight: 51, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 17 },
  primaryText: { fontSize: 12, fontWeight: '800' },
  secondaryButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { fontSize: 12, fontWeight: '800' },
});