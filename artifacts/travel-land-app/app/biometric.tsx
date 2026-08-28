import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function BiometricScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.body}><View style={[styles.bioIcon, { backgroundColor: colors.secondary }]}><Feather name="eye" size={28} color={colors.primary} /></View><Text style={[styles.title, { color: colors.foreground }]}>Make coming back easy.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Use Face ID or fingerprint to sign in securely. You can always use your PIN instead.</Text><Pressable onPress={() => router.replace('/(tabs)')} style={[styles.button, { backgroundColor: colors.primary }]}><Feather name="shield" size={17} color={colors.primaryForeground} /><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Enable biometrics</Text></Pressable><Pressable onPress={() => router.replace('/(tabs)')} style={styles.secondary}><Text style={[styles.secondaryText, { color: colors.primary }]}>Use PIN instead</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  body: { marginTop: 105 },
  bioIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 11 },
  button: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 28 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 19 },
  secondaryText: { fontSize: 13, fontWeight: '700' },
});