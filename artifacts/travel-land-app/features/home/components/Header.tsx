import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { useHomeLocation } from '../hooks/useHomeLocation';
import { SecurityIcon } from '@/components/SecurityIcon';
import { getGetUnreadNotificationCountQueryKey, useGetUnreadNotificationCount } from '@workspace/api-client-react';
import { radii, spacing, typeScale } from '@/constants/theme';
import colors from '@/constants/colors';

export function Header() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { locationName, loading, hasPermission, requestPermission } = useHomeLocation();
  const unreadQuery = useGetUnreadNotificationCount({ query: { queryKey: getGetUnreadNotificationCountQueryKey(), staleTime: 30_000, refetchInterval: 60_000 } });
  const unreadCount = unreadQuery.data?.count ?? 0;

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  const firstName = user?.firstName || 'Explorer';

  return (
    <View style={styles.header}>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View>
          <View><Text style={styles.brandName}>TRAVEL & LAND</Text><Text style={styles.brandCaption}>STORIES WORTH THE DETOUR</Text></View>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} onPress={() => router.push('/notifications')} style={styles.headerAction}>
            <Feather name="bell" size={19} color="#fff" />
            {unreadCount > 0 ? <View style={styles.notificationDot}><Text style={styles.notificationText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')} style={styles.headerAction}>
            <Feather name="user" size={19} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Choose your location" onPress={!hasPermission ? requestPermission : undefined} style={styles.locationRow}>
        <View style={styles.locationIcon}><SecurityIcon name="location" size={16} color={colors.light.navy} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locationName}>
            {hasPermission ? (loading ? 'Finding your location…' : (locationName || 'Your location')) : 'Discover India'}
          </Text>
          <Text style={styles.locationCaption}>{hasPermission ? 'Current location' : 'Share location for nearby places'}</Text>
        </View>
        {!hasPermission && <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.6)" />}
      </Pressable>

      <View style={styles.copy}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{firstName}</Text>
        <Text style={styles.prompt}>Where will you explore today?</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.light.navy, paddingHorizontal: spacing.lg, paddingBottom: 44, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.light.accent, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.light.accentForeground, fontSize: 18, fontWeight: '800' },
  brandName: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  brandCaption: { color: 'rgba(255,255,255,0.48)', fontSize: 7, fontWeight: '700', letterSpacing: 0.7, marginTop: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  headerAction: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: 2, right: 1, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.coral, borderWidth: 2, borderColor: colors.light.navy },
  notificationText: { color: '#fff', fontSize: 7, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingVertical: 9, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.09)' },
  locationIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.light.accent, alignItems: 'center', justifyContent: 'center' },
  locationName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  locationCaption: { color: 'rgba(255,255,255,0.54)', fontSize: 10, marginTop: 2 },
  copy: { marginTop: spacing.xl },
  greeting: { color: 'rgba(255,255,255,0.62)', fontSize: 16, lineHeight: 21 },
  name: { color: '#fff', ...typeScale.display, marginTop: 2 },
  prompt: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 9 },
});
