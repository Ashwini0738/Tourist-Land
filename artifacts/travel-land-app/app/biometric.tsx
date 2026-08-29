import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useColors } from '@/hooks/useColors';

export default function BiometricScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setBiometricsEnabled, setDeviceAuthSetupComplete, unlock } = useAuthSecurity();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const availabilityChecked = useRef(false);

  useEffect(() => {
    if (availabilityChecked.current || Platform.OS === 'web') return;
    availabilityChecked.current = true;
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hardware, enrolled]) => {
        if (!hardware || !enrolled) {
          setMessage('Face ID or fingerprint is not enrolled. Your device passcode may still be available.');
        }
      })
      .catch(() => setMessage('Device security availability could not be checked. You can try the system prompt anyway.'));
  }, []);

  const enable = async () => {
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      if (Platform.OS === 'web') {
        await setBiometricsEnabled(false);
      } else {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable Travel & Land device unlock',
          fallbackLabel: 'Use device passcode',
          disableDeviceFallback: false,
        });
        if (!result.success) {
          setMessage('Device authentication was not completed. You can try again or skip for now.');
          return;
        }
        await setBiometricsEnabled(true);
      }
      await setDeviceAuthSetupComplete(true);
      await unlock();
      router.replace('/(tabs)');
    } catch {
      setMessage('Device security setup could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      await setBiometricsEnabled(false);
      await setDeviceAuthSetupComplete(true);
      await unlock();
      router.replace('/(tabs)');
    } catch {
      setMessage('We could not save this device preference. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <Pressable disabled={loading} onPress={() => router.back()}>
        <Feather name="arrow-left" size={21} color={colors.foreground} />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>Make coming back easy.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Use Face ID, fingerprint, or your device passcode to unlock securely. Travel & Land never sees or stores your device credential.
        </Text>
        {!!message && <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>}
        <Pressable disabled={loading} onPress={enable} style={[styles.button, { backgroundColor: colors.primary }]}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Enable device security</Text>}
        </Pressable>
        <Pressable disabled={loading} onPress={skip}>
          <Text style={[styles.alt, { color: colors.primary }]}>{loading ? 'Continuing…' : 'Skip for now'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  body: { marginTop: 105 },
  title: { fontSize: 30, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 11 },
  message: { fontSize: 13, lineHeight: 19, marginTop: 16 },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  alt: { textAlign: 'center', fontSize: 13, fontWeight: '700', marginTop: 19 },
});