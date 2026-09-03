import { useMobileAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function SecureStorageRecovery({ onRetry }: { onRetry: () => Promise<void> }) {
  const colors = useColors();
  const { signOut } = useMobileAuth();
  const router = useRouter();
  const [action, setAction] = useState<'retrying' | 'signing-out' | null>(null);
  const [message, setMessage] = useState('');

  const retry = async () => {
    if (action) return;
    setAction('retrying');
    setMessage('');
    try {
      await onRetry();
    } catch {
      setMessage('We could not securely access your device settings yet. Please try again.');
    } finally {
      setAction(null);
    }
  };

  const leave = async () => {
    if (action) return;
    setAction('signing-out');
    setMessage('');
    try {
      await signOut();
      router.replace('/login');
    } catch {
      setMessage('We could not sign you out. Please try again.');
      setAction(null);
    }
  };

  return (
    <View testID="secure-storage-recovery" style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.kicker, { color: colors.primary }]}>DEVICE SECURITY</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Unable to verify device security</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        We couldn’t securely access your device security settings. Travel & Land has kept your protected session locked.
      </Text>
      {!!message && <Text style={[styles.message, { color: colors.destructive }]}>{message}</Text>}
      <Pressable
        testID="secure-storage-retry"
        accessibilityRole="button"
        disabled={Boolean(action)}
        onPress={() => void retry()}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        {action === 'retrying' ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Retry</Text>}
      </Pressable>
      <Pressable
        testID="secure-storage-sign-out"
        accessibilityRole="button"
        disabled={Boolean(action)}
        onPress={() => void leave()}
        style={[styles.secondaryButton, { borderColor: colors.border }]}
      >
        {action === 'signing-out' ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Sign out and return to Login</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: 24 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  message: { fontSize: 13, lineHeight: 18, marginTop: 16 },
  primaryButton: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  secondaryButton: { minHeight: 54, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
});