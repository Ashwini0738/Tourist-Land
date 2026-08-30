import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useListVendorBookings, type VendorBooking } from '@workspace/api-client-react';
import { Badge, Panel, SectionTitle, State, VendorPage } from '@/features/vendor/VendorUI';
import { useColors } from '@/hooks/useColors';

export default function VendorBookingsScreen() {
  const colors = useColors();
  const query = useListVendorBookings({ page: 1, limit: 50 });
  const items = query.data?.items ?? [];
  return (
    <VendorPage title="Bookings for your hotels." eyebrow="GUEST OPERATIONS">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Only bookings tied to your owned hotels appear here. Payment and booking state remain server-controlled.</Text>
      <SectionTitle>BOOKINGS · {items.length}</SectionTitle>
      {query.isLoading ? <State title="Loading bookings…" description="Fetching your latest guest stays." /> :
        query.isError ? <State title="Bookings unavailable" description="We could not load your vendor bookings." retry={() => query.refetch()} /> :
        !items.length ? <State title="No bookings yet" description="Confirmed and payment-pending stays for your hotels will appear here." /> :
        items.map((booking) => <BookingCard key={booking.reference} booking={booking} />)}
    </VendorPage>
  );
}

function BookingCard({ booking }: { booking: VendorBooking }) {
  const colors = useColors();
  return <Panel>
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reference, { color: colors.foreground }]}>{booking.reference}</Text>
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>{booking.hotel.name}</Text>
      </View>
      <Badge label={booking.status === 'pending_payment' ? 'Payment pending' : booking.status} tone={booking.status === 'confirmed' ? 'good' : booking.status === 'cancelled' ? 'bad' : 'warn'} />
    </View>
    <Text style={[styles.detail, { color: colors.foreground }]}>{booking.startsOn} → {booking.endsOn} · {booking.roomCount} room{booking.roomCount === 1 ? '' : 's'}</Text>
    <Text style={[styles.muted, { color: colors.mutedForeground }]}>Guest: {booking.guest.name} · {booking.guest.email}</Text>
    <Text style={[styles.amount, { color: colors.foreground }]}>₹{booking.total.toLocaleString()} {booking.currency}</Text>
  </Panel>;
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reference: { fontSize: 16, fontWeight: '700' },
  detail: { fontSize: 14, marginTop: 14, lineHeight: 20 },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  amount: { fontSize: 16, fontWeight: '700', marginTop: 14 },
});
