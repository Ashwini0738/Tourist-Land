import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [code, setCode] = React.useState('');
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.body}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="smartphone" size={22} color={colors.primary} /></View><Text style={[styles.title, { color: colors.foreground }]}>Check your messages.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>We sent a six-digit verification code. This wireframe accepts any six digits.</Text><TextInput testID="verification-code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={colors.mutedForeground} style={[styles.code, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} /><Pressable onPress={() => router.push('/create-pin')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Verify and continue</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable><Pressable><Text style={[styles.resend, { color: colors.primary }]}>Resend code</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  body: { marginTop: 105 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 310 },
  code: { height: 61, borderWidth: 1, borderRadius: 16, fontSize: 25, fontWeight: '700', letterSpacing: 10, textAlign: 'center', marginTop: 26 },
  button: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 13 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  resend: { textAlign: 'center', fontSize: 13, fontWeight: '700', marginTop: 19 },
});