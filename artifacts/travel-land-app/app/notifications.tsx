import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import {
  getGetUnreadNotificationCountQueryKey,
  getListNotificationsQueryKey,
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRegisterPushToken,
  type Notification,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import * as Notifications from 'expo-notifications';
import { DemoBadge } from '@/components/DemoBadge';

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function iconFor(type: Notification['type']) {
  if (type.includes('payment')) return 'credit-card';
  if (type.includes('booking')) return 'calendar';
  if (type === 'land_enquiry_updated') return 'map';
  return 'bell';
}

function openRelated(item: Notification) {
  if (!item.relatedId) return;
  if (item.relatedType === 'booking') router.push({ pathname: '/booking/[reference]', params: { reference: item.relatedId } } as any);
  else if (item.relatedType === 'hotel') router.push(`/hotel/${item.relatedId}` as any);
  else if (item.relatedType === 'destination') router.push(`/destination/${item.relatedId}` as any);
  else if (item.relatedType === 'property') router.push(`/property/${item.relatedId}` as any);
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Notification[]>([]);
  const listQuery = useListNotifications({ page, limit: 20 }, { query: { queryKey: getListNotificationsQueryKey({ page, limit: 20 }), staleTime: 30_000 } });
  const readMutation = useMarkNotificationRead();
  const readAllMutation = useMarkAllNotificationsRead();
  const pushMutation = useRegisterPushToken();
  const [pushMessage, setPushMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!listQuery.data) return;
    setItems((current) => page === 1 ? listQuery.data.items : [...current, ...listQuery.data.items.filter((item) => !current.some((old) => old.id === item.id))]);
  }, [listQuery.data, page]);

  const markReadAndOpen = async (item: Notification) => {
    if (!item.readAt) {
      await readMutation.mutateAsync({ id: item.id });
      setItems((current) => current.map((old) => old.id === item.id ? { ...old, readAt: new Date().toISOString() } : old));
      void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
    }
    openRelated(item);
  };

  const markAll = async () => {
    await readAllMutation.mutateAsync();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    await queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
  };

  const enablePush = async () => {
    if (Platform.OS === 'web') {
      setPushMessage('Native push registration is available in the Android or iOS app.');
      return;
    }
    try {
      const current = await Notifications.getPermissionsAsync();
      const permissions = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (!permissions.granted) {
        setPushMessage('Push permission was not granted. You can enable it later in device settings.');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await pushMutation.mutateAsync({ data: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
      setPushMessage('This device is registered for future booking updates.');
    } catch {
      setPushMessage('Push registration is unavailable on this build. In-app updates still work.');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={listQuery.isRefetching} onRefresh={() => { setPage(1); void listQuery.refetch(); }} tintColor={colors.primary} />}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <Pressable accessibilityRole="button" disabled={readAllMutation.isPending || !items.some((item) => !item.readAt)} onPress={() => void markAll()}><Text style={[styles.readAll, { color: colors.primary, opacity: items.some((item) => !item.readAt) ? 1 : 0.4 }]}>Read all</Text></Pressable>
      </View>
      <Text style={[styles.kicker, { color: colors.primary }]}>ACCOUNT UPDATES</Text>
      <DemoBadge label="Demo account data" />
      <View style={[styles.pushCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.pushCopy}><Text style={[styles.pushTitle, { color: colors.foreground }]}>Stay close to real updates</Text><Text style={[styles.pushText, { color: colors.mutedForeground }]}>Enable native notifications when you are ready. Travel & Land does not send fake or sample pushes.</Text></View><Pressable disabled={pushMutation.isPending} onPress={() => void enablePush()} style={[styles.pushButton, { borderColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primary }]}>{pushMutation.isPending ? 'Registering…' : 'Enable'}</Text></Pressable></View>
      {pushMessage ? <Text style={[styles.pushMessage, { color: colors.mutedForeground }]}>{pushMessage}</Text> : null}
      {listQuery.isLoading && !items.length ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>Loading your updates…</Text></View> : null}
      {listQuery.isError ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="alert-circle" size={24} color={colors.destructive} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Updates are unavailable</Text><Text style={[styles.helper, { color: colors.mutedForeground }]}>Try again when your connection is steadier.</Text><Pressable onPress={() => void listQuery.refetch()} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Try again</Text></Pressable></View> : null}
      {!listQuery.isLoading && !items.length && !listQuery.isError ? <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="bell" size={24} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>You’re all caught up</Text><Text style={[styles.helper, { color: colors.mutedForeground }]}>Booking and payment updates will appear here when something real changes.</Text></View> : null}
      {items.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => void markReadAndOpen(item)} style={[styles.notification, { backgroundColor: item.readAt ? colors.card : colors.secondary, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: item.readAt ? colors.muted : colors.card }]}><Feather name={iconFor(item.type)} size={17} color={colors.primary} /></View><View style={styles.copy}><View style={styles.titleRow}><Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>{!item.readAt ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}</View><Text style={[styles.text, { color: colors.mutedForeground }]}>{item.message}</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>{relativeTime(item.createdAt)}</Text></View></Pressable>)}
      {listQuery.data?.hasMore ? <Pressable disabled={listQuery.isFetching} onPress={() => setPage((value) => value + 1)} style={[styles.loadMore, { borderColor: colors.border }]}><Text style={[styles.buttonText, { color: colors.primary }]}>{listQuery.isFetching ? 'Loading…' : 'Load older updates'}</Text></Pressable> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  readAll: { fontSize: 12, fontWeight: '800' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  notification: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row', marginBottom: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 7 },
  text: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  time: { fontSize: 11, marginTop: 9 },
  loading: { alignItems: 'center', padding: 30 },
  helper: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 9 },
  empty: { borderWidth: 1, borderRadius: 20, alignItems: 'center', padding: 28, marginTop: 8 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 15 },
  button: { borderRadius: 100, paddingHorizontal: 17, paddingVertical: 11, marginTop: 19 },
  buttonText: { fontSize: 12, fontWeight: '700' },
  loadMore: { borderWidth: 1, borderRadius: 100, alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  pushCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 19 },
  pushCopy: { flex: 1, paddingRight: 10 },
  pushTitle: { fontSize: 13, fontWeight: '800' },
  pushText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  pushButton: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 13, paddingVertical: 9 },
  pushMessage: { fontSize: 11, marginTop: -10, marginBottom: 13 },
});