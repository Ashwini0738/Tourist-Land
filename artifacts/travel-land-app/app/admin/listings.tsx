import { PlatformIcon } from '@/components/PlatformIcon';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useListAdminVendorListings } from '@workspace/api-client-react';
import type { AdminListing } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Filter = 'all' | AdminListing['status'];

function errorMessage(error: unknown) {
  const value = error as { message?: string; error?: { message?: string } } | null;
  return value?.error?.message || value?.message || 'The review list could not be loaded.';
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(status: AdminListing['status']) {
  return status === 'pending' ? 'Under review' : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const listings = useListAdminVendorListings();
  const [filter, setFilter] = useState<Filter>('all');
  const items = listings.data?.items ?? [];
  const filteredItems = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.status === filter)),
    [filter, items],
  );
  const counts = useMemo(
    () => ({
      pending: items.filter((item) => item.status === 'pending').length,
      published: items.filter((item) => item.status === 'published').length,
    }),
    [items],
  );

  const statusTone = (status: AdminListing['status']) => {
    const palette: Record<AdminListing['status'], { background: string; foreground: string }> = {
      draft: { background: colors.muted, foreground: colors.mutedForeground },
      published: { background: colors.secondary, foreground: colors.primary },
      archived: { background: colors.muted, foreground: colors.mutedForeground },
      pending: { background: `${colors.accent}40`, foreground: colors.accentForeground },
    };
    return palette[status];
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 34 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={listings.isFetching && !listings.isLoading}
          onRefresh={() => listings.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to admin dashboard"
        onPress={() => router.replace('/admin')}
        style={styles.back}
      >
        <PlatformIcon name="arrow-left" size={19} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>PLATFORM CONTROL</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>A clear view of\nevery vendor place.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Review ownership, location, and listing readiness without changing vendor content.
      </Text>

      <View style={[styles.insightCard, { backgroundColor: colors.primary }]}>
        <View style={styles.insightBlock}>
          <Text style={styles.insightLabel}>ALL LISTINGS</Text>
          <Text style={styles.insightValue}>{items.length}</Text>
        </View>
        <View style={styles.insightDivider} />
        <View style={styles.insightBlock}>
          <Text style={styles.insightLabel}>UNDER REVIEW</Text>
          <Text style={styles.insightValue}>{counts.pending}</Text>
        </View>
        <View style={styles.insightDivider} />
        <View style={styles.insightBlock}>
          <Text style={styles.insightLabel}>PUBLISHED</Text>
          <Text style={styles.insightValue}>{counts.published}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'published', 'draft', 'archived'] as Filter[]).map((value) => {
          const selected = filter === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Show ${value} listings`}
              onPress={() => setFilter(value)}
              style={[
                styles.filterChip,
                { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.filterText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                {value === 'all' ? 'All' : statusLabel(value)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>VENDOR LISTINGS</Text>
        <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{filteredItems.length} shown</Text>
      </View>

      {listings.isLoading ? (
        <AdminListingSkeleton colors={colors} />
      ) : listings.isError ? (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stateIcon, { backgroundColor: `${colors.destructive}12` }]}>
            <PlatformIcon name="alert-circle" size={21} color={colors.destructive} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>Review list unavailable</Text>
          <Text style={[styles.stateDescription, { color: colors.mutedForeground }]}>{errorMessage(listings.error)}</Text>
          <Pressable onPress={() => listings.refetch()} style={[styles.stateButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.stateButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
            <PlatformIcon name="layers" size={21} color={colors.primary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>No vendor listings yet</Text>
          <Text style={[styles.stateDescription, { color: colors.mutedForeground }]}>
            Approved vendor places will appear here when they create a listing.
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
            <PlatformIcon name="search" size={21} color={colors.primary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>Nothing in this view</Text>
          <Text style={[styles.stateDescription, { color: colors.mutedForeground }]}>Choose another status to continue reviewing.</Text>
        </View>
      ) : (
        filteredItems.map((listing) => {
          const tone = statusTone(listing.status);
          return (
            <View key={listing.id} style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleCopy}>
                  <Text style={[styles.listingName, { color: colors.foreground }]}>{listing.name}</Text>
                  <View style={styles.locationLine}>
                    <PlatformIcon name="map-pin" size={13} color={colors.mutedForeground} />
                    <Text numberOfLines={1} style={[styles.locationText, { color: colors.mutedForeground }]}>{listing.address}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
                  <View style={[styles.statusDot, { backgroundColor: tone.foreground }]} />
                  <Text style={[styles.statusText, { color: tone.foreground }]}>{statusLabel(listing.status)}</Text>
                </View>
              </View>
              {!!listing.description && (
                <Text numberOfLines={2} style={[styles.description, { color: colors.mutedForeground }]}>{listing.description}</Text>
              )}
              <View style={[styles.ownerPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.ownerAvatar, { backgroundColor: colors.secondary }]}>
                  <PlatformIcon name="user" size={16} color={colors.primary} />
                </View>
                <View style={styles.ownerCopy}>
                  <Text style={[styles.ownerName, { color: colors.foreground }]}>{listing.ownerName || 'Vendor name not provided'}</Text>
                  <Text numberOfLines={1} style={[styles.ownerEmail, { color: colors.mutedForeground }]}>{listing.ownerEmail}</Text>
                </View>
                <PlatformIcon name="shield" size={16} color={colors.mutedForeground} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Updated {formatUpdatedAt(listing.updatedAt)}</Text>
                <Text style={[styles.footerText, { color: colors.mutedForeground }]}>ID {listing.id.slice(0, 8)}</Text>
              </View>
            </View>
          );
        })
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

function AdminListingSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      {[1, 2].map((item) => (
        <View key={item} style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.skeletonLine, { backgroundColor: colors.muted, width: '58%' }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.muted, width: '77%', marginTop: 12 }]} />
          <View style={[styles.skeletonOwner, { backgroundColor: colors.muted }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 27 },
  backText: { fontSize: 14, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 22 },
  insightCard: { borderRadius: 20, paddingVertical: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  insightBlock: { flex: 1, alignItems: 'center' },
  insightLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 8, letterSpacing: 1, fontWeight: '800', textAlign: 'center' },
  insightValue: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  insightDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.18)' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 24 },
  filterChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { fontSize: 10, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  sectionCount: { fontSize: 11 },
  listingCard: { borderWidth: 1, borderRadius: 19, padding: 15, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitleCopy: { flex: 1 },
  listingName: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  locationText: { flex: 1, fontSize: 11 },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  description: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  ownerPanel: { borderWidth: 1, borderRadius: 13, padding: 10, flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  ownerAvatar: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ownerCopy: { flex: 1, marginLeft: 10, marginRight: 8 },
  ownerName: { fontSize: 12, fontWeight: '800' },
  ownerEmail: { fontSize: 11, marginTop: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  footerText: { fontSize: 10 },
  stateCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  stateIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  stateDescription: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  stateButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  stateButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  skeletonLine: { height: 12, borderRadius: 6 },
  skeletonOwner: { height: 54, borderRadius: 13, marginTop: 18 },
});