import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useColors } from '@/hooks/useColors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BiometricLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unlock } = useAuthSecurity();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const authenticate = async () => {
    if (Platform.OS === 'web') return setMessage('Use your PIN to unlock on the web.');
    setLoading(true);
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Travel & Land', fallbackLabel: 'Use PIN' });
    setLoading(false);
    if (!r.success) return setMessage('We could not confirm your identity. Please use your PIN.');
    await unlock();
    router.replace('/(tabs)');
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}>
      <View style={{alignItems: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <MaterialCommunityIcons name="compass-outline" size={36} color="#064E3B" />
          <Text style={{fontSize: 20, fontWeight: 'bold', color: colors.foreground, letterSpacing: 1}}>TRAVEL & LAND</Text>
        </View>
      </View>

      <View style={{alignItems: 'flex-start', marginTop: 40}}>
        <Text style={{fontSize: 26, fontWeight: '700', color: '#064E3B'}}>Welcome back</Text>
        <Text style={{fontSize: 18, color: colors.foreground, marginTop: 4}}>Confirm it’s you to continue</Text>
      </View>

      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Unlock with fingerprint or Face ID" onPress={authenticate} style={{flexDirection: 'row', alignItems: 'center', minHeight: 96}}>
          <MaterialCommunityIcons name="fingerprint" size={80} color={colors.foreground} />
          <View style={{paddingHorizontal: 24, alignItems: 'center'}}>
             <View style={{width: 1, height: 30, backgroundColor: colors.border}} />
             <Text style={{marginVertical: 12, color: colors.foreground, fontWeight: '700'}}>OR</Text>
             <View style={{width: 1, height: 30, backgroundColor: colors.border}} />
          </View>
          <MaterialCommunityIcons name="face-recognition" size={80} color={colors.foreground} />
        </Pressable>
        <Text style={{marginTop: 40, fontSize: 16, color: colors.foreground, fontWeight: '500'}}>Tap to Unlock With Biometrics</Text>
      </View>

      <View>
        {loading && <ActivityIndicator style={{marginBottom: 16}} color="#064E3B" />}
        {!!message && <Text style={{color: colors.destructive, textAlign: 'center', marginBottom: 16}}>{message}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Use mobile PIN instead" onPress={() => router.replace('/pin-login')} style={{backgroundColor: '#064E3B', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>Use PIN instead</Text>
        </Pressable>
      </View>
    </View>
  );
}
