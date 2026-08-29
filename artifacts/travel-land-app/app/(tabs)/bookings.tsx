import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const tabs = ['Upcoming', 'Past', 'Cancelled'];

export default function BookingsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState('Upcoming');
  const isUpcoming = activeTab === 'Upcoming';
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}><Text style={[styles.kicker, { color: colors.primary }]}>YOUR TRIPS</Text><Text style={[styles.title, { color: colors.foreground }]}>My bookings.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Every plan, all in one place.</Text><View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>{tabs.map((tab) => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.segmentButton, activeTab === tab && { backgroundColor: colors.primary }]}><Text style={[styles.segmentText, { color: activeTab === tab ? colors.primaryForeground : colors.mutedForeground }]}>{tab}</Text></Pressable>)}</View>{isUpcoming ? <Pressable onPress={() => router.push('/booking')} style={[styles.booking, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.date, { backgroundColor: colors.secondary }]}><Text style={[styles.month, { color: colors.primary }]}>OCT</Text><Text style={[styles.day, { color: colors.foreground }]}>18</Text></View><View style={styles.bookingCopy}><View style={styles.bookingTop}><Text style={[styles.bookingName, { color: colors.foreground }]}>The Mango House</Text><Feather name="more-horizontal" size={18} color={colors.mutedForeground} /></View><Text style={[styles.bookingLocation, { color: colors.mutedForeground }]}>Alibaug · 3 nights</Text><View style={styles.bookingBottom}><Text style={[styles.status, { color: colors.primary }]}>CONFIRMED</Text><Text style={[styles.bookingPrice, { color: colors.foreground }]}>₹23,400</Text></View></View></Pressable> : <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name={activeTab === 'Past' ? 'clock' : 'x-circle'} size={24} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No {activeTab.toLowerCase()} trips</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your {activeTab.toLowerCase()} bookings will appear here.</Text></View>}<Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.browseButton, { borderColor: colors.border }]}><Feather name="search" size={16} color={colors.primary} /><Text style={[styles.browseText, { color: colors.primary }]}>Find your next stay</Text></Pressable></ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginTop: 8, marginBottom: 24 },
  segment: { borderWidth: 1, borderRadius: 14, padding: 4, flexDirection: 'row', marginBottom: 16 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segmentText: { fontSize: 11, fontWeight: '700' },
  booking: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row' },
  date: { width: 58, height: 70, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  month: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  day: { fontSize: 25, fontWeight: '700', marginTop: 3 },
  bookingCopy: { flex: 1, marginLeft: 13 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between' },
  bookingName: { fontSize: 15, fontWeight: '700' },
  bookingLocation: { fontSize: 12, marginTop: 5 },
  bookingBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 },
  status: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bookingPrice: { fontSize: 13, fontWeight: '700' },
  empty: { borderWidth: 1, borderRadius: 20, alignItems: 'center', padding: 30 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  emptyText: { fontSize: 13, marginTop: 6 },
  browseButton: { borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 15 },
  browseText: { fontSize: 13, fontWeight: '700' },
});