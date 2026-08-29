import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}><View style={styles.header}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text><View style={{ width: 21 }} /></View><Text style={[styles.kicker, { color: colors.primary }]}>TODAY</Text><View style={[styles.notification, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="compass" size={17} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>A new place to slow down</Text><Text style={[styles.text, { color: colors.mutedForeground }]}>Explore the quiet coves of the Konkan Coast this season.</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>2 hours ago</Text></View></View><Text style={[styles.kicker, { color: colors.primary, marginTop: 27 }]}>EARLIER</Text><View style={[styles.notification, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: colors.muted }]}><Feather name="heart" size={17} color={colors.destructive} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>Your collection is yours</Text><Text style={[styles.text, { color: colors.mutedForeground }]}>Save destinations and land parcels to find them quickly later.</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>Yesterday</Text></View></View></ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  notification: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12 },
  title: { fontSize: 14, fontWeight: '700' },
  text: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  time: { fontSize: 11, marginTop: 9 },
});