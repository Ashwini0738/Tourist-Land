import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function BookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}><View style={styles.header}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Plan your stay</Text><View style={{ width: 21 }} /></View><Text style={[styles.title, { color: colors.foreground }]}>A few details, then{'\n'}we’ll take it from here.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>This preview flow shows where availability, guest details, and secure payment will connect.</Text><View style={[styles.step, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.stepNumber, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>1</Text></View><View style={styles.stepCopy}><Text style={[styles.stepTitle, { color: colors.foreground }]}>Choose your dates</Text><Text style={[styles.stepText, { color: colors.mutedForeground }]}>Availability will be checked in real time.</Text></View><Feather name="calendar" size={18} color={colors.primary} /></View><View style={[styles.step, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.stepNumber, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.primary, fontWeight: '700' }}>2</Text></View><View style={styles.stepCopy}><Text style={[styles.stepTitle, { color: colors.foreground }]}>Tell us who’s coming</Text><Text style={[styles.stepText, { color: colors.mutedForeground }]}>Guest details and preferences stay in one place.</Text></View><Feather name="users" size={18} color={colors.primary} /></View><Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue when ready</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable><Text style={[styles.note, { color: colors.mutedForeground }]}>Payments are not connected in this MVP preview.</Text></ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 28 },
  step: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepCopy: { flex: 1, marginLeft: 12 },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  button: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 16 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  note: { textAlign: 'center', fontSize: 12, marginTop: 15 },
});