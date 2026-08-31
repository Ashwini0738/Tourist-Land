import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useListVendorEnquiries,
  useUpdateVendorEnquiry,
  type PropertyEnquiryStatus,
  type VendorPropertyEnquiry,
} from '@workspace/api-client-react';
import { Badge, Button, Panel, SectionTitle, State, VendorPage, errorText } from '@/features/vendor/VendorUI';
import { useColors } from '@/hooks/useColors';

const NEXT_STATUS: Partial<Record<PropertyEnquiryStatus, PropertyEnquiryStatus>> = {
  new: 'contacted',
  contacted: 'closed',
};

const STATUS_LABELS: Record<PropertyEnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
};

export default function VendorEnquiriesScreen() {
  const colors = useColors();
  const query = useListVendorEnquiries();
  const update = useUpdateVendorEnquiry();
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const items = query.data?.items ?? [];

  const advance = async (enquiry: VendorPropertyEnquiry) => {
    const status = NEXT_STATUS[enquiry.status];
    if (!status) return;
    setNotice('');
    setError('');
    try {
      await update.mutateAsync({ id: enquiry.id, data: { status } });
      setNotice(`Enquiry for ${enquiry.property.title} is now ${STATUS_LABELS[status].toLowerCase()}.`);
      await query.refetch();
    } catch (caught) {
      setError(errorText(caught, 'The enquiry status could not be changed.'));
    }
  };

  return (
    <VendorPage title="Property enquiries." eyebrow="CUSTOMER RELATIONSHIPS">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Review questions from customers interested in your properties and keep each enquiry moving through its operational lifecycle.
      </Text>
      {!!notice && <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
      <SectionTitle>YOUR ENQUIRIES · {items.length}</SectionTitle>
      {query.isLoading ? <State title="Loading enquiries…" description="Fetching questions for your properties." /> :
        query.isError ? <State title="Enquiries unavailable" description="We could not load your property enquiries." retry={() => query.refetch()} /> :
        !items.length ? <State title="No enquiries yet" description="Customer questions about your owned properties will appear here." /> :
        items.map((enquiry) => (
          <EnquiryCard
            key={enquiry.id}
            enquiry={enquiry}
            busy={update.isPending}
            onAdvance={() => void advance(enquiry)}
          />
        ))}
    </VendorPage>
  );
}

function EnquiryCard({
  enquiry,
  busy,
  onAdvance,
}: {
  enquiry: VendorPropertyEnquiry;
  busy: boolean;
  onAdvance: () => void;
}) {
  const colors = useColors();
  const nextStatus = NEXT_STATUS[enquiry.status];
  const tone = enquiry.status === 'closed' ? 'good' : enquiry.status === 'contacted' ? 'warn' : 'neutral';

  return (
    <Panel>
      <View style={styles.row}>
        <View style={styles.heading}>
          <Text style={[styles.property, { color: colors.foreground }]}>{enquiry.property.title}</Text>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{enquiry.property.address}</Text>
        </View>
        <Badge label={STATUS_LABELS[enquiry.status]} tone={tone} />
      </View>
      <View style={[styles.customer, { borderColor: colors.border }]}>
        <Text style={[styles.customerName, { color: colors.foreground }]}>{enquiry.customer.name}</Text>
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>
          {enquiry.customer.email}
          {enquiry.customer.phone ? ` · ${enquiry.customer.phone}` : ''}
        </Text>
        <Text style={[styles.contactMethod, { color: colors.primary }]}>
          Prefers {enquiry.preferredContactMethod}
        </Text>
      </View>
      <Text style={[styles.message, { color: colors.foreground }]}>{enquiry.message}</Text>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>
        Received {formatDate(enquiry.createdAt)} · Updated {formatDate(enquiry.updatedAt)}
      </Text>
      <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>STATUS HISTORY</Text>
      {enquiry.history.map((entry) => (
        <View key={entry.id} style={styles.historyRow}>
          <View style={[styles.historyDot, { backgroundColor: colors.primary }]} />
          <View style={styles.historyCopy}>
            <Text style={[styles.historyStatus, { color: colors.foreground }]}>{STATUS_LABELS[entry.status]}</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>
              {entry.note ?? 'Status updated'} · {formatDate(entry.createdAt)}
            </Text>
          </View>
        </View>
      ))}
      {nextStatus && (
        <Button
          label={busy ? 'Updating…' : `Mark ${STATUS_LABELS[nextStatus].toLowerCase()}`}
          onPress={onAdvance}
          disabled={busy}
        />
      )}
    </Panel>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  notice: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  heading: { flex: 1 },
  property: { fontSize: 17, fontWeight: '700' },
  muted: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  customer: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginTop: 14 },
  customerName: { fontSize: 14, fontWeight: '700' },
  contactMethod: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  message: { fontSize: 14, lineHeight: 21, marginTop: 14 },
  historyTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 18, marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  historyDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, marginRight: 9 },
  historyCopy: { flex: 1 },
  historyStatus: { fontSize: 13, fontWeight: '700' },
});