import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { ImageWithFallback, NoticeBanner } from '@/features/hotels/HotelUI';
import { useColors } from '@/hooks/useColors';
import { cancelBooking, createBookingCheckout, getGetBookingQueryKey, useGetBooking, verifyBookingPayment, type Booking, type BookingCheckoutResponse } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'The booking action could not be completed. Nothing was charged.';
}

type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

async function openRazorpayCheckout(order: BookingCheckoutResponse): Promise<RazorpayCheckoutSuccess> {
  try {
    const module = require('react-native-razorpay') as {
      default?: { open(options: Record<string, unknown>): Promise<RazorpayCheckoutSuccess> };
      open?: (options: Record<string, unknown>) => Promise<RazorpayCheckoutSuccess>;
    };
    const checkout = module.default ?? module;
    if (typeof checkout.open !== 'function') throw new Error('RAZORPAY_NATIVE_MODULE_UNAVAILABLE');
    return await checkout.open({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: '#2E6B4F' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('RAZORPAY_NATIVE_MODULE_UNAVAILABLE') ||
      message.includes('RazorpayCheckout') ||
      message.includes('native module')
    ) {
      throw new Error('Razorpay checkout requires the Travel & Land EAS development or preview build; it is not available in Expo Go.');
    }
    throw error;
  }
}

export default function BookingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ reference?: string | string[]; checkout?: string | string[] }>();
  const reference = firstParam(params.reference) ?? '';
  const checkoutResult = firstParam(params.checkout);
  const query = useGetBooking(reference, { query: { queryKey: getGetBookingQueryKey(reference), enabled: Boolean(reference), retry: 1 } });
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const current = booking ?? query.data?.booking;

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && reference) void query.refetch();
    });
    return () => subscription.remove();
  }, [query.refetch, reference]);

  React.useEffect(() => {
    if (query.data?.booking) setBooking(query.data.booking);
  }, [query.data?.booking]);

  const startCheckout = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await createBookingCheckout(reference, {
        headers: { 'Idempotency-Key': `mobile-checkout-${reference}-${Date.now()}` },
      });
      setBooking(response.booking);
      const result = await openRazorpayCheckout(response);
      const verified = await verifyBookingPayment(reference, result);
      setBooking(verified.booking);
      await queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(reference) });
    } catch (checkoutError) {
      setError(errorMessage(checkoutError));
    } finally {
      setPaying(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const response = await cancelBooking(reference);
      setBooking(response.booking);
      await queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(reference) });
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  };

  if (query.isLoading && !current) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.centerText, { color: colors.mutedForeground }]}>Loading booking…</Text></View>;
  if (query.isError || !current) return <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}><Feather name="alert-circle" size={28} color={colors.destructive} /><Text style={[styles.errorTitle, { color: colors.foreground }]}>Booking not found.</Text><Text style={[styles.centerText, { color: colors.mutedForeground }]}>This booking may not belong to your account or may no longer be available.</Text><Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Go back</Text></Pressable></View>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 34 }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Booking details</Text><View style={{ width: 21 }} /></View>
    <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}><ImageWithFallback imageKey={current.hotel.imageKey} label={`${current.hotel.name} image`} style={styles.heroImage} /><Text style={[styles.kicker, { color: colors.primary }]}>TRAVEL & LAND</Text><Text style={[styles.title, { color: colors.foreground }]}>{current.hotel.name}</Text><Text style={[styles.location, { color: colors.mutedForeground }]}>{current.hotel.location}</Text><View style={[styles.reference, { backgroundColor: colors.secondary }]}><Text style={[styles.referenceLabel, { color: colors.primary }]}>REFERENCE</Text><Text style={[styles.referenceValue, { color: colors.foreground }]}>{current.reference}</Text></View></View>
     <NoticeBanner>{current.sourceNotice}</NoticeBanner>
     {checkoutResult === 'cancel' ? <NoticeBanner>Checkout was cancelled. No payment was taken. You can try again whenever you are ready.</NoticeBanner> : null}
     <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}><InfoRow label="Stay" value={`${formatDate(current.startsOn)} – ${formatDate(current.endsOn)} · ${current.nights} night${current.nights === 1 ? '' : 's'}`} colors={colors} /><InfoRow label="Travellers" value={`${current.adults} adult${current.adults === 1 ? '' : 's'} · ${current.children} child${current.children === 1 ? '' : 'ren'} · ${current.roomCount} room${current.roomCount === 1 ? '' : 's'}`} colors={colors} /><InfoRow label="Guest" value={`${current.guest.name}\n${current.guest.email}`} colors={colors} /><InfoRow label="Total" value={`${current.currency} ${current.total.toLocaleString()}`} colors={colors} strong /><InfoRow label="Status" value={formatBookingStatus(current)} colors={colors} /></View>
    {current.items.map((item) => <View key={item.roomId} style={[styles.roomRow, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={{ flex: 1 }}><Text style={[styles.roomName, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.roomMeta, { color: colors.mutedForeground }]}>{item.quantity} room{item.quantity === 1 ? '' : 's'} · {current.nights} night{current.nights === 1 ? '' : 's'}</Text></View><Text style={[styles.roomTotal, { color: colors.foreground }]}>{current.currency} {item.roomTotal.toLocaleString()}</Text></View>)}
    {error ? <NoticeBanner error>{error}</NoticeBanner> : null}
      {current.status !== 'cancelled' && current.paymentStatus !== 'paid' && current.paymentStatus !== 'processing' ? <View style={[styles.paymentCard, { backgroundColor: colors.secondary }]}><Text style={[styles.paymentTitle, { color: colors.foreground }]}>{current.paymentStatus === 'failed' ? 'Payment failed' : current.paymentStatus === 'cancelled' ? 'Checkout cancelled' : 'Payment due'}</Text><Text style={[styles.paymentText, { color: colors.mutedForeground }]}>{current.paymentStatus === 'failed' ? 'Razorpay could not complete this payment. No booking was confirmed; you can try again.' : 'Continue to secure Razorpay checkout. Available methods depend on the merchant account and may include UPI, cards, and net banking.'}</Text><Pressable testID="booking-pay" disabled={paying} onPress={() => void startCheckout()} style={[styles.primaryButton, { backgroundColor: paying ? colors.muted : colors.primary }]}>{paying ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{current.paymentStatus === 'failed' || current.paymentStatus === 'cancelled' ? 'Try payment again' : 'Pay securely with Razorpay'}</Text>}</Pressable></View> : current.paymentStatus === 'processing' ? <View style={[styles.paymentCard, { backgroundColor: colors.secondary }]}><Text style={[styles.paymentTitle, { color: colors.foreground }]}>Payment processing</Text><Text style={[styles.paymentText, { color: colors.mutedForeground }]}>Razorpay is confirming your payment. This page will update when the server receives the verified result.</Text></View> : current.paymentStatus === 'paid' ? <View style={[styles.paymentCard, { backgroundColor: colors.secondary }]}><Text style={[styles.paymentTitle, { color: colors.foreground }]}>Payment received</Text><Text style={[styles.paymentText, { color: colors.mutedForeground }]}>Your payment was verified by the payment provider. The booking request is confirmed; supplier reservation is still a development preview.</Text></View> : null}
    {current.canCancel ? confirming ? <View style={[styles.confirmCard, { backgroundColor: colors.secondary }]}><Text style={[styles.confirmTitle, { color: colors.foreground }]}>Cancel this booking request?</Text><Text style={[styles.confirmText, { color: colors.mutedForeground }]}>No payment was taken. This removes the payment-pending request from availability.</Text><View style={styles.confirmActions}><Pressable onPress={() => setConfirming(false)} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Keep it</Text></Pressable><Pressable disabled={cancelling} onPress={() => void cancel()} style={[styles.cancelButton, { backgroundColor: colors.destructive }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{cancelling ? 'Cancelling…' : 'Cancel booking'}</Text></Pressable></View></View> : <Pressable testID="booking-cancel" onPress={() => setConfirming(true)} style={[styles.cancelOutline, { borderColor: colors.destructive }]}><Text style={[styles.cancelText, { color: colors.destructive }]}>Cancel booking request</Text></Pressable> : null}
  </ScrollView>;
}

function formatBookingStatus(booking: Booking) {
  if (booking.status === 'cancelled') return 'Cancelled';
  if (booking.paymentStatus === 'paid') return 'Confirmed · paid';
  if (booking.paymentStatus === 'processing') return 'Payment processing';
  if (booking.paymentStatus === 'failed') return 'Payment failed';
  if (booking.paymentStatus === 'cancelled') return 'Checkout cancelled';
  return 'Pending payment · unpaid';
}

function InfoRow({ label, value, colors, strong = false }: { label: string; value: string; colors: ReturnType<typeof useColors>; strong?: boolean }) {
  return <View style={styles.infoRow}><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.foreground, fontWeight: strong ? '800' : '600' }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  hero: { borderWidth: 1, borderRadius: 20, padding: 12, marginBottom: 13 },
  heroImage: { width: '100%', height: 155, borderRadius: 14, marginBottom: 16 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7, marginTop: 6 },
  location: { fontSize: 12, marginTop: 5 },
  reference: { borderRadius: 13, padding: 11, marginTop: 16 },
  referenceLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  referenceValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  infoCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, textAlign: 'right', maxWidth: '68%', lineHeight: 18 },
  roomRow: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  roomName: { fontSize: 13, fontWeight: '700' },
  roomMeta: { fontSize: 11, marginTop: 4 },
  roomTotal: { fontSize: 12, fontWeight: '800', marginLeft: 12 },
  paymentCard: { borderRadius: 17, padding: 15, marginBottom: 12 },
  paymentTitle: { fontSize: 15, fontWeight: '800' },
  paymentText: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  cancelOutline: { minHeight: 49, borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 3 },
  cancelText: { fontSize: 13, fontWeight: '800' },
  confirmCard: { borderRadius: 17, padding: 15, marginTop: 3 },
  confirmTitle: { fontSize: 15, fontWeight: '800' },
  confirmText: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  confirmActions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  secondaryButton: { flex: 1, minHeight: 45, borderWidth: 1, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { fontSize: 12, fontWeight: '800' },
  cancelButton: { flex: 1, minHeight: 45, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  primaryButton: { minHeight: 48, borderRadius: 14, paddingHorizontal: 22, justifyContent: 'center', alignItems: 'center', marginTop: 19 },
  primaryButtonText: { fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  centerText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 9, maxWidth: 310 },
  errorTitle: { fontSize: 22, fontWeight: '700', marginTop: 15 },
});