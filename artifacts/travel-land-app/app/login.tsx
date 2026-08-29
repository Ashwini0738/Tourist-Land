import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type ClerkErrorLike = {
  code?: string;
  message?: string;
  longMessage?: string;
};

function authErrorMessage(error: unknown, fallback: string) {
  const clerkError = error as ClerkErrorLike | null;
  const code = clerkError?.code?.toLowerCase() ?? '';
  if (code.includes('identifier_exists')) {
    return 'An account with this email already exists. Switch to sign in instead.';
  }
  if (code.includes('password_pwned') || code.includes('password_compromised')) {
    return 'Choose a different password. This one has appeared in a known security breach.';
  }
  if (code.includes('password_length') || code.includes('password') && code.includes('length')) {
    return 'Choose a longer password that meets the account security requirements.';
  }
  if (code.includes('captcha') || code.includes('bot')) {
    return 'The security check could not be completed. Refresh the page and try again.';
  }
  if (code.includes('too_many') || code.includes('rate_limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (code.includes('email_address_invalid') || code.includes('invalid_email')) {
    return 'Enter a valid email address and try again.';
  }
  return clerkError?.longMessage || clerkError?.message || fallback;
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { isLoaded } = useAuth();

  const [isNew, setNew] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [signInNeedsCode, setSignInNeedsCode] = useState(false);
  const [signInCode, setSignInCode] = useState('');

  const loading = !isLoaded || signInStatus === 'fetching' || signUpStatus === 'fetching';

  const submit = async () => {
    setMessage('');
    if (isNew) {
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) return setMessage(authErrorMessage(error, 'We could not create that account. Please review your email and password and try again.'));
      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) return setMessage(authErrorMessage(verification.error, 'We could not send the verification email. Please check the address and try again.'));
      router.push('/verify');
      return;
    }
    const { error } = await signIn.password({ emailAddress: email.trim(), password });
    if (error) return setMessage(authErrorMessage(error, 'We could not sign you in. Please check your details and try again.'));
    if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
      const emailFactor = signIn.supportedSecondFactors?.find((factor) => factor.strategy === 'email_code');
      if (!emailFactor) {
        return setMessage('This account requires an additional sign-in method that is not available in this app.');
      }
      const verification = await signIn.mfa.sendEmailCode();
      if (verification.error) {
        return setMessage(authErrorMessage(verification.error, 'We could not send the sign-in verification code. Please try again.'));
      }
      setSignInCode('');
      setSignInNeedsCode(true);
      return;
    }
    if (signIn.status !== 'complete') return setMessage('This sign-in needs another verification step. Please restart sign in and try again.');
    await signIn.finalize({});
    router.replace('/(tabs)');
  };

  const verifySignInCode = async () => {
    setMessage('');
    const { error } = await signIn.mfa.verifyEmailCode({ code: signInCode });
    if (error) return setMessage(authErrorMessage(error, 'That verification code did not work. Please try again.'));
    if (signIn.status !== 'complete') return setMessage('The code was accepted, but sign in is not complete yet. Please try again.');
    await signIn.finalize({ navigate: () => router.replace('/(tabs)') });
  };

  if (signInNeedsCode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <Pressable testID="login-code-back" onPress={() => { signIn.reset(); setSignInNeedsCode(false); setSignInCode(''); setMessage(''); }} style={{ padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>VERIFY YOUR SIGN IN</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Check your email.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>We sent a verification code to finish signing you in securely.</Text>
          <TextInput
            testID="sign-in-verification-code"
            value={signInCode}
            onChangeText={setSignInCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card, textAlign: 'center', letterSpacing: 8, fontWeight: '700', fontSize: 20 }]}
          />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable testID="verify-sign-in-code" disabled={signInCode.length !== 6 || loading} onPress={verifySignInCode} style={[styles.button, { backgroundColor: signInCode.length === 6 && !loading ? '#064E3B' : colors.muted, marginTop: 24 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <><Text style={[styles.buttonText, { color: '#fff' }]}>Verify and continue</Text><Feather name="arrow-right" size={17} color="#fff" /></>}
          </Pressable>
          <Pressable onPress={async () => { const { error } = await signIn.mfa.sendEmailCode(); if (error) setMessage(authErrorMessage(error, 'We could not send a new code. Please try again.')); else setMessage('A new verification code was sent.'); }} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Send a new code</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>{isNew ? 'JOIN THE JOURNEY' : 'WELCOME BACK'}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{isNew ? 'Start exploring.' : 'Your next chapter\nstarts here.'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{isNew ? 'Create an account to save the places that feel like home.' : 'Sign in to keep your stays, bookings, and saved places together.'}</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
          <TextInput value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholder="Password" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card, marginTop: 16 }]} />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable testID="login-continue" disabled={!email || !password || loading} onPress={submit} style={[styles.button, { backgroundColor: email && password && !loading ? '#064E3B' : colors.muted, marginTop: 24 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <><Text style={[styles.buttonText, { color: '#fff' }]}>{isNew ? 'Create account' : 'Sign in'}</Text><Feather name="arrow-right" size={17} color="#fff" /></>}
          </Pressable>
          <Pressable onPress={() => { setNew(!isNew); setMessage(''); }} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>{isNew ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
          {isNew && <View nativeID="clerk-captcha" />}
        </View>
      </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  copy: { marginTop: 32 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 32 },
  input: { height: 56, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 15 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 24 },
  secondaryText: { fontSize: 14, fontWeight: '600' }
});
