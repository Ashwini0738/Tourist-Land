import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function CreatePinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const ready = pin.length === 4 && confirm.length === 4 && pin === confirm;
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.body}><Text style={[styles.kicker, { color: colors.primary }]}>KEEP IT PERSONAL</Text><Text style={[styles.title, { color: colors.foreground }]}>Create a 4-digit PIN.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>You’ll use this as a quick fallback when Face ID or fingerprint isn’t available.</Text><TextInput testID="pin-input" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="PIN" placeholderTextColor={colors.mutedForeground} style={[styles.pin, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} /><TextInput testID="pin-confirm-input" value={confirm} onChangeText={setConfirm} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="Confirm PIN" placeholderTextColor={colors.mutedForeground} style={[styles.pin, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} /><Pressable disabled={!ready} onPress={() => router.push('/biometric')} style={[styles.button, { backgroundColor: ready ? colors.primary : colors.muted }]}><Text style={[styles.buttonText, { color: ready ? colors.primaryForeground : colors.mutedForeground }]}>Create PIN</Text><Feather name="arrow-right" size={17} color={ready ? colors.primaryForeground : colors.mutedForeground} /></Pressable></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  body: { marginTop: 104 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 9 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 11 },
  pin: { height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, marginTop: 20 },
  button: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 13 },
  buttonText: { fontSize: 14, fontWeight: '700' },
});