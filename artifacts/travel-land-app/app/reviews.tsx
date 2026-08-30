import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { getListEligibleReviewsQueryKey, getListMyReviewsQueryKey, useListEligibleReviews, useListMyReviews } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReviewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const eligibleQuery = useListEligibleReviews({ query: { queryKey: getListEligibleReviewsQueryKey(), staleTime: 30_000 } });
  const mineQuery = useListMyReviews({ query: { queryKey: getListMyReviewsQueryKey(), staleTime: 30_000 } });
  const eligible = eligibleQuery.data?.items ?? [];
  const mine = mineQuery.data?.items ?? [];

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
    <Text style={[styles.kicker, { color: colors.primary }]}>REVIEWS</Text>
    <Text style={[styles.title, { color: colors.foreground }]}>Share what{'\n'}stayed with you.</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Reviews are tied to paid stays completed by your account.</Text>
    {eligibleQuery.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : null}
    {eligible.length ? <><Text style={[styles.section, { color: colors.primary }]}>READY TO REVIEW</Text>{eligible.map((item) => <View key={item.bookingReference} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="star" size={20} color={colors.primary} /></View><View style={styles.cardCopy}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.hotelName}</Text><Text style={[styles.cardText, { color: colors.mutedForeground }]}>Stay ended {item.stayEndedOn}</Text><Pressable onPress={() => router.push({ pathname: '/review', params: { hotelId: item.entityId, bookingReference: item.bookingReference, hotelName: item.hotelName } } as any)} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Write review</Text></Pressable></View></View>)}</> : <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="check-circle" size={23} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reviews to write yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>After a paid stay is completed, the verified review invitation will appear here.</Text><Pressable onPress={() => router.push('/bookings')} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.buttonText, { color: colors.foreground }]}>View bookings</Text></Pressable></View>}
    {mine.length ? <><Text style={[styles.section, { color: colors.primary }]}>YOUR REVIEWS</Text>{mine.map((review) => <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.reviewHead}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{review.title || 'Hotel review'}</Text><Text style={[styles.rating, { color: '#B7791F' }]}>★ {review.rating}/5</Text></View>{review.body ? <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{review.body}</Text> : null}<Text style={[styles.status, { color: colors.mutedForeground }]}>{review.status === 'published' ? 'Published' : 'Under moderation'}</Text></View>)}</> : null}
    {mineQuery.isError || eligibleQuery.isError ? <Text style={[styles.error, { color: colors.destructive }]}>Reviews are temporarily unavailable. Try again later.</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 34, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 9 },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 28, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', marginBottom: 10 },
  cardCopy: { flex: 1, marginLeft: 12 },
  icon: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  button: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 12 },
  outlineButton: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 11, marginTop: 18 },
  buttonText: { fontSize: 12, fontWeight: '800' },
  empty: { borderWidth: 1, borderRadius: 21, alignItems: 'center', padding: 28, marginTop: 26 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 15 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  loading: { alignItems: 'center', padding: 28 },
  reviewCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 10 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rating: { fontSize: 12, fontWeight: '800' },
  status: { fontSize: 11, marginTop: 10 },
  error: { fontSize: 12, textAlign: 'center', marginTop: 18 },
});