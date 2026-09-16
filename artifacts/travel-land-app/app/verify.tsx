import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useSignUp } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type ClerkErrorLike = { code?: string };

function verificationErrorMessage(error: unknown, fallback: string) {
  const code = (error as ClerkErrorLike | null)?.code?.toLowerCase() ?? '';
  if (code.includes('verification_code_expired') || code.includes('code_expired')) {
    return 'That verification code has expired. Request a new code and try again.';
  }
  if (code.includes('verification_code_invalid') || code.includes('invalid_code') || code.includes('incorrect_code')) {
    return 'That verification code is incorrect. Check the code and try again.';
  }
  if (code.includes('too_many') || code.includes('rate_limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return fallback;
}

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp, fetchStatus } = useSignUp();
  const params = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const loading = fetchStatus === 'fetching' || isVerifying || isResending;
  const email = typeof params.email === 'string' ? params.email : '';

  const verify = async () => {
    if (isVerifying || code.length !== 6) return;
    setMessage('');
    setIsVerifying(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setMessage(verificationErrorMessage(error, 'That code did not work. Please try again.'));
        return;
      }
      if (signUp.status !== 'complete') {
        setMessage('The code was accepted, but account setup is not complete yet. Please try again.');
        return;
      }
      const finalization = await signUp.finalize({});
      if (finalization?.error) {
        setMessage(verificationErrorMessage(finalization.error, 'We could not complete your account. Please try again.'));
      }
    } catch (error) {
      setMessage(verificationErrorMessage(error, 'We could not verify your email. Please try again.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (isResending) return;
    setMessage('');
    setIsResending(true);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setMessage(verificationErrorMessage(error, 'We could not send a new verification code. Please try again.'));
      } else {
        setMessage('A new verification code was sent.');
      }
    } catch (error) {
      setMessage(verificationErrorMessage(error, 'We could not send a new verification code. Please try again.'));
    } finally {
      setIsResending(false);
    }
  };

  const back = () => {
    if (loading) return;
    signUp.reset();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <Pressable testID="verification-back" disabled={loading} onPress={back} style={styles.back}>
        <Feather name="arrow-left" size={21} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.kicker, { color: colors.primary }]}>VERIFY YOUR EMAIL</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Check your email.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Enter the six-digit code we sent to {email || 'your email address'}.
        </Text>
        <TextInput
          testID="verification-code"
          value={code}
          onChangeText={(value) => { setCode(value.replace(/\D/g, '').slice(0, 6)); setMessage(''); }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.code, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
        />
        {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
        <Pressable
          testID="verify-email"
          disabled={code.length !== 6 || loading}
          onPress={() => void verify()}
          style={[styles.button, { backgroundColor: code.length === 6 && !loading ? colors.primary : colors.muted }]}
        >
          {loading
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Verify email</Text>}
        </Pressable>
        <Pressable testID="resend-email-code" disabled={loading} onPress={() => void resend()} style={styles.secondary}>
          <Text style={[styles.resend, { color: colors.primary }]}>{isResending ? 'Sending a new code…' : 'Send a new code'}</Text>
        </Pressable>
        <Pressable testID="change-email" disabled={loading} onPress={back} style={styles.secondary}>
          <Text style={[styles.resend, { color: colors.primary }]}>Use a different email address</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '700' },
  body: { marginTop: 88 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10 },
  title: { fontSize: 29, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  code: { height: 61, borderWidth: 1, borderRadius: 16, fontSize: 25, fontWeight: '700', letterSpacing: 10, textAlign: 'center', marginTop: 26 },
  error: { fontSize: 13, marginTop: 10 },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 19 },
  resend: { textAlign: 'center', fontSize: 13, fontWeight: '700' },
});