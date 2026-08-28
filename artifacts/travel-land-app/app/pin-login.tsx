import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function PinLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = React.useState('');
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.body}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="lock" size={22} color={colors.primary} /></View><Text style={[styles.title, { color: colors.foreground }]}>Welcome back.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Enter your PIN to continue to Travel & Land.</Text><TextInput testID="login-pin-input" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="••••" placeholderTextColor={colors.mutedForeground} style={[styles.pin, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} /><Pressable disabled={pin.length < 4} onPress={() => router.replace('/(tabs)')} style={[styles.button, { backgroundColor: pin.length === 4 ? colors.primary : colors.muted }]}><Text style={[styles.buttonText, { color: pin.length === 4 ? colors.primaryForeground : colors.mutedForeground }]}>Unlock</Text><Feather name="arrow-right" size={17} color={pin.length === 4 ? colors.primaryForeground : colors.mutedForeground} /></Pressable><Pressable onPress={() => router.push('/biometric-login')} style={styles.secondary}><Feather name="eye" size={15} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>Use Face ID / fingerprint</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  body: { marginTop: 105 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  pin: { height: 61, borderWidth: 1, borderRadius: 16, fontSize: 25, letterSpacing: 10, textAlign: 'center', marginTop: 27 },
  button: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 13 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 21 },
  secondaryText: { fontSize: 13, fontWeight: '700' },
});