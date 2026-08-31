import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import {
  getListMyPropertyEnquiriesQueryKey,
  type TravellerPropertyEnquiry,
  useListMyPropertyEnquiries,
} from '@workspace/api-client-react';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radii, spacing } from '@/constants/theme';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status: TravellerPropertyEnquiry['status']) {
  if (status === 'contacted') return 'Vendor contacted';
  if (status === 'closed') return 'Closed';
  return 'Received';
}

function statusIcon(status: TravellerPropertyEnquiry['status']) {
  if (status === 'contacted') return 'phone';
  if (status === 'closed') return 'check-circle';
  return 'clock';
}

function EnquiryCard({ enquiry }: { enquiry: TravellerPropertyEnquiry }) {
  const colors = useColors();
  return (
    <View testID={`property-enquiry-card-${enquiry.id}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.propertyIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="map-pin" size={18} color={colors.primary} />
        </View>
        <View style={styles.propertyCopy}>
          <Text style={[styles.propertyTitle, { color: colors.foreground }]}>{enquiry.property.title}</Text>
          <Text style={[styles.propertyAddress, { color: colors.mutedForeground }]}>{enquiry.property.address}</Text>
        </View>
        <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
          <Feather name={statusIcon(enquiry.status)} size={16} color={colors.primary} />
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.statusText, { color: colors.primary }]}>{statusLabel(enquiry.status)}</Text>
      </View>
      <Text style={[styles.submitted, { color: colors.mutedForeground }]}>Submitted {formatDate(enquiry.createdAt)}</Text>
      <View style={[styles.timeline, { borderTopColor: colors.border }]}>
        <Text style={[styles.timelineLabel, { color: colors.mutedForeground }]}>STATUS UPDATES</Text>
        {enquiry.history.map((update) => (
          <View key={update.id} style={styles.update}>
            <View style={[styles.updateDot, { backgroundColor: colors.primary }]} />
            <View style={styles.updateCopy}>
              <Text style={[styles.updateStatus, { color: colors.foreground }]}>{statusLabel(update.status)}</Text>
              <Text style={[styles.updateDate, { color: colors.mutedForeground }]}>{formatDate(update.createdAt)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PropertyEnquiriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useListMyPropertyEnquiries({
    query: {
      queryKey: getListMyPropertyEnquiriesQueryKey(),
      staleTime: 10_000,
      retry: 1,
      refetchOnReconnect: true,
    },
  });
  const items = query.data?.items ?? [];

  return (
    <ScrollView testID="property-enquiries-scroll-view" style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
        <Feather name="arrow-left" size={21} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>PROPERTY ENQUIRIES</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Track your requests.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>See the latest safe updates on each property enquiry from your authenticated account.</Text>
      {query.isLoading && !query.data ? (
        <View testID="property-enquiries-loading" style={[styles.state, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading your enquiries…</Text>
        </View>
      ) : query.isError ? (
        <View style={[styles.state, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-circle" size={24} color={colors.destructive} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>Enquiries are unavailable</Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Try again when your connection is steadier.</Text>
          <Pressable onPress={() => void query.refetch()} style={[styles.retry, { backgroundColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try again</Text>
          </Pressable>
        </View>
      ) : items.length ? (
        items.map((enquiry) => <EnquiryCard key={enquiry.id} enquiry={enquiry} />)
      ) : (
        <View style={[styles.state, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="inbox" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>No property enquiries yet</Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>When you request property details, your submission and its status updates will appear here.</Text>
          <Pressable onPress={() => router.replace('/(tabs)/land')} style={[styles.retry, { backgroundColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Browse land</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center', marginBottom: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  card: { borderWidth: 1, borderRadius: radii.md, padding: 16, marginBottom: 14, ...elevation.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  propertyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  propertyCopy: { flex: 1, marginLeft: 11, marginRight: 8 },
  propertyTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  propertyAddress: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  statusIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusPill: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6, marginTop: 16 },
  statusText: { fontSize: 11, fontWeight: '800' },
  submitted: { fontSize: 12, marginTop: 10 },
  timeline: { borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  timelineLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800', marginBottom: 11 },
  update: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  updateDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  updateCopy: { marginLeft: 10 },
  updateStatus: { fontSize: 13, fontWeight: '700' },
  updateDate: { fontSize: 11, marginTop: 2 },
  state: { borderWidth: 1, borderRadius: radii.md, alignItems: 'center', padding: 28, ...elevation.card },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stateTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  retry: { borderRadius: 14, minHeight: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 17 },
  retryText: { fontSize: 13, fontWeight: '700' },
});