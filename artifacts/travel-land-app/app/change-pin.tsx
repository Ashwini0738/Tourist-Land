import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useColors } from '@/hooks/useColors';

export default function ChangePinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { callPinEndpoint } = useAuthSecurity();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const ready = currentPin.length === 4 && newPin.length === 4 && confirmPin.length === 4;

  const submit = async () => {
    setMessage('');
    if (newPin !== confirmPin) return setMessage('Your new PINs do not match.');
    if (currentPin === newPin) return setMessage('Choose a new PIN that is different from your current PIN.');
    setLoading(true);
    const result = await callPinEndpoint('/api/v1/auth/change-pin', { currentPin, newPin });
    setLoading(false);
    if (!result.ok) return setMessage(result.message ?? 'We could not change your PIN.');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setMessage('Your PIN was changed securely.');
  };

  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
    <Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
    <View style={styles.body}>
      <Text style={[styles.kicker, { color: colors.primary }]}>ACCOUNT SECURITY</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Change your PIN.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Confirm your current PIN before choosing a new four-digit PIN.</Text>
      <PinInput value={currentPin} onChangeText={setCurrentPin} placeholder="Current PIN" colors={colors} />
      <PinInput value={newPin} onChangeText={setNewPin} placeholder="New PIN" colors={colors} />
      <PinInput value={confirmPin} onChangeText={setConfirmPin} placeholder="Confirm new PIN" colors={colors} />
      {!!message && <Text style={[styles.message, { color: message.includes('securely') ? colors.primary : colors.destructive }]}>{message}</Text>}
      <Pressable disabled={!ready || loading} onPress={submit} style={[styles.button, { backgroundColor: ready ? colors.primary : colors.muted }]}>
        {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Change PIN</Text>}
      </Pressable>
    </View>
  </View>;
}

function PinInput({ value, onChangeText, placeholder, colors }: { value: string; onChangeText: (value: string) => void; placeholder: string; colors: ReturnType<typeof useColors> }) {
  return <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder={placeholder} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  body: { marginTop: 72 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 9 },
  title: { fontSize: 30, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 11, marginBottom: 8 },
  input: { height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, marginTop: 12 },
  message: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { fontSize: 14, fontWeight: '700' },
});