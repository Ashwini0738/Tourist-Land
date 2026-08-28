import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useColors } from '@/hooks/useColors';

export default function PinLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { callPinEndpoint, unlock, biometricsEnabled } = useAuthSecurity();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const submit = async () => {
    setLoading(true);
    setMessage('');
    const r = await callPinEndpoint('/api/v1/auth/login-pin', { pin });
    setLoading(false);
    if (!r.ok) return setMessage(r.message || 'That PIN did not match.');
    await unlock();
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}>
        <Feather name="arrow-left" size={24} color={colors.foreground} />
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <MaterialCommunityIcons name="lock-outline" size={48} color="#064E3B" />
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground, marginTop: 16 }}>Enter PIN</Text>
        <Text style={{ fontSize: 16, color: colors.mutedForeground, marginTop: 8 }}>Unlock Travel & Land</Text>
      </View>

      <View style={{ marginTop: 56, alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Enter four digit mobile PIN" style={{ flexDirection: 'row', gap: 16 }} onPress={() => inputRef.current?.focus()}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: 64, height: 76, borderRadius: 16, borderWidth: 2, borderColor: pin.length > i ? '#064E3B' : colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              {pin.length > i && <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#064E3B' }} />}
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          autoFocus
          accessibilityLabel="Four digit mobile PIN"
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />
      </View>

      {!!message && <Text style={{ color: colors.destructive, textAlign: 'center', marginTop: 24 }}>{message}</Text>}

      <View style={{ marginTop: 'auto' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Unlock Travel and Land" disabled={pin.length !== 4 || loading} onPress={submit} style={{ backgroundColor: pin.length === 4 ? '#064E3B' : colors.muted, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Unlock</Text>}
        </Pressable>
        {biometricsEnabled && (
          <Pressable onPress={() => router.push('/biometric-login')} style={{ marginTop: 24, alignItems: 'center', padding: 8 }}>
            <Text style={{ color: '#064E3B', fontSize: 15, fontWeight: '700' }}>Use Face ID / Fingerprint</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
