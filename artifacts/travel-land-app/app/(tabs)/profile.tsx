import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useClerk, useUser } from '@clerk/expo';
import { useRole } from '@/context/RoleContext';
import { elevation, radii, spacing } from '@/constants/theme';

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { role } = useRole();
  const rows = [
    ['heart', 'Favorites', '/saved'],
    ['credit-card', 'Wallet & payments', '/wallet'],
    ['calendar', 'My bookings', '/bookings'],
    ['inbox', 'Property enquiries', '/property-enquiries'],
    ['star', 'Reviews', '/reviews'],
    ['help-circle', 'Help & support', '/notifications'],
  ] as const;
  const dashboardRoute = role === 'vendor' ? '/vendor' : role === 'admin' ? '/admin' : null;
  const dashboardLabel = role === 'vendor' ? 'Vendor dashboard' : role === 'admin' ? 'Admin dashboard' : null;
  return <ScrollView testID="profile-scroll-view" style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}><Text style={[styles.kicker, { color: colors.primary }]}>YOUR SPACE</Text><Text style={[styles.title, { color: colors.foreground }]}>Profile.</Text><View style={[styles.profileCard, { backgroundColor: colors.primary }]}><View style={[styles.avatar, { backgroundColor: colors.accent }]}><Text style={[styles.avatarText, { color: colors.accentForeground }]}>{user?.firstName?.slice(0, 1).toUpperCase() ?? 'T'}</Text></View><View><Text style={styles.profileName}>{user?.fullName ?? 'Your traveller profile'}</Text><Text style={styles.profileText}>{user?.primaryEmailAddress?.emailAddress ?? 'Your Travel & Land account'}</Text></View></View>{dashboardRoute && dashboardLabel && <Pressable onPress={() => router.push(dashboardRoute)} style={[styles.dashboardRow, { backgroundColor: colors.secondary }]}><View style={[styles.rowIcon, { backgroundColor: colors.background }]}><Feather name={role === 'vendor' ? 'briefcase' : 'shield'} size={17} color={colors.primary} /></View><View style={styles.dashboardCopy}><Text style={[styles.dashboardLabel, { color: colors.foreground }]}>{dashboardLabel}</Text><Text style={[styles.dashboardText, { color: colors.mutedForeground }]}>Open your role-specific workspace</Text></View><Feather name="arrow-up-right" size={17} color={colors.primary} /></Pressable>}{rows.map(([icon, label, route]) => <Pressable key={label} onPress={() => router.push(route)} style={[styles.row, { borderBottomColor: colors.border }]}><View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={17} color={colors.primary} /></View><Text style={[styles.rowText, { color: colors.foreground }]}>{label}</Text><Feather name="chevron-right" size={17} color={colors.mutedForeground} /></Pressable>)}<View style={styles.preferences}><Text style={[styles.preferencesTitle, { color: colors.mutedForeground }]}>ACCOUNT SECURITY</Text><Pressable onPress={() => router.push('/biometric')} style={[styles.securityRow, { borderColor: colors.border }]}><Feather name="lock" size={17} color={colors.primary} /><Text style={[styles.securityText, { color: colors.foreground }]}>Manage device security</Text><Feather name="chevron-right" size={17} color={colors.mutedForeground} /></Pressable></View><Pressable onPress={async () => { await signOut(); router.replace('/login'); }} style={styles.logout}><Feather name="log-out" size={16} color={colors.destructive} /><Text style={[styles.logoutText, { color: colors.destructive }]}>Log out</Text></Pressable></ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -0.9, marginBottom: spacing.lg },
  profileCard: { borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: 14, ...elevation.card },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileName: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 12 },
  profileText: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginLeft: 12, marginTop: 4 },
  dashboardRow: { borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dashboardCopy: { flex: 1, marginLeft: 11 },
  dashboardLabel: { fontSize: 13, fontWeight: '700' },
  dashboardText: { fontSize: 11, marginTop: 3 },
  edit: { marginLeft: 'auto', width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  row: { borderBottomWidth: 1, minHeight: 62, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, marginLeft: 13, fontSize: 14, fontWeight: '600' },
  preferences: { marginTop: 28 },
  preferencesTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10 },
  securityRow: { borderWidth: 1, borderRadius: radii.md, padding: 14, minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  securityText: { flex: 1, marginLeft: 11, fontSize: 13, fontWeight: '600' },
  logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, padding: 20 },
  logoutText: { fontSize: 13, fontWeight: '700' },
});