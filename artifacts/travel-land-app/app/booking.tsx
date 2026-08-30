import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { NoticeBanner, ImageWithFallback, formatDateRange, type HotelSearchSelection } from '@/features/hotels/HotelUI';
import { useColors } from '@/hooks/useColors';
import { useRole } from '@/context/RoleContext';
import { createBooking, getGetHotelAvailabilityQueryKey, getListBookingsQueryKey, useGetHotelAvailability, type GetHotelAvailabilityParams } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RoomSelection = { roomId: string; quantity: number };

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function dateOnly(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseItems(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is RoomSelection => Boolean(item && typeof item.roomId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0))
      : [];
  } catch {
    return [];
  }
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message || 'We could not create this booking. Nothing was charged. Please try again.';
}

export default function BookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser } = useRole();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    hotelId?: string | string[];
    hotelName?: string | string[];
    location?: string | string[];
    checkIn?: string | string[];
    checkOut?: string | string[];
    adults?: string | string[];
    children?: string | string[];
    rooms?: string | string[];
    items?: string | string[];
  }>();
  const selection: HotelSearchSelection = {
    checkIn: dateOnly(firstParam(params.checkIn)),
    checkOut: dateOnly(firstParam(params.checkOut)),
    adults: Number(firstParam(params.adults)) || 1,
    children: Number(firstParam(params.children)) || 0,
    rooms: Number(firstParam(params.rooms)) || 1,
  };
  const hotelId = firstParam(params.hotelId) ?? '';
  const hotelName = firstParam(params.hotelName) ?? 'Selected hotel';
  const location = firstParam(params.location) ?? 'Selected place';
  const items = React.useMemo(() => parseItems(firstParam(params.items)), [params.items]);
  const [name, setName] = React.useState(currentUser?.displayName ?? '');
  const [email, setEmail] = React.useState(currentUser?.email ?? '');
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [createdReference, setCreatedReference] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const idempotencyKey = React.useRef(`mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
  const availabilityParams = React.useMemo<GetHotelAvailabilityParams>(() => ({
    checkIn: selection.checkIn ?? '',
    checkOut: selection.checkOut ?? '',
    adults: selection.adults,
    children: selection.children,
    rooms: selection.rooms,
  }), [selection.adults, selection.children, selection.checkIn, selection.checkOut, selection.rooms]);
  const availabilityQuery = useGetHotelAvailability(hotelId, availabilityParams, {
    query: {
      queryKey: getGetHotelAvailabilityQueryKey(hotelId, availabilityParams),
      enabled: Boolean(hotelId && selection.checkIn && selection.checkOut && items.length),
      staleTime: 30_000,
      retry: 1,
    },
  });
  const selectedServerTotal = availabilityQuery.data?.items
    .filter((room) => items.some((item) => item.roomId === room.id))
    .reduce((sum, room) => sum + room.roomTotal * (items.find((item) => item.roomId === room.id)?.quantity ?? 0), 0) ?? 0;

  React.useEffect(() => {
    if (currentUser?.displayName && !name) setName(currentUser.displayName);
    if (currentUser?.email && !email) setEmail(currentUser.email);
  }, [currentUser?.displayName, currentUser?.email, name, email]);

  const submit = async () => {
    if (!hotelId || !selection.checkIn || !selection.checkOut || !items.length) {
      setError('This booking link is incomplete. Return to availability and choose your stay again.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Enter the guest name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid contact email.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await createBooking({
        hotelId,
        checkIn: selection.checkIn,
        checkOut: selection.checkOut,
        adults: selection.adults,
        children: selection.children,
        rooms: selection.rooms,
        items,
        guest: { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null },
      }, { headers: { 'Idempotency-Key': idempotencyKey.current } });
      await queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setCreatedReference(response.booking.reference);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  if (createdReference) {
    return (
      <View style={[styles.confirmation, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.confirmIcon, { backgroundColor: colors.secondary }]}><Feather name="check" size={32} color={colors.primary} /></View>
        <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Booking request saved.</Text>
        <Text style={[styles.confirmText, { color: colors.mutedForeground }]}>No payment was taken. This development booking remains pending payment and does not confirm a live supplier reservation.</Text>
        <View style={[styles.reference, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.referenceLabel, { color: colors.mutedForeground }]}>BOOKING REFERENCE</Text>
          <Text style={[styles.referenceValue, { color: colors.foreground }]}>{createdReference}</Text>
        </View>
        <Pressable testID="booking-view-bookings" onPress={() => router.replace('/(tabs)/bookings')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>View my bookings</Text></Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.textButton}><Text style={[styles.textButtonLabel, { color: colors.primary }]}>Back to home</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 34 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Guest details</Text><Pressable accessibilityRole="button" accessibilityLabel="Close booking" onPress={() => router.back()}><Feather name="x" size={20} color={colors.foreground} /></Pressable></View>
      <Text style={[styles.kicker, { color: colors.primary }]}>PAYMENT-PENDING BOOKING</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Review your stay.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>The server will recheck the room, dates, capacity, quantity, and price when you submit.</Text>

      <View style={[styles.hotelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ImageWithFallback imageKey={hotelId === '02' ? 'highlands' : 'coastline'} label={`${hotelName} image`} style={styles.hotelImage} />
        <View style={styles.hotelCopy}><Text style={[styles.hotelName, { color: colors.foreground }]}>{hotelName}</Text><Text style={[styles.hotelLocation, { color: colors.mutedForeground }]}>{location}</Text><Text style={[styles.hotelStay, { color: colors.primary }]}>{formatDateRange(selection)} · {selection.adults + selection.children} traveller{selection.adults + selection.children === 1 ? '' : 's'}</Text></View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Guest contact</Text>
      <TextInput testID="booking-guest-name" value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
      <TextInput testID="booking-guest-email" value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
      <TextInput testID="booking-guest-phone" value={phone} onChangeText={setPhone} placeholder="Phone (optional)" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Booking summary</Text>
      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SummaryRow label="Rooms selected" value={`${items.reduce((sum, item) => sum + item.quantity, 0)} room${items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}`} colors={colors} />
        <SummaryRow label="Travellers" value={`${selection.adults} adult${selection.adults === 1 ? '' : 's'} · ${selection.children} child${selection.children === 1 ? '' : 'ren'}`} colors={colors} />
        <SummaryRow label="Selected-room estimate" value={selectedServerTotal ? `INR ${selectedServerTotal.toLocaleString()}` : availabilityQuery.isLoading ? 'Checking…' : 'Rechecked on submit'} colors={colors} />
      </View>
      <NoticeBanner>{'Development provider only. No live inventory, payment gateway, confirmation email, or supplier reservation is connected.'}</NoticeBanner>
      {error ? <NoticeBanner error>{error}</NoticeBanner> : null}
      <Pressable testID="booking-submit" accessibilityRole="button" accessibilityLabel="Save booking request" disabled={submitting} onPress={() => void submit()} style={[styles.primaryButton, { backgroundColor: submitting ? colors.muted : colors.primary }]}>{submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Save booking request</Text>}</Pressable>
    </ScrollView>
  );
}

function SummaryRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  hotelCard: { borderWidth: 1, borderRadius: 18, padding: 11, flexDirection: 'row', marginBottom: 25 },
  hotelImage: { width: 82, height: 82, borderRadius: 13 },
  hotelCopy: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  hotelName: { fontSize: 16, fontWeight: '700' },
  hotelLocation: { fontSize: 11, marginTop: 5 },
  hotelStay: { fontSize: 11, fontWeight: '700', marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  input: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 14, marginBottom: 10 },
  summary: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 15 },
  primaryButton: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { fontSize: 14, fontWeight: '700' },
  confirmation: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  confirmIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7, textAlign: 'center', marginTop: 22 },
  confirmText: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 9 },
  reference: { borderWidth: 1, borderRadius: 16, padding: 15, width: '100%', alignItems: 'center', marginTop: 25 },
  referenceLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  referenceValue: { fontSize: 18, fontWeight: '700', marginTop: 7 },
  textButton: { padding: 15 },
  textButtonLabel: { fontSize: 13, fontWeight: '700' },
});