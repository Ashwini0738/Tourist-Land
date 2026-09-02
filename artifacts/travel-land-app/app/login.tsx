import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PasswordResetFlow } from '@/features/auth/PasswordResetFlow';
import { authErrorCodes, authErrorMessage, emailValidationMessage } from '@/features/auth/authErrorMessage';
import { useAuth, useClerk, useSessionList, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type AuthMethod = 'email' | 'phone';
type SignInVerificationMethod = 'email' | 'phone' | null;

function normalizePhoneNumber(countryCodeInput: string, phoneInput: string) {
  const phone = phoneInput.trim();
  const countryCode = countryCodeInput.trim();
  const raw = phone.startsWith('+')
    ? phone
    : phone.startsWith('00')
      ? `+${phone.slice(2)}`
      : `${countryCode.startsWith('+') ? countryCode : `+${countryCode}`}${phone}`;
  const digits = raw.replace(/\D/g, '');

  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { setActive } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const { sessions, isLoaded: sessionsLoaded } = useSessionList();

  const [isNew, setNew] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [signInVerificationMethod, setSignInVerificationMethod] = useState<SignInVerificationMethod>(null);
  const [signInCode, setSignInCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const loading = !isLoaded || signInStatus === 'fetching' || signUpStatus === 'fetching' || isSubmitting || isResending;
  const normalizedPhone = normalizePhoneNumber(countryCode, phone);

  const submit = async () => {
    if (isSubmitting || isSignedIn) return;
    setMessage('');
    if (isNew || authMethod === 'email') {
      const emailMessage = emailValidationMessage(email);
      if (emailMessage) {
        setMessage(emailMessage);
        return;
      }
      if (!password.trim()) {
        setMessage(isNew ? 'Password is required.' : 'Enter your password.');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      if (isNew) {
        const { error } = await signUp.password({ emailAddress: email.trim(), password });
        if (error) return setMessage(authErrorMessage(error, 'We could not create that account. Please review your email and password and try again.'));
        const verification = await signUp.verifications.sendEmailCode();
        if (verification.error) return setMessage(authErrorMessage(verification.error, 'We could not send the verification email. Please check the address and try again.'));
        router.push('/verify');
        return;
      }

      if (authMethod === 'phone') {
        if (!normalizedPhone) {
          setMessage('Enter a valid phone number with its country code and try again.');
          return;
        }

        const { error } = await signIn.create({ identifier: normalizedPhone });
        if (error) return setMessage(authErrorMessage(error, 'We could not start phone sign in. Please check your number and try again.'));

        const phoneFactor = signIn.supportedFirstFactors?.find((factor) => factor.strategy === 'phone_code');
        if (!phoneFactor) {
          return setMessage('Phone sign in is not enabled for this account. Try email sign in instead.');
        }

        const verification = await signIn.phoneCode.sendCode();
        if (verification.error) {
          return setMessage(authErrorMessage(verification.error, 'We could not send a verification code. Please try again.'));
        }
        setSignInCode('');
        setSignInVerificationMethod('phone');
        return;
      }

      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (error) {
        if (authErrorCodes(error).some((code) => code.includes('session_exists'))) {
          const existingSessionId = signIn.existingSession?.sessionId;
          const requestedEmail = email.trim().toLowerCase();
          const usableSession = sessions?.find((session) => {
            if (session.status !== 'active' || !session.user) return false;
            if (existingSessionId && session.id === existingSessionId) return true;
            return session.user.emailAddresses.some(
              (address) => address.emailAddress.trim().toLowerCase() === requestedEmail,
            );
          });
          if (!sessionsLoaded || !usableSession) {
            return setMessage('Clerk reported an existing session, but no usable local session is available for this account. Please sign out of the existing account and try again.');
          }
          await setActive({ session: usableSession.id });
          return;
        }
        if (__DEV__) {
          console.warn('[auth] Password sign-in rejected', {
            codes: authErrorCodes(error).length ? authErrorCodes(error) : ['unknown'],
          });
        }
        return setMessage(authErrorMessage(error, 'We could not sign you in. Please check your details and try again.'));
      }
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
        setSignInVerificationMethod('email');
        return;
      }
      if (signIn.status !== 'complete') return setMessage('This sign-in needs another verification step. Please restart sign in and try again.');
      const finalization = await signIn.finalize({});
      if (finalization?.error) {
        setMessage(authErrorMessage(finalization.error, 'We could not complete sign in. Please try again.'));
      }
    } catch (error) {
      setMessage(authErrorMessage(error, isNew ? 'We could not create your account. Please try again.' : 'We could not complete sign in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifySignInCode = async () => {
    if (isSubmitting) return;
    setMessage('');
    setIsSubmitting(true);
    try {
      const { error } = signInVerificationMethod === 'phone'
        ? await signIn.phoneCode.verifyCode({ code: signInCode })
        : await signIn.mfa.verifyEmailCode({ code: signInCode });
      if (error) return setMessage(authErrorMessage(error, 'That verification code did not work. Please try again.'));
      if (signIn.status !== 'complete') return setMessage('The code was accepted, but sign in is not complete yet. Please try again.');
      const finalization = await signIn.finalize({});
      if (finalization?.error) {
        setMessage(authErrorMessage(finalization.error, 'We could not complete sign in. Please try again.'));
      }
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not verify that code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendSignInCode = async () => {
    if (isResending) return;
    setMessage('');
    setIsResending(true);
    try {
      const { error } = signInVerificationMethod === 'phone'
        ? await signIn.phoneCode.sendCode()
        : await signIn.mfa.sendEmailCode();
      if (error) {
        setMessage(authErrorMessage(error, 'We could not send a new code. Please try again.'));
      } else {
        setMessage('A new verification code was sent.');
      }
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not send a new code. Please try again.'));
    } finally {
      setIsResending(false);
    }
  };

  if (showPasswordReset) {
    return (
      <PasswordResetFlow
        signIn={signIn}
        initialEmail={email}
        onBackToLogin={() => {
          signIn.reset();
          setShowPasswordReset(false);
          setMessage('');
        }}
        onCompleted={() => {
          signIn.reset();
          setShowPasswordReset(false);
          setPassword('');
          setMessage('Your password was reset. Sign in with your new password.');
        }}
      />
    );
  }

  if (signInVerificationMethod) {
    const isPhoneVerification = signInVerificationMethod === 'phone';
    return (
      <KeyboardAwareScrollViewCompat
        testID="sign-in-verification-scroll-view"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
        bottomOffset={72}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable testID="login-code-back" onPress={() => { signIn.reset(); setSignInVerificationMethod(null); setSignInCode(''); setMessage(''); }} style={{ padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>VERIFY YOUR SIGN IN</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{isPhoneVerification ? 'Check your phone.' : 'Check your email.'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>We sent a verification code to finish signing you in securely.</Text>
          <TextInput
            testID={isPhoneVerification ? 'phone-sign-in-verification-code' : 'sign-in-verification-code'}
            value={signInCode}
            onChangeText={setSignInCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card, textAlign: 'center', letterSpacing: 8, fontWeight: '700', fontSize: 20 }]}
          />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable testID={isPhoneVerification ? 'verify-phone-sign-in-code' : 'verify-sign-in-code'} disabled={signInCode.length !== 6 || loading} onPress={verifySignInCode} style={[styles.button, { backgroundColor: signInCode.length === 6 && !loading ? '#064E3B' : colors.muted, marginTop: 24 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <><Text style={[styles.buttonText, { color: '#fff' }]}>Verify and continue</Text><Feather name="arrow-right" size={17} color="#fff" /></>}
          </Pressable>
          <Pressable testID={isPhoneVerification ? 'resend-phone-sign-in-code' : 'resend-sign-in-code'} onPress={resendSignInCode} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Send a new code</Text>
          </Pressable>
          <Pressable testID="change-sign-in-identifier" onPress={() => { signIn.reset(); setSignInVerificationMethod(null); setSignInCode(''); setMessage(''); }} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Use a different {isPhoneVerification ? 'phone number' : 'email address'}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
      <KeyboardAwareScrollViewCompat
        testID="login-scroll-view"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
        bottomOffset={72}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient pointerEvents="none" colors={[colors.gradientSoft, 'transparent']} style={styles.orb} />
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.accent }]}><Text style={[styles.brandMarkText, { color: colors.accentForeground }]}>T</Text></View>
          <Text style={[styles.brandName, { color: colors.primary }]}>TRAVEL & LAND</Text>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>{isNew ? 'JOIN THE JOURNEY' : 'WELCOME BACK'}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{isNew ? 'Start exploring.' : 'Your next chapter\nstarts here.'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{isNew ? 'Create an account to save the places that feel like home.' : 'Sign in to keep your stays, bookings, and saved places together.'}</Text>
          {!isNew && (
            <View style={styles.methodSwitcher}>
              <Pressable testID="login-method-email" onPress={() => { setAuthMethod('email'); setMessage(''); }} style={[styles.methodOption, { backgroundColor: authMethod === 'email' ? colors.primary : colors.card, borderColor: colors.input }]}>
                <Text style={[styles.methodOptionText, { color: authMethod === 'email' ? colors.primaryForeground : colors.foreground }]}>Email</Text>
              </Pressable>
              <Pressable testID="login-method-phone" onPress={() => { setAuthMethod('phone'); setMessage(''); }} style={[styles.methodOption, { backgroundColor: authMethod === 'phone' ? colors.primary : colors.card, borderColor: colors.input }]}>
                <Text style={[styles.methodOptionText, { color: authMethod === 'phone' ? colors.primaryForeground : colors.foreground }]}>Phone</Text>
              </Pressable>
            </View>
          )}
          {authMethod === 'phone' && !isNew ? (
            <View style={styles.phoneRow}>
              <TextInput
                testID="phone-country-code"
                value={countryCode}
                onChangeText={setCountryCode}
                autoCapitalize="none"
                keyboardType="phone-pad"
                maxLength={5}
                placeholder="+91"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, styles.countryCodeInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
              />
              <TextInput
                testID="phone-number"
                value={phone}
                onChangeText={setPhone}
                autoCapitalize="none"
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, styles.phoneInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
              />
            </View>
          ) : (
            <>
              <TextInput testID="login-email" value={email} onChangeText={(value) => { setEmail(value); setMessage(''); }} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Email address" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
              <TextInput testID="login-password" value={password} onChangeText={(value) => { setPassword(value); setMessage(''); }} autoCapitalize="none" secureTextEntry autoComplete={isNew ? 'new-password' : 'current-password'} placeholder="Password" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card, marginTop: 16 }]} />
              {!isNew && (
                <Pressable testID="forgot-password" onPress={() => { setMessage(''); setShowPasswordReset(true); }} style={styles.forgotPassword}>
                  <Text style={[styles.secondaryText, { color: colors.primary }]}>Forgot password?</Text>
                </Pressable>
              )}
            </>
          )}
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable testID="login-continue" disabled={(authMethod === 'phone' && !normalizedPhone) || loading} onPress={() => void submit()} style={[styles.button, { backgroundColor: (authMethod === 'email' ? email.trim() && password.trim() : normalizedPhone) && !loading ? colors.primary : colors.muted, marginTop: 24 }]}>
            {loading ? <><ActivityIndicator color="#fff" /><Text style={[styles.buttonText, { color: '#fff' }]}>{isNew ? 'Creating account...' : authMethod === 'phone' ? 'Sending code...' : 'Signing in...'}</Text></> : <><Text style={[styles.buttonText, { color: '#fff' }]}>{isNew ? 'Create account' : 'Sign in'}</Text><Feather name="arrow-right" size={17} color="#fff" /></>}
          </Pressable>
          <Pressable onPress={() => { setNew(!isNew); setAuthMethod('email'); setMessage(''); }} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>{isNew ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/vendor-application')} style={styles.vendorLink}>
            <Text style={[styles.vendorLinkText, { color: colors.foreground }]}>Are you a travel business? Apply as a vendor</Text>
          </Pressable>
          {isNew && <View nativeID="clerk-captcha" />}
        </View>
      </KeyboardAwareScrollViewCompat>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, overflow: 'hidden' },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -190, right: -90, opacity: 0.9 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontSize: 17, fontWeight: '800' },
  brandName: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  copy: { marginTop: 42 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 32 },
  input: { height: 58, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, fontSize: 15 },
  methodSwitcher: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodOption: { flex: 1, height: 44, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  methodOptionText: { fontSize: 14, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodeInput: { width: 88 },
  phoneInput: { flex: 1 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...({ shadowColor: '#143f4a', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }) },
  buttonText: { fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 24 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 4 },
  vendorLink: { alignItems: 'center', marginTop: 28, paddingVertical: 8 },
  vendorLinkText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
