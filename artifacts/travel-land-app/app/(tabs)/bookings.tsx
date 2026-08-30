import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { NoticeBanner } from '@/features/hotels/HotelUI';
import { useColors } from '@/hooks/useColors';
import { getListBookingsQueryKey, useListBookings, type Booking } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = ['Upcoming', 'Past', 'Cancelled'] as const;
type Tab = typeof tabs[number];

function dateValue(value: string): Date {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function isPast(booking: Booking) {
  return dateValue(booking.endsOn) < new Date();
}

function formatDate(value: string) {
  return dateValue(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(booking: Booking) {
  return `${booking.currency} ${booking.total.toLocaleString()}`;
}

export default function BookingsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<Tab>('Upcoming');
  const query = useListBookings({ query: { queryKey: getListBookingsQueryKey(), staleTime: 10_000, retry: 1 } });
  const items = query.data?.items ?? [];
  const filtered = items.filter((booking) => {
    if (activeTab === 'Cancelled') return booking.status === 'cancelled';
    if (activeTab === 'Past') return booking.status !== 'cancelled' && isPast(booking);
    return booking.status !== 'cancelled' && !isPast(booking);
  });

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}>
      <Text style={[styles.kicker, { color: colors.primary }]}>YOUR TRIPS</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>My bookings.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Only bookings on your authenticated Travel & Land account appear here.</Text>
      <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {tabs.map((tab) => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.segmentButton, activeTab === tab && { backgroundColor: colors.primary }]}><Text style={[styles.segmentText, { color: activeTab === tab ? colors.primaryForeground : colors.mutedForeground }]}>{tab}</Text></Pressable>)}
      </View>
      {query.isLoading && !query.data ? <View testID="bookings-loading" style={[styles.state, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading your bookings…</Text></View> : query.isError ? <NoticeBanner error onRetry={() => void query.refetch()}>Your bookings could not be loaded right now. Try again when your account session is ready.</NoticeBanner> : filtered.length ? filtered.map((booking) => <BookingCard key={booking.reference} booking={booking} onPress={() => router.push({ pathname: '/booking/[reference]', params: { reference: booking.reference } })} />) : <EmptyBookings tab={activeTab} />}
      <Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.browseButton, { borderColor: colors.border }]}><Feather name="search" size={16} color={colors.primary} /><Text style={[styles.browseText, { color: colors.primary }]}>Find your next stay</Text></Pressable>
    </ScrollView>
  );
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const colors = useColors();
  const paymentLabel = booking.status === 'cancelled'
    ? 'CANCELLED'
    : booking.paymentStatus === 'paid'
      ? 'PAID'
      : booking.paymentStatus === 'processing'
        ? 'PAYMENT PROCESSING'
        : booking.paymentStatus === 'failed'
          ? 'PAYMENT FAILED'
          : booking.paymentStatus === 'cancelled'
            ? 'CHECKOUT CANCELLED'
            : 'PAYMENT PENDING';
  return <Pressable testID={`booking-card-${booking.reference}`} onPress={onPress} style={[styles.booking, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[styles.date, { backgroundColor: colors.secondary }]}><Text style={[styles.month, { color: colors.primary }]}>{dateValue(booking.startsOn).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text><Text style={[styles.day, { color: colors.foreground }]}>{dateValue(booking.startsOn).getDate()}</Text></View>
    <View style={styles.bookingCopy}><View style={styles.bookingTop}><Text style={[styles.bookingName, { color: colors.foreground }]} numberOfLines={1}>{booking.hotel.name}</Text><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></View><Text style={[styles.bookingLocation, { color: colors.mutedForeground }]}>{booking.hotel.location} · {booking.nights} night{booking.nights === 1 ? '' : 's'}</Text><Text style={[styles.bookingDates, { color: colors.mutedForeground }]}>{formatDate(booking.startsOn)} – {formatDate(booking.endsOn)}</Text><View style={styles.bookingBottom}><Text style={[styles.status, { color: booking.status === 'cancelled' ? colors.destructive : booking.paymentStatus === 'failed' ? colors.destructive : booking.paymentStatus === 'paid' ? colors.primary : colors.foreground }]}>{paymentLabel}</Text><Text style={[styles.bookingPrice, { color: colors.foreground }]}>{formatMoney(booking)}</Text></View></View>
  </Pressable>;
}

function EmptyBookings({ tab }: { tab: Tab }) {
  const colors = useColors();
  return <View testID={`bookings-empty-${tab.toLowerCase()}`} style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name={tab === 'Past' ? 'clock' : tab === 'Cancelled' ? 'x-circle' : 'calendar'} size={24} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No {tab.toLowerCase()} trips</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{tab === 'Upcoming' ? 'Choose a catalog stay to create a payment-pending booking request.' : `Your ${tab.toLowerCase()} bookings will appear here.`}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 24 },
  segment: { borderWidth: 1, borderRadius: 14, padding: 4, flexDirection: 'row', marginBottom: 16 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segmentText: { fontSize: 11, fontWeight: '700' },
  booking: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', marginBottom: 11 },
  date: { width: 58, height: 78, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  month: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  day: { fontSize: 25, fontWeight: '700', marginTop: 3 },
  bookingCopy: { flex: 1, marginLeft: 13 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingName: { fontSize: 15, fontWeight: '700', flex: 1 },
  bookingLocation: { fontSize: 12, marginTop: 5 },
  bookingDates: { fontSize: 11, marginTop: 4 },
  bookingBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 },
  status: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  bookingPrice: { fontSize: 13, fontWeight: '700' },
  state: { borderWidth: 1, borderRadius: 20, alignItems: 'center', padding: 30 },
  stateText: { fontSize: 13, marginTop: 10 },
  empty: { borderWidth: 1, borderRadius: 20, alignItems: 'center', padding: 30 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  emptyText: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  browseButton: { borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 15 },
  browseText: { fontSize: 13, fontWeight: '700' },
});