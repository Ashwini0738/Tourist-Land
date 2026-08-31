import {
  useGetAdminReports,
  useGetVendorReports,
  getGetAdminReportsQueryKey,
  getGetVendorReportsQueryKey,
  type AdminReport,
  type VendorReport,
} from '@workspace/api-client-react';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PlatformIcon } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { Badge, Panel, State } from '@/features/vendor/VendorUI';
import { radii, spacing } from '@/constants/theme';

type ReportRole = 'admin' | 'vendor';
type Report = AdminReport | VendorReport;

function inputDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReportsScreen({ role }: { role: ReportRole }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState(30);
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({
    from: inputDate(days - 1),
    to: inputDate(0),
    country: country || undefined,
    status: status || undefined,
    page,
    limit: 10,
  }), [country, days, page, status]);
  const adminQuery = useGetAdminReports(params, { query: { enabled: role === 'admin', queryKey: getGetAdminReportsQueryKey(params) } });
  const vendorQuery = useGetVendorReports(params, { query: { enabled: role === 'vendor', queryKey: getGetVendorReportsQueryKey(params) } });
  const query: any = role === 'admin' ? adminQuery : vendorQuery;
  const report = query.data as Report | undefined;
  const kpis = report?.kpis ?? {};
  const tableMeta = report?.meta?.bookings;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Back to ${role} dashboard`}
        onPress={() => router.replace(role === 'admin' ? '/admin' : '/vendor')}
        style={styles.back}
      >
        <PlatformIcon name="arrow-left" size={18} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{role === 'admin' ? 'PLATFORM REPORTING' : 'VENDOR REPORTING'}</Text>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Reporting, with receipts.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Database records only. Totals stay separated by currency.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh report" onPress={() => query.refetch()} style={[styles.refresh, { borderColor: colors.border }]}>
          <PlatformIcon name="radio" size={17} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.presetRow}>
        {[7, 30, 90].map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: days === option }}
            onPress={() => { setDays(option); setPage(1); }}
            style={[styles.preset, { backgroundColor: days === option ? colors.primary : colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.presetText, { color: days === option ? colors.primaryForeground : colors.foreground }]}>{option} days</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['All countries', ...(report?.supportedFilters.countries ?? [])].map((option) => {
          const value = option === 'All countries' ? '' : option;
          return (
            <Pressable key={option} onPress={() => { setCountry(value); setPage(1); }} style={[styles.filter, { backgroundColor: country === value ? colors.secondary : colors.card, borderColor: colors.border }]}>
              <Text style={[styles.filterText, { color: country === value ? colors.primary : colors.mutedForeground }]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['All statuses', ...(report?.supportedFilters.statuses ?? [])].slice(0, 9).map((option) => {
          const value = option === 'All statuses' ? '' : option;
          return (
            <Pressable key={option} onPress={() => { setStatus(value); setPage(1); }} style={[styles.filter, { backgroundColor: status === value ? colors.secondary : colors.card, borderColor: colors.border }]}>
              <Text style={[styles.filterText, { color: status === value ? colors.primary : colors.mutedForeground }]}>{titleCase(option)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {query.isLoading && <Panel style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading database report…</Text></Panel>}
      {query.isError && <State title="Report unavailable" description="The reporting service could not return this range." retry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && report && (
        <>
          {report.provenance === 'demo' && <View style={[styles.notice, { backgroundColor: `${colors.accent}25`, borderColor: colors.accent }]}><PlatformIcon name="info" size={16} color={colors.accentForeground} /><Text style={[styles.noticeText, { color: colors.accentForeground }]}>Seeded demo data is being shown.</Text></View>}
          <View style={styles.kpiGrid}>
            {Object.entries(kpis).slice(0, role === 'admin' ? 6 : 6).map(([label, value]) => (
              <View key={label} style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.kpiValue, { color: colors.foreground }]}>{Number(value).toLocaleString()}</Text>
                <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{titleCase(label)}</Text>
              </View>
            ))}
          </View>

          <Panel>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>Currency totals</Text>
            {report.currencies.bookings.length === 0 && <Text style={[styles.empty, { color: colors.mutedForeground }]}>No booking totals in this range.</Text>}
            {report.currencies.bookings.map((item) => (
              <View key={`booking-${item.currency}`} style={[styles.currencyRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.currencyLabel, { color: colors.foreground }]}>Bookings · {item.currency}</Text>
                <Text style={[styles.currencyValue, { color: colors.foreground }]}>{item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
              </View>
            ))}
            {report.currencies.payments.map((item) => (
              <View key={`payment-${item.currency}`} style={[styles.currencyRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.currencyLabel, { color: colors.foreground }]}>Payments · {item.currency}</Text>
                <Text style={[styles.currencyValue, { color: colors.foreground }]}>{item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
              </View>
            ))}
          </Panel>

          <Panel>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>Bookings by status</Text>
            {report.breakdowns.bookings.length === 0 && <Text style={[styles.empty, { color: colors.mutedForeground }]}>No bookings in this range.</Text>}
            {report.breakdowns.bookings.map((item) => (
              <View key={item.status} style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.foreground }]}>{titleCase(item.status)}</Text>
                <Badge label={String(item.count)} tone={item.status === 'confirmed' ? 'good' : item.status === 'cancelled' ? 'bad' : 'warn'} />
              </View>
            ))}
          </Panel>

          <Panel>
            <View style={styles.panelHeader}>
              <View><Text style={[styles.panelTitle, { color: colors.foreground }]}>Recent bookings</Text><Text style={[styles.panelHint, { color: colors.mutedForeground }]}>UTC · {report.range.from} to {report.range.to}</Text></View>
              {tableMeta && <Text style={[styles.panelHint, { color: colors.mutedForeground }]}>{tableMeta.total} total</Text>}
            </View>
            {report.tables.bookings.length === 0 && <Text style={[styles.empty, { color: colors.mutedForeground }]}>No bookings returned for these filters.</Text>}
            {report.tables.bookings.slice(0, 8).map((booking) => (
              <View key={booking.id} style={[styles.bookingRow, { borderBottomColor: colors.border }]}>
                <View style={styles.bookingCopy}><Text style={[styles.bookingRef, { color: colors.primary }]}>{booking.reference}</Text><Text style={[styles.panelHint, { color: colors.mutedForeground }]}>{booking.startsOn} · {booking.currency} {booking.totalAmount.toLocaleString()}</Text></View>
                <Badge label={titleCase(booking.status)} tone={booking.status === 'confirmed' ? 'good' : booking.status === 'cancelled' ? 'bad' : 'warn'} />
              </View>
            ))}
            {tableMeta && tableMeta.total > 0 && (
              <View style={styles.pagination}>
                <Pressable disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))}><PlatformIcon name="chevron-left" size={18} color={page <= 1 ? colors.border : colors.primary} /></Pressable>
                <Text style={[styles.panelHint, { color: colors.mutedForeground }]}>Page {page}</Text>
                <Pressable disabled={!tableMeta.hasMore} onPress={() => setPage((value) => value + 1)}><PlatformIcon name="chevron-right" size={18} color={!tableMeta.hasMore ? colors.border : colors.primary} /></Pressable>
              </View>
            )}
          </Panel>

          {report.unavailable.length > 0 && <Panel><Text style={[styles.panelTitle, { color: colors.foreground }]}>Not collected</Text>{report.unavailable.slice(0, 3).map((item) => <Text key={item.key} style={[styles.unavailable, { color: colors.mutedForeground }]}>{item.label}: {item.reason}</Text>)}</Panel>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, maxWidth: 960, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25 },
  backText: { fontSize: 14, fontWeight: '700' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  titleCopy: { flex: 1, paddingRight: 12 },
  title: { fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  refresh: { width: 44, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  preset: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10 },
  presetText: { fontSize: 12, fontWeight: '800' },
  filterRow: { gap: 8, paddingBottom: 5 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { fontSize: 11, fontWeight: '700' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 12 },
  noticeText: { fontSize: 12, fontWeight: '700', flex: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10, marginBottom: 12 },
  kpi: { width: '31.8%', minHeight: 86, borderWidth: 1, borderRadius: radii.md, padding: 12 },
  kpiValue: { fontSize: 21, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  center: { alignItems: 'center', paddingVertical: 32 },
  stateText: { fontSize: 13, marginTop: 10 },
  panelTitle: { fontSize: 16, fontWeight: '800' },
  panelHint: { fontSize: 11, marginTop: 4 },
  empty: { fontSize: 13, marginTop: 13, lineHeight: 19 },
  currencyRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  currencyLabel: { fontSize: 13, fontWeight: '600' },
  currencyValue: { fontSize: 13, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bookingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: 1, paddingVertical: 13 },
  bookingCopy: { flex: 1 },
  bookingRef: { fontSize: 13, fontWeight: '800' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, paddingTop: 13 },
  unavailable: { fontSize: 12, lineHeight: 18, marginTop: 9 },
});