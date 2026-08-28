import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColors } from '@/hooks/useColors';

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
  const [mode, setMode] = useState<'biometric' | 'email'>('biometric');

  const loading = !isLoaded || signInStatus === 'fetching' || signUpStatus === 'fetching';

  const submit = async () => {
    setMessage('');
    if (isNew) {
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) return setMessage('We could not create that account. Please review your email and password and try again.');
      await signUp.verifications.sendEmailCode();
      router.push('/verify');
      return;
    }
    const { error } = await signIn.password({ emailAddress: email.trim(), password });
    if (error) return setMessage('We could not sign you in. Please check your details and try again.');
    if (signIn.status !== 'complete') return setMessage('This sign-in needs another verification step. Please use a different sign-in method or try again.');
    await signIn.finalize({});
    router.replace('/(tabs)');
  };

  const handleBiometricTap = async () => {
    if (Platform.OS === 'web') {
       setMessage('Biometrics not available on web. Please sign in with email.');
       setMode('email');
       return;
    }
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm your device lock',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
    });
    setMessage(r.success ? 'Device verified. Link your Travel & Land account once to finish setup.' : 'We could not verify your device lock.');
    if (!r.success) return;
    setMode('email');
  };

  if (mode === 'email') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <Pressable testID="login-back" onPress={() => { setMode('biometric'); setMessage(''); }} style={{ padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
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

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={{alignItems: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <MaterialCommunityIcons name="compass-outline" size={36} color="#064E3B" />
          <Text style={{fontSize: 20, fontWeight: 'bold', color: colors.foreground, letterSpacing: 1}}>TRAVEL & LAND</Text>
        </View>
      </View>

      <View style={{alignItems: 'flex-start', marginTop: 40}}>
        <Text style={{fontSize: 26, fontWeight: '700', color: '#064E3B'}}>Welcome</Text>
        <Text style={{fontSize: 18, color: colors.foreground, marginTop: 4}}>To your next chapter</Text>
      </View>

      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with fingerprint, Face ID, or device lock"
          onPress={handleBiometricTap}
          style={{flexDirection: 'row', alignItems: 'center', minHeight: 96}}
        >
          <MaterialCommunityIcons name="fingerprint" size={80} color={colors.foreground} />
          <View style={{paddingHorizontal: 24, alignItems: 'center'}}>
             <View style={{width: 1, height: 30, backgroundColor: colors.border}} />
             <Text style={{marginVertical: 12, color: colors.foreground, fontWeight: '700'}}>OR</Text>
             <View style={{width: 1, height: 30, backgroundColor: colors.border}} />
          </View>
          <MaterialCommunityIcons name="face-recognition" size={80} color={colors.foreground} />
        </Pressable>
        <Text style={{marginTop: 40, fontSize: 16, color: colors.foreground, fontWeight: '600'}}>Tap to continue securely</Text>
        <Text style={{marginTop: 8, fontSize: 13, color: colors.mutedForeground, textAlign: 'center'}}>Fingerprint, Face ID, or your device lock</Text>
      </View>

      <View>
        <Pressable accessibilityRole="button" accessibilityLabel="Set up this device" onPress={() => setMode('email')} style={{backgroundColor: '#064E3B', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>Set up this device</Text>
        </Pressable>
        <Text style={{color: colors.mutedForeground, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 10}}>Account setup is required once before biometric unlock can restore your secure session.</Text>
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
