import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getGetHotelAvailabilityQueryKey,
  getGetHotelQueryKey,
  useGetHotel,
  useGetHotelAvailability,
} from '@workspace/api-client-react';
import type { GetHotelAvailabilityParams, HotelAvailabilityRoom } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import {
  DateGuestControls,
  HotelHeader,
  HotelSearchSelection,
  ImageWithFallback,
  NoticeBanner,
  SourceBadge,
  formatDateRange,
} from '@/features/hotels/HotelUI';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isUsableDateRange(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return false;
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
}

export default function HotelAvailabilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    hotelId?: string | string[];
    hotelName?: string | string[];
    location?: string | string[];
    checkIn?: string | string[];
    checkOut?: string | string[];
    adults?: string | string[];
    children?: string | string[];
    rooms?: string | string[];
  }>();
  const hotelId = firstParam(params.hotelId) ?? '';
  const [selection, setSelection] = useState<HotelSearchSelection>(() => ({
    checkIn: firstParam(params.checkIn) || undefined,
    checkOut: firstParam(params.checkOut) || undefined,
    adults: Number(firstParam(params.adults)) || 1,
    children: Number(firstParam(params.children)) || 0,
    rooms: Number(firstParam(params.rooms)) || 1,
  }));
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const hotelQuery = useGetHotel(hotelId, {
    query: { queryKey: getGetHotelQueryKey(hotelId), enabled: Boolean(hotelId), staleTime: 60_000, retry: 1 },
  });
  const requestParams = useMemo<GetHotelAvailabilityParams>(() => ({
    checkIn: selection.checkIn ?? '',
    checkOut: selection.checkOut ?? '',
    adults: selection.adults,
    children: selection.children,
    rooms: selection.rooms,
  }), [selection]);
  const requestReady = isUsableDateRange(selection.checkIn, selection.checkOut);
  const availabilityQuery = useGetHotelAvailability(hotelId, requestParams, {
    query: {
      queryKey: getGetHotelAvailabilityQueryKey(hotelId, requestParams),
      enabled: Boolean(hotelId) && requestReady,
      staleTime: 30_000,
      retry: 1,
    },
  });
  const hotel = hotelQuery.data?.hotel;
  const hotelName = hotel?.name ?? firstParam(params.hotelName) ?? 'Selected hotel';
  const location = hotel?.location ?? firstParam(params.location) ?? 'Selected place';
  const items = availabilityQuery.data?.items ?? [];
  const selectedRoomCount = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const selectedSubtotal = items.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.roomTotal, 0);
  const displayTotal = selectedRoomCount ? selectedSubtotal : availabilityQuery.data?.total ?? 0;

  useEffect(() => {
    setQuantities({});
    setFormMessage(null);
  }, [requestParams.checkIn, requestParams.checkOut, requestParams.adults, requestParams.children, requestParams.rooms]);

  const updateQuantity = (room: HotelAvailabilityRoom, delta: number) => {
    setQuantities((current) => {
      const currentValue = current[room.id] ?? 0;
      const nextValue = Math.max(0, Math.min(room.availableUnits, selection.rooms, currentValue + delta));
      const otherRooms = Object.entries(current).reduce((sum, [id, value]) => id === room.id ? sum : sum + value, 0);
      const cappedValue = delta > 0 ? Math.min(nextValue, Math.max(currentValue, selection.rooms - otherRooms)) : nextValue;
      if (cappedValue === 0) {
        const next = { ...current };
        delete next[room.id];
        return next;
      }
      return { ...current, [room.id]: cappedValue };
    });
  };

  const runAvailability = () => {
    if (!requestReady) {
      setFormMessage('Choose a future check-in and check-out date before checking availability.');
      return;
    }
    setFormMessage(null);
    void availabilityQuery.refetch();
  };

  if (hotelQuery.isLoading && !hotelQuery.data) return <AvailabilityLoading />;
  if (hotelQuery.isError || !hotelQuery.data?.hotel) {
    return <AvailabilityError onRetry={() => void hotelQuery.refetch()} />;
  }

  return (
    <View testID="hotel-availability" style={[styles.screen, { backgroundColor: colors.background }]}>
      <HotelHeader onBack={() => router.back()} title="Availability" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 22 }]}>
        <View style={[styles.hotelSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ImageWithFallback imageKey={hotel?.imageKey} label={`${hotelName} image`} style={styles.hotelImage} />
          <View style={styles.hotelCopy}>
            <SourceBadge label={hotel?.sourceLabel ?? 'Catalog stay'} source={hotel?.source} />
            <Text style={[styles.hotelName, { color: colors.foreground }]} numberOfLines={2}>{hotelName}</Text>
            <Text style={[styles.location, { color: colors.mutedForeground }]}><Feather name="map-pin" size={12} color={colors.mutedForeground} /> {location}</Text>
          </View>
        </View>

        <Text style={[styles.kicker, { color: colors.primary }]}>STAY REQUEST</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Find the right room.</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Set your dates and travellers, then choose room quantities. Nothing here creates a booking.</Text>
        <DateGuestControls
          selection={selection}
          onChange={(next) => { setSelection(next); setFormMessage(null); }}
          onPrepare={runAvailability}
        />
        <View style={[styles.requestPill, { backgroundColor: colors.secondary }]}>
          <Feather name="calendar" size={14} color={colors.primary} />
          <Text style={[styles.requestPillText, { color: colors.secondaryForeground }]}>{formatDateRange(selection)} · {selection.adults} adult{selection.adults === 1 ? '' : 's'} · {selection.rooms} room{selection.rooms === 1 ? '' : 's'}</Text>
        </View>
        {formMessage ? <NoticeBanner error>{formMessage}</NoticeBanner> : null}

        {!requestReady ? (
          <View testID="availability-initial" style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}><Feather name="calendar" size={23} color={colors.primary} /></View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Choose dates to begin.</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>Availability is checked only after a future stay window is provided.</Text>
          </View>
        ) : availabilityQuery.isLoading && !availabilityQuery.data ? (
          <View testID="availability-loading" style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}><Feather name="search" size={23} color={colors.primary} /></View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Checking room options…</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>The server is checking the development inventory for this request.</Text>
          </View>
        ) : availabilityQuery.isError ? (
          <NoticeBanner error onRetry={() => void availabilityQuery.refetch()}>Availability could not be checked right now. Your request is still safe to retry.</NoticeBanner>
        ) : availabilityQuery.data?.status === 'available' ? (
          <>
            <NoticeBanner>{availabilityQuery.data.sourceNotice}</NoticeBanner>
            <View style={styles.resultsHeading}>
              <View><Text style={[styles.sectionKicker, { color: colors.primary }]}>ROOM OPTIONS</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{items.length} room type{items.length === 1 ? '' : 's'}</Text></View>
              <Text style={[styles.resultsMeta, { color: colors.mutedForeground }]}>{selectedRoomCount}/{selection.rooms} selected</Text>
            </View>
            {items.map((room) => <AvailabilityRoomCard key={room.id} room={room} quantity={quantities[room.id] ?? 0} canAdd={selectedRoomCount < selection.rooms} onChange={(delta) => updateQuantity(room, delta)} />)}
            <PricingSummary
              currency={availabilityQuery.data.currency}
              nights={availabilityQuery.data.nights}
              selectedRoomCount={selectedRoomCount}
              requestedRooms={selection.rooms}
              total={displayTotal}
              serverEstimate={availabilityQuery.data.total}
            />
          </>
        ) : (
          <View testID="availability-empty" style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}><Feather name="home" size={23} color={colors.primary} /></View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>{availabilityQuery.data?.status === 'unavailable' ? 'No inventory provider is connected.' : 'No rooms match this request.'}</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>{availabilityQuery.data?.notice ?? 'Try a different date range, traveller count, or room count.'}</Text>
            <Pressable testID="availability-empty-retry" accessibilityRole="button" accessibilityLabel="Try availability again" onPress={runAvailability} style={[styles.stateButton, { backgroundColor: colors.primary }]}><Text style={[styles.stateButtonText, { color: colors.primaryForeground }]}>Try again</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AvailabilityRoomCard({ room, quantity, canAdd, onChange }: { room: HotelAvailabilityRoom; quantity: number; canAdd: boolean; onChange: (delta: number) => void }) {
  const colors = useColors();
  return (
    <View testID={`availability-room-${room.id}`} style={[styles.roomCard, { backgroundColor: colors.card, borderColor: quantity ? colors.primary : colors.border }]}>
      <View style={styles.roomCardTop}>
        <ImageWithFallback imageKey={room.imageKey} label={`${room.name} image`} style={styles.roomImage} />
        <View style={styles.roomCopy}>
          <Text style={[styles.roomName, { color: colors.foreground }]}>{room.name}</Text>
          <Text style={[styles.roomMeta, { color: colors.mutedForeground }]}>{room.bedType} · Sleeps {room.capacity}</Text>
          <Text style={[styles.roomAvailability, { color: colors.primary }]}>{room.availableUnits} available</Text>
        </View>
        <Text style={[styles.roomRate, { color: colors.primary }]}>{room.currency} {room.nightlyRate.toLocaleString()}<Text style={[styles.roomRateSuffix, { color: colors.mutedForeground }]}> / night</Text></Text>
      </View>
      <View style={[styles.roomFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.roomTotal, { color: colors.foreground }]}>{room.currency} {room.roomTotal.toLocaleString()}<Text style={[styles.roomTotalSuffix, { color: colors.mutedForeground }]}> / room total</Text></Text>
        <View style={styles.counter}>
          <Pressable testID={`availability-room-${room.id}-minus`} accessibilityRole="button" accessibilityLabel={`Remove ${room.name}`} disabled={!quantity} onPress={() => onChange(-1)} style={[styles.counterButton, { borderColor: colors.border, opacity: quantity ? 1 : 0.35 }]}><Feather name="minus" size={15} color={colors.primary} /></Pressable>
          <Text testID={`availability-room-${room.id}-quantity`} style={[styles.counterValue, { color: colors.foreground }]}>{quantity}</Text>
          <Pressable testID={`availability-room-${room.id}-plus`} accessibilityRole="button" accessibilityLabel={`Add ${room.name}`} disabled={!canAdd || quantity >= room.availableUnits} onPress={() => onChange(1)} style={[styles.counterButton, { borderColor: colors.border, opacity: canAdd && quantity < room.availableUnits ? 1 : 0.35 }]}><Feather name="plus" size={15} color={colors.primary} /></Pressable>
        </View>
      </View>
    </View>
  );
}

function PricingSummary({ currency, nights, selectedRoomCount, requestedRooms, total, serverEstimate }: { currency: string; nights: number; selectedRoomCount: number; requestedRooms: number; total: number; serverEstimate: number }) {
  const colors = useColors();
  const isEstimate = !selectedRoomCount;
  return (
    <View testID="availability-pricing-summary" style={[styles.summary, { backgroundColor: colors.primary }]}>
      <View style={styles.summaryTop}><View><Text style={[styles.summaryKicker, { color: colors.primaryForeground }]}>STAY ESTIMATE</Text><Text style={[styles.summaryTitle, { color: colors.primaryForeground }]}>{isEstimate ? 'Starting from' : 'Selected rooms'}</Text></View><Text style={[styles.summaryTotal, { color: colors.primaryForeground }]}>{currency} {(isEstimate ? serverEstimate : total).toLocaleString()}</Text></View>
      <Text style={[styles.summaryMeta, { color: colors.primaryForeground }]}>{nights} night{nights === 1 ? '' : 's'} · {selectedRoomCount || requestedRooms} room{(selectedRoomCount || requestedRooms) === 1 ? '' : 's'}</Text>
      <Text style={[styles.summaryNote, { color: colors.primaryForeground }]}>Server-calculated sample room totals. Taxes, fees, discounts, and booking are not configured.</Text>
    </View>
  );
}

function AvailabilityLoading() {
  const colors = useColors();
  return <View testID="hotel-availability-loading" style={[styles.loading, { backgroundColor: colors.background }]}><HotelHeader onBack={() => router.back()} title="Availability" /><View style={[styles.loadingHero, { backgroundColor: colors.secondary }]} /><View style={styles.loadingCopy}><View style={[styles.loadingLine, { backgroundColor: colors.secondary, width: '42%' }]} /><View style={[styles.loadingLine, { backgroundColor: colors.secondary, width: '75%', height: 25 }]} /><View style={[styles.loadingLine, { backgroundColor: colors.secondary, width: '62%' }]} /></View></View>;
}

function AvailabilityError({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return <View testID="hotel-availability-error" style={[styles.error, { backgroundColor: colors.background }]}><Feather name="alert-circle" size={28} color={colors.destructive} /><Text style={[styles.errorTitle, { color: colors.foreground }]}>This hotel could not be loaded.</Text><Text style={[styles.errorBody, { color: colors.mutedForeground }]}>The catalog may be resting. Try again before checking rooms.</Text><Pressable testID="hotel-availability-hotel-retry" accessibilityRole="button" accessibilityLabel="Retry hotel availability page" onPress={onRetry} style={[styles.retry, { backgroundColor: colors.primary }]}><Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  hotelSummary: { borderWidth: 1, borderRadius: 19, padding: 10, flexDirection: 'row', alignItems: 'center' },
  hotelImage: { width: 86, height: 86, borderRadius: 13 },
  hotelCopy: { flex: 1, marginLeft: 12 },
  hotelName: { fontSize: 18, lineHeight: 22, fontWeight: '700', marginTop: 8 },
  location: { fontSize: 11, marginTop: 5 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 23 },
  title: { fontSize: 29, lineHeight: 34, letterSpacing: -0.8, fontWeight: '700', marginTop: 6 },
  body: { fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 5 },
  requestPill: { minHeight: 38, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  requestPillText: { flex: 1, fontSize: 11, fontWeight: '700' },
  stateCard: { borderWidth: 1, borderRadius: 20, alignItems: 'center', padding: 24, marginTop: 17 },
  stateIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 13 },
  stateBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 305 },
  stateButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  stateButtonText: { fontSize: 12, fontWeight: '800' },
  resultsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, marginBottom: 10 },
  sectionKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  sectionTitle: { fontSize: 21, fontWeight: '700', marginTop: 4 },
  resultsMeta: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  roomCard: { borderWidth: 1, borderRadius: 18, padding: 11, marginBottom: 10 },
  roomCardTop: { flexDirection: 'row', alignItems: 'center' },
  roomImage: { width: 76, height: 76, borderRadius: 12 },
  roomCopy: { flex: 1, marginLeft: 11 },
  roomName: { fontSize: 15, fontWeight: '700' },
  roomMeta: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  roomAvailability: { fontSize: 10, fontWeight: '800', marginTop: 5 },
  roomRate: { fontSize: 12, fontWeight: '800', marginLeft: 5, alignSelf: 'flex-start' },
  roomRateSuffix: { fontSize: 9, fontWeight: '400' },
  roomFooter: { borderTopWidth: 1, marginTop: 11, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomTotal: { fontSize: 12, fontWeight: '800' },
  roomTotalSuffix: { fontSize: 10, fontWeight: '400' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterButton: { width: 31, height: 31, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  counterValue: { width: 18, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  summary: { borderRadius: 19, padding: 16, marginTop: 4 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryKicker: { fontSize: 8, fontWeight: '800', letterSpacing: 1.3, opacity: 0.8 },
  summaryTitle: { fontSize: 18, fontWeight: '700', marginTop: 5 },
  summaryTotal: { fontSize: 19, fontWeight: '800' },
  summaryMeta: { fontSize: 11, fontWeight: '700', marginTop: 7 },
  summaryNote: { fontSize: 10, lineHeight: 15, marginTop: 10, opacity: 0.82 },
  loading: { flex: 1 },
  loadingHero: { height: 100, margin: 18, borderRadius: 19 },
  loadingCopy: { padding: 18 },
  loadingLine: { height: 13, borderRadius: 7, marginBottom: 12 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 15 },
  errorBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  retry: { minHeight: 48, paddingHorizontal: 22, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  retryText: { fontSize: 12, fontWeight: '800' },
});