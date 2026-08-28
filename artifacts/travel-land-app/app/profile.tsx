import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}><View style={styles.header}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text><View style={{ width: 21 }} /></View><View style={[styles.profile, { backgroundColor: colors.primary }]}><View style={[styles.avatar, { backgroundColor: colors.accent }]}><Text style={[styles.avatarText, { color: colors.accentForeground }]}>A</Text></View><Text style={styles.name}>Your traveller profile</Text><Text style={styles.email}>Sign in to save your plans across devices</Text><Pressable style={[styles.signIn, { backgroundColor: colors.card }]} onPress={() => router.push('/booking')}><Text style={[styles.signInText, { color: colors.foreground }]}>Sign in / create account</Text></Pressable></View>{['My bookings', 'Wallet & payments', 'Become a property partner', 'Help & support'].map((item, index) => <Pressable key={item} style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => index === 0 ? router.push('/booking') : undefined}><View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}><Feather name={['calendar', 'credit-card', 'home', 'help-circle'][index] as React.ComponentProps<typeof Feather>['name']} size={17} color={colors.primary} /></View><Text style={[styles.rowText, { color: colors.foreground }]}>{item}</Text><Feather name="chevron-right" size={17} color={colors.mutedForeground} /></Pressable>)}</ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  profile: { borderRadius: 22, padding: 20, marginBottom: 26 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 19 },
  email: { color: 'rgba(255,255,255,0.73)', fontSize: 13, marginTop: 5 },
  signIn: { borderRadius: 100, alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 11, marginTop: 18 },
  signInText: { fontSize: 12, fontWeight: '700' },
  row: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, marginLeft: 13, fontSize: 14, fontWeight: '600' },
});