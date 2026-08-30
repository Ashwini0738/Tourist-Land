import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import { useClerk } from '@clerk/expo';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CurrentUser } from '@workspace/api-client-react';

export type DashboardRole = 'vendor' | 'admin';

type DashboardNavItem = {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  route: string;
};

const NAVIGATION: Record<DashboardRole, DashboardNavItem[]> = {
  vendor: [
    { label: 'Traveller app', description: 'Explore destinations and manage your trips', icon: 'compass', route: '/(tabs)' },
    { label: 'Listings', description: 'Hotels, rooms, and properties', icon: 'briefcase', route: '/vendor/listings' },
    { label: 'Bookings', description: 'Bookings related to your listings', icon: 'calendar', route: '/vendor/bookings' },
    { label: 'Enquiries', description: 'Customer questions and follow-ups', icon: 'message-circle', route: '/vendor/enquiries' },
    { label: 'Profile', description: 'Business information and status', icon: 'user', route: '/vendor/profile' },
  ],
  admin: [
    { label: 'Traveller app', description: 'Browse the guest-facing experience', icon: 'compass', route: '/' },
    { label: 'Vendor workspace', description: 'View the vendor-facing experience', icon: 'briefcase', route: '/vendor' },
    { label: 'Profile', description: 'View administrator details and security', icon: 'user', route: '/admin/profile' },
    { label: 'Users', description: 'Review accounts and roles', icon: 'users', route: '/admin/users' },
    { label: 'Vendors', description: 'Approve and supervise vendors', icon: 'briefcase', route: '/admin/vendors' },
    { label: 'Listings', description: 'Review vendor-owned places', icon: 'layers', route: '/admin/listings' },
    { label: 'Content', description: 'Destinations, places, and events', icon: 'layers', route: '/admin/content' },
    { label: 'Settings', description: 'Platform controls', icon: 'settings', route: '/admin/settings' },
  ],
};

export function RoleDashboard({
  role,
  message,
  status,
}: {
  role: DashboardRole;
  message: string;
  status: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const isVendor = role === 'vendor';
  const items = NAVIGATION[role];
  const logout = async () => {
    setLogoutError(null);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      setLogoutError('We could not log you out. Please try again.');
    }
  };
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: Platform.OS === 'web' ? 102 : 118 },
      ]}
    >
      <Text style={[styles.kicker, { color: colors.primary }]}>{isVendor ? 'VENDOR WORKSPACE' : 'PLATFORM CONTROL'}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{isVendor ? 'Your business,\nin one place.' : 'Keep the platform\nmoving well.'}</Text>
      <View style={[styles.statusCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.statusIcon, { backgroundColor: colors.accent }]}>
          <Feather name={isVendor ? 'briefcase' : 'shield'} size={21} color={colors.accentForeground} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{isVendor ? 'Vendor dashboard' : 'Admin dashboard'}</Text>
          <Text style={styles.statusText}>{message}</Text>
        </View>
        <Text style={[styles.statusBadge, { color: colors.accentForeground }]}>{status.toUpperCase()}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>WORKSPACE</Text>
      <View style={styles.navigation}>
        {items.map((item) => (
          <Pressable
            key={item.route}
            testID={`role-nav-${item.label.toLowerCase()}`}
            onPress={() => router.push(item.route as never)}
            style={[styles.navRow, { borderBottomColor: colors.border }]}
          >
            <View style={[styles.navIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.navCopy}>
              <Text style={[styles.navLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.navDescription, { color: colors.mutedForeground }]}>{item.description}</Text>
            </View>
            <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
      {!!logoutError && <Text style={[styles.logoutError, { color: colors.destructive }]}>{logoutError}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log out of ${isVendor ? 'vendor' : 'admin'} workspace`}
        testID="role-dashboard-logout"
        onPress={logout}
        style={styles.logout}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

export function RoleProfileScreen({
  role,
  currentUser,
  vendorProfile,
  profileNotice,
}: {
  role: DashboardRole;
  currentUser?: CurrentUser;
  vendorProfile?: CurrentUser['vendorProfile'];
  profileNotice?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const isVendor = role === 'vendor';
  const profile = vendorProfile ?? currentUser?.vendorProfile;
  const displayName = currentUser?.displayName || currentUser?.email || (isVendor ? 'Vendor account' : 'Administrator account');
  const initials = displayName.slice(0, 1).toUpperCase();

  const logout = async () => {
    setLogoutError(null);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      setLogoutError('We could not log you out. Please try again.');
    }
  };

  const detailRows = isVendor
    ? [
        ['Business', profile?.businessName ?? 'Approved vendor'],
        ['Business type', profile?.businessType ?? '—'],
        ['Contact person', profile?.contactName ?? displayName],
        ['Email', profile?.email ?? currentUser?.email ?? '—'],
        ['Phone', profile?.phone ?? currentUser?.phone ?? '—'],
        ['Address', profile?.address ?? '—'],
        ['Location', profile ? [profile.city, profile.state, profile.country].filter(Boolean).join(', ') : '—'],
        ['Status', profile?.status ?? '—'],
        ['Profile updated', profile ? new Date(profile.updatedAt).toLocaleDateString() : '—'],
      ]
    : [
        ['Email', currentUser?.email ?? '—'],
        ['Access', 'Administrator'],
        ['Account status', currentUser?.status ?? '—'],
        ['Clerk account', currentUser?.clerkUserId ?? '—'],
      ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: Platform.OS === 'web' ? 102 : 118 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Back to ${isVendor ? 'vendor' : 'admin'} dashboard`}
        onPress={() => router.replace(isVendor ? '/vendor' : '/admin')}
        style={styles.back}
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>{isVendor ? 'VENDOR PROFILE' : 'ADMIN PROFILE'}</Text>
      <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{isVendor ? 'Your business profile.' : 'Your administrator profile.'}</Text>
      <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.accentForeground }]}>{initials}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{currentUser?.email ?? 'Account details'}</Text>
        </View>
      </View>
      <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.detailsTitle, { color: colors.foreground }]}>Account details</Text>
        {detailRows.map(([label, value]) => (
          <View key={label} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
          </View>
        ))}
        {isVendor && (
          <View style={styles.approvedStatus}>
            <Feather name="check-circle" size={16} color={colors.primary} />
            <Text style={[styles.approvedText, { color: colors.primary }]}>Vendor access approved</Text>
          </View>
        )}
      </View>
      {!!profileNotice && <Text style={[styles.profileNotice, { color: colors.destructive }]}>{profileNotice}</Text>}
      {!!logoutError && <Text style={[styles.logoutError, { color: colors.destructive }]}>{logoutError}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log out of ${isVendor ? 'vendor' : 'admin'} account`}
        testID={`${role}-profile-logout`}
        onPress={logout}
        style={[styles.profileLogout, { borderColor: colors.border }]}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

export function RoleModuleScreen({
  role,
  title,
  description,
}: {
  role: DashboardRole;
  title: string;
  description: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace(role === 'vendor' ? '/vendor' : '/admin')} style={styles.back}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>{role === 'vendor' ? 'VENDOR WORKSPACE' : 'PLATFORM CONTROL'}</Text>
      <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name="clock" size={24} color={colors.primary} />
        <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>Module foundation ready</Text>
        <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8, marginBottom: 24 },
  statusCard: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  statusIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, marginLeft: 12, marginRight: 8 },
  statusTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusText: { color: 'rgba(255,255,255,0.72)', fontSize: 11, lineHeight: 16, marginTop: 4 },
  statusBadge: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10 },
  navigation: { borderTopWidth: 1 },
  navRow: { borderBottomWidth: 1, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' },
  navIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navCopy: { flex: 1, marginLeft: 13 },
  navLabel: { fontSize: 14, fontWeight: '700' },
  navDescription: { fontSize: 12, marginTop: 3 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  backText: { fontSize: 14, fontWeight: '700' },
  moduleTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8, marginBottom: 24 },
  placeholder: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  placeholderTitle: { fontSize: 16, fontWeight: '700', marginTop: 14 },
  placeholderText: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  logoutError: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
  logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, padding: 20 },
  logoutText: { fontSize: 13, fontWeight: '700' },
  profileCard: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 18 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileCopy: { flex: 1, marginLeft: 12 },
  profileName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  profileEmail: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 4 },
  detailsCard: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 4 },
  detailsTitle: { fontSize: 16, fontWeight: '700', paddingVertical: 14 },
  detailRow: { borderBottomWidth: 1, paddingVertical: 13, gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7 },
  detailValue: { fontSize: 14, lineHeight: 20 },
  approvedStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  approvedText: { fontSize: 13, fontWeight: '700' },
  profileNotice: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  profileLogout: { minHeight: 50, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
});
