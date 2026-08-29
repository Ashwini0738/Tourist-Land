import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function ReviewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>REVIEWS</Text><Text style={[styles.title, { color: colors.foreground }]}>Share what{'\n'}stayed with you.</Text><View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="star" size={24} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reviews to write yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>After a completed trip, your review invitation will appear here.</Text><Pressable onPress={() => router.push('/bookings')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>View bookings</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 34, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  empty: { borderWidth: 1, borderRadius: 21, alignItems: 'center', padding: 28, marginTop: 28 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 15 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  button: { borderRadius: 100, paddingHorizontal: 17, paddingVertical: 11, marginTop: 19 },
  buttonText: { fontSize: 12, fontWeight: '700' },
});