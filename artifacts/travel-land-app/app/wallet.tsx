import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>WALLET</Text><Text style={[styles.title, { color: colors.foreground }]}>A softer way{'\n'}to keep track.</Text><View style={[styles.balance, { backgroundColor: colors.primary }]}><Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text><Text style={styles.amount}>₹0.00</Text><Text style={styles.balanceNote}>Add money or earn credits from future stays.</Text></View><View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text><Pressable><Text style={[styles.link, { color: colors.primary }]}>See all</Text></Pressable></View><View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}><Feather name="credit-card" size={23} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No wallet activity yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your booking credits and refunds will show here.</Text></View></ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 33, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  balance: { borderRadius: 22, padding: 20, marginTop: 25 },
  balanceLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  amount: { color: '#fff', fontSize: 34, fontWeight: '700', marginTop: 17 },
  balanceNote: { color: 'rgba(255,255,255,0.73)', fontSize: 12, marginTop: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 29, marginBottom: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  link: { fontSize: 13, fontWeight: '700' },
  empty: { borderWidth: 1, borderRadius: 19, alignItems: 'center', padding: 26 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 6 },
});