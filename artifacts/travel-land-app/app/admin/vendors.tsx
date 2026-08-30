import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import {
  useApproveVendorApplication,
  useListAdminVendorApprovalHistory,
  useListAdminVendorApplications,
  useRejectVendorApplication,
} from '@workspace/api-client-react';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminVendorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const applications = useListAdminVendorApplications();
  const approvalHistory = useListAdminVendorApprovalHistory();
  const approve = useApproveVendorApplication();
  const reject = useRejectVendorApplication();
  const [message, setMessage] = React.useState('');
  const busy = approve.isPending || reject.isPending;
  const refresh = () => Promise.all([applications.refetch(), approvalHistory.refetch()]);

  const run = async (id: string, action: 'approve' | 'reject') => {
    setMessage('');
    try {
      if (action === 'approve') {
        const result = await approve.mutateAsync({ id });
        setMessage(result.approvalEmailStatus === 'sent'
          ? 'Vendor approved and email sent.'
          : 'Vendor approved, but the approval email could not be delivered.');
      } else {
        await reject.mutateAsync({ id });
        setMessage('Vendor application rejected.');
      }
      await refresh();
    } catch (error) {
      const value = error as { message?: string; error?: { message?: string } } | null;
      setMessage(value?.error?.message || value?.message || 'The application could not be updated.');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      refreshControl={<RefreshControl refreshing={applications.isFetching || approvalHistory.isFetching} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to admin dashboard" onPress={() => router.replace('/admin')} style={styles.back}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>VENDOR REVIEW</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Welcome the right\nbusinesses in.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        New applicants receive one Clerk invitation. Applicants who already have a Clerk account are activated immediately after approval.
      </Text>
      {!!message && <Text style={[styles.message, { color: message.includes('could not') ? colors.destructive : colors.primary }]}>{message}</Text>}
      {applications.isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
      {!applications.isLoading && (applications.data?.items.length ?? 0) === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="inbox" size={24} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No applications waiting</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>New vendor applications will appear here for review.</Text>
        </View>
      )}
      {applications.data?.items.map((application) => (
        <View key={application.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleCopy}>
              <Text style={[styles.business, { color: colors.foreground }]}>{application.businessName}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>{application.businessType} · {application.city}, {application.country}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{application.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.contact, { color: colors.foreground }]}>{application.contactName} · {application.email}</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{application.description}</Text>
          <Text style={[styles.address, { color: colors.mutedForeground }]}>{application.address} · {application.phone}</Text>
          <View style={styles.actions}>
            <Pressable disabled={busy} onPress={() => run(application.id, 'reject')} style={[styles.action, styles.rejectAction, { borderColor: colors.border }]}>
              <Text style={[styles.actionText, { color: colors.destructive }]}>Reject</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => run(application.id, 'approve')} style={[styles.action, { backgroundColor: colors.primary }]}>
              {approve.isPending ? <ActivityIndicator color="#fff" /> : <Text style={[styles.actionText, { color: '#fff' }]}>Approve application</Text>}
            </Pressable>
          </View>
        </View>
      ))}
      <View style={styles.historySection}>
        <Text style={[styles.kicker, { color: colors.primary }]}>APPROVAL HISTORY</Text>
        <Text style={[styles.historyIntro, { color: colors.mutedForeground }]}>
          A record of who approved each vendor, how they were invited, and whether the confirmation email was delivered.
        </Text>
        {approvalHistory.isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        {!approvalHistory.isLoading && (approvalHistory.data?.items.length ?? 0) === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={24} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No approvals recorded</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Completed vendor approvals will remain visible here.</Text>
          </View>
        )}
        {approvalHistory.data?.items.map((approval) => {
          const approvedDate = new Date(approval.approvedAt);
          const approver = approval.approvedBy.displayName || approval.approvedBy.email;
          return (
            <View key={approval.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleCopy}>
                  <Text style={[styles.business, { color: colors.foreground }]}>{approval.businessName}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{approval.vendorEmail}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: approval.approvalEmailStatus === 'failed' ? `${colors.destructive}18` : colors.secondary }]}>
                  <Text style={[styles.badgeText, { color: approval.approvalEmailStatus === 'failed' ? colors.destructive : colors.primary }]}>
                    {approval.approvalEmailStatus === 'failed' ? 'EMAIL FAILED' : 'EMAIL SENT'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.historyDetail, { color: colors.foreground }]}>
                Approved by {approver}
              </Text>
              <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                {approvedDate.toLocaleDateString()} at {approvedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                {approval.invitationCreated ? 'Clerk invitation created' : 'Existing Clerk account activated'}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontSize: 14, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 24 },
  message: { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  loader: { marginTop: 30 },
  historySection: { marginTop: 24 },
  historyIntro: { fontSize: 14, lineHeight: 20, marginTop: -2, marginBottom: 18 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitleCopy: { flex: 1, paddingRight: 8 },
  business: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  contact: { fontSize: 13, fontWeight: '600', marginTop: 15 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  address: { fontSize: 12, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  historyCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12 },
  historyDetail: { fontSize: 13, fontWeight: '600', marginTop: 15 },
  historyMeta: { fontSize: 12, marginTop: 6 },
  action: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rejectAction: { borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '700' },
});
