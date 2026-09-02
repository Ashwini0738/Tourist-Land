import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useColors } from '@/hooks/useColors';
import { SecurityIcon } from '@/components/SecurityIcon';

export default function BiometricLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unlock } = useAuthSecurity();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const attemptedRef = useRef(false);

  const authenticate = async () => {
    if (loading) return;
    if (Platform.OS === 'web') return setMessage('Device authentication is available in the Travel & Land mobile app.');
    setLoading(true);
    try {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Travel & Land',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });
      if (!r.success) return setMessage('Device authentication was cancelled or unsuccessful. Try again to use your device security.');
      await unlock();
    } catch {
      setMessage('Device authentication could not be completed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    authenticate();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}>
      <View style={{alignItems: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <SecurityIcon name="compass" size={36} color="#064E3B" />
          <Text style={{fontSize: 20, fontWeight: 'bold', color: colors.foreground, letterSpacing: 1}}>TRAVEL & LAND</Text>
        </View>
      </View>

      <View style={{alignItems: 'flex-start', marginTop: 40}}>
        <Text style={{fontSize: 26, fontWeight: '700', color: '#064E3B'}}>Welcome back</Text>
        <Text style={{fontSize: 18, color: colors.foreground, marginTop: 4}}>Confirm it’s you to continue</Text>
      </View>

      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Unlock with fingerprint or Face ID" onPress={authenticate} style={{flexDirection: 'row', alignItems: 'center', minHeight: 96}}>
          <SecurityIcon name="fingerprint" size={80} color={colors.foreground} />
          <View style={{paddingHorizontal: 24, alignItems: 'center'}}>
             <View style={{width: 1, height: 30, backgroundColor: colors.border}} />
             <Text style={{marginVertical: 12, color: colors.foreground, fontWeight: '700'}}>OR</Text>
             <View style={{width: 1, height: 30, backgroundColor: colors.border}} />
          </View>
          <SecurityIcon name="face" size={80} color={colors.foreground} />
        </Pressable>
        <Text style={{marginTop: 40, fontSize: 16, color: colors.foreground, fontWeight: '500'}}>Tap to Unlock With Biometrics</Text>
      </View>

      <View>
        {loading && <ActivityIndicator style={{marginBottom: 16}} color="#064E3B" />}
        {!!message && <Text style={{color: colors.destructive, textAlign: 'center', marginBottom: 16}}>{message}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Try device authentication again" onPress={authenticate} style={{backgroundColor: '#064E3B', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>Try device authentication again</Text>
        </Pressable>
      </View>
    </View>
  );
}
