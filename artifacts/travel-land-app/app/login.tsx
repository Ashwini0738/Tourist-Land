import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { authErrorCodes, authErrorMessage, emailValidationMessage } from '@/features/auth/authErrorMessage';
import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useMobileAuth } from '@/context/AuthContext';

type PendingOrganizationChoice = {
  sessionId: string;
  organizations: Array<{ id: string; name: string }>;
};

function authErrorDiagnostic(error: unknown) {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const errors = Array.isArray(source.errors) ? source.errors : [];
  const first = errors[0] && typeof errors[0] === 'object'
    ? errors[0] as Record<string, unknown>
    : source;
  return {
    code: typeof first.code === 'string' ? first.code : null,
    name: typeof first.name === 'string' ? first.name : typeof source.name === 'string' ? source.name : null,
    status: typeof source.status === 'number' ? source.status : null,
    message: typeof first.message === 'string' ? first.message : null,
    longMessage: typeof first.longMessage === 'string' ? first.longMessage : null,
  };
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const clerk = useClerk();
  const { setActive } = clerk;
  const {
    isLoaded,
    isSignedIn,
  } = useMobileAuth();
  const { signUp } = useSignUp();

  const [isNew, setNew] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSignInVerificationOpen, setSignInVerificationOpen] = useState(false);
  const [signInCode, setSignInCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingOrganizationChoice, setPendingOrganizationChoice] = useState<PendingOrganizationChoice | null>(null);

  const loading = !isLoaded || signInStatus === 'fetching' || isSubmitting || isResending;

  useEffect(() => {
    if (!__DEV__) return;
    console.info('[auth] Login session state', {
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      sessionStatus: clerk.session?.status ?? null,
      currentTask: clerk.session?.currentTask?.key ?? null,
    });
  }, [clerk.session?.currentTask?.key, clerk.session?.status, isLoaded, isSignedIn]);

  const activateAvailableSession = async (preferredSessionId?: string | null) => {
    const sessions = clerk.client?.sessions ?? [];
    const sessionId = preferredSessionId
      ?? clerk.session?.id
      ?? clerk.client?.lastActiveSessionId
      ?? sessions.find((session) => session.status === 'active' || session.status === 'pending')?.id;
    const session = sessionId
      ? sessions.find((candidate) => candidate.id === sessionId) ?? (clerk.session?.id === sessionId ? clerk.session : undefined)
      : undefined;
    if (!sessionId || !session) {
      if (__DEV__) {
        console.warn('[auth] Existing session is not available locally', {
          signInStatus: signIn.status,
          hasCreatedSessionId: Boolean(signIn.createdSessionId),
          hasActiveSession: Boolean(clerk.session),
          sessionStatuses: sessions.map((candidate) => candidate.status),
        });
      }
      return false;
    }

    if (session.status === 'pending') {
      const memberships = session.user?.organizationMemberships ?? [];
      const previousOrganizationId = session.lastActiveOrganizationId;
      const organizationId = previousOrganizationId && memberships.some(
        (membership) => membership.organization.id === previousOrganizationId,
      )
        ? previousOrganizationId
        : memberships.length === 1
          ? memberships[0].organization.id
          : null;

      if (session.currentTask?.key !== 'choose-organization') {
        await clerk.redirectToTasks();
        return true;
      }
      if (!organizationId) {
        if (memberships.length === 0) {
          setMessage('Your account must be added to an organization before you can sign in.');
          return true;
        }
        setPendingOrganizationChoice({
          sessionId,
          organizations: memberships.map((membership) => ({
            id: membership.organization.id,
            name: membership.organization.name,
          })),
        });
        return true;
      }
      await setActive({ session: sessionId, organization: organizationId });
    } else if (clerk.session?.id !== sessionId || !isSignedIn) {
      await setActive({ session: sessionId });
    }

    return true;
  };

  const finalizeAndVerifyActiveSession = async () => {
    const finalization = await signIn.finalize({});
    if (finalization?.error) {
      setMessage(authErrorMessage(finalization.error, 'We could not complete sign in. Please try again.'));
      return false;
    }

    const activated = await activateAvailableSession(signIn.createdSessionId);
    if (!activated) setMessage('We could not complete sign in. Please try again.');
    return activated;
  };

  const resumeExistingSession = async (error: unknown) => {
    const sessionExists = authErrorCodes(error).some((code) => code.includes('session_exists'));
    if (!sessionExists) return false;

    const resumed = await activateAvailableSession();
    if (!resumed) {
      setMessage('Your existing session could not be restored. Close and reopen the app, then try again.');
    }
    return true;
  };

  const submit = async () => {
    if (isSubmitting) return;
    if (__DEV__) {
      console.info('[auth] Email OTP submit started', {
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        signInStatus,
      });
    }
    setMessage('');
    if (isSignedIn) {
      await activateAvailableSession();
      return;
    }
    const emailMessage = emailValidationMessage(email);
    if (emailMessage) {
      setMessage(emailMessage);
      return;
    }
    setIsSubmitting(true);
    try {
      if (isNew) {
        const created = await signUp.create({ emailAddress: email.trim() });
        if (created.error) {
          setMessage(authErrorMessage(created.error, 'We could not create your account. Please try again.'));
          return;
        }
        const verification = await signUp.verifications.sendEmailCode();
        if (verification.error) {
          setMessage(authErrorMessage(verification.error, 'We could not send your verification code. Please try again.'));
          return;
        }
        router.push({ pathname: '/verify', params: { email: email.trim(), mode: 'signup' } });
        return;
      }

      const result = await signIn.create({ identifier: email.trim() });
      if (result.error) {
        if (await resumeExistingSession(result.error)) return;
        setMessage(authErrorMessage(result.error, 'We could not start email sign in. Please try again.'));
        return;
      }
      const emailFactor = signIn.supportedFirstFactors?.find((factor) => factor.strategy === 'email_code');
      if (!emailFactor) {
        setMessage('Email code sign in is not enabled for this account. Try another sign-in method.');
        return;
      }
      const verification = await signIn.emailCode.sendCode();
      if (verification.error) {
        setMessage(authErrorMessage(verification.error, 'We could not send your verification code. Please try again.'));
        return;
      }
      setSignInCode('');
      setSignInVerificationOpen(true);
    } catch (error) {
      if (__DEV__) console.warn('[auth] Email OTP submit threw', authErrorDiagnostic(error));
      if (await resumeExistingSession(error)) return;
      setMessage(authErrorMessage(error, isNew ? 'We could not create your account. Please try again.' : 'We could not complete sign in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifySignInCode = async () => {
    if (isSubmitting || isSignedIn) return;
    setMessage('');
    setIsSubmitting(true);
    try {
      const { error } = signIn.status === 'needs_second_factor'
        ? await signIn.mfa.verifyEmailCode({ code: signInCode })
        : await signIn.emailCode.verifyCode({ code: signInCode });
      if (error) return setMessage(authErrorMessage(error, 'That verification code did not work. Please try again.'));
      if (signIn.status !== 'complete') return setMessage('The code was accepted, but sign in is not complete yet. Please try again.');
      if (!await finalizeAndVerifyActiveSession()) return;
      setSignInVerificationOpen(false);
      setSignInCode('');
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
      const { error } = signIn.status === 'needs_second_factor'
        ? await signIn.mfa.sendEmailCode()
        : await signIn.emailCode.sendCode();
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

  const selectOrganization = async (organizationId: string) => {
    if (!pendingOrganizationChoice || isSubmitting) return;
    setMessage('');
    setIsSubmitting(true);
    try {
      await setActive({
        session: pendingOrganizationChoice.sessionId,
        organization: organizationId,
      });
      setPendingOrganizationChoice(null);
    } catch (error) {
      if (__DEV__) console.warn('[auth] Organization activation failed', authErrorDiagnostic(error));
      setMessage(authErrorMessage(error, 'We could not select that organization. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingOrganizationChoice) {
    return (
      <KeyboardAwareScrollViewCompat
        testID="organization-choice-scroll-view"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>CHOOSE YOUR ORGANIZATION</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Where are you signing in?</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Clerk requires an organization for this account. Select one to finish signing in.</Text>
          {pendingOrganizationChoice.organizations.map((organization) => (
            <Pressable
              key={organization.id}
              testID={`select-organization-${organization.id}`}
              disabled={isSubmitting}
              onPress={() => void selectOrganization(organization.id)}
              style={[styles.organizationOption, { backgroundColor: colors.card, borderColor: colors.input }]}
            >
              <Text style={[styles.organizationOptionText, { color: colors.foreground }]}>{organization.name}</Text>
              {isSubmitting ? <ActivityIndicator color={colors.primary} /> : <Feather name="arrow-right" size={17} color={colors.primary} />}
            </Pressable>
          ))}
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
        </View>
      </KeyboardAwareScrollViewCompat>
    );
  }

  if (isSignInVerificationOpen) {
    return (
      <KeyboardAwareScrollViewCompat
        testID="sign-in-verification-scroll-view"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
        bottomOffset={72}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable testID="login-code-back" onPress={() => { signIn.reset(); setSignInVerificationOpen(false); setSignInCode(''); setMessage(''); }} style={{ padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}>
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
          <Pressable testID="resend-sign-in-code" onPress={resendSignInCode} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Send a new code</Text>
          </Pressable>
          <Pressable testID="change-sign-in-identifier" onPress={() => { signIn.reset(); setSignInVerificationOpen(false); setSignInCode(''); setMessage(''); }} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Use a different email address</Text>
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
        <LinearGradient colors={[colors.gradientSoft, 'transparent']} style={styles.orb} />
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.accent }]}><Text style={[styles.brandMarkText, { color: colors.accentForeground }]}>T</Text></View>
          <Text style={[styles.brandName, { color: colors.primary }]}>TRAVEL & LAND</Text>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>{isNew ? 'JOIN THE JOURNEY' : 'WELCOME BACK'}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{isNew ? 'Start exploring.' : 'Your next chapter\nstarts here.'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{isNew ? 'Create an account to save the places that feel like home.' : 'Sign in to keep your stays, bookings, and saved places together.'}</Text>
          <TextInput testID="login-email" value={email} onChangeText={(value) => { setEmail(value); setMessage(''); }} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Email address" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable testID="login-continue" disabled={loading} onPress={() => void submit()} style={[styles.button, { backgroundColor: email.trim() && !loading ? colors.primary : colors.muted, marginTop: 24 }]}>
            {loading ? <><ActivityIndicator color="#fff" /><Text style={[styles.buttonText, { color: '#fff' }]}>{isNew ? 'Creating account...' : 'Signing in...'}</Text></> : <><Text style={[styles.buttonText, { color: '#fff' }]}>{isNew ? 'Create account' : 'Sign in'}</Text><Feather name="arrow-right" size={17} color="#fff" /></>}
          </Pressable>
          <Pressable onPress={() => { setNew(!isNew); setMessage(''); }} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>{isNew ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/vendor-application')} style={styles.vendorLink}>
            <Text style={[styles.vendorLinkText, { color: colors.foreground }]}>Are you a travel business? Apply as a vendor</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, overflow: 'hidden' },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -190, right: -90, opacity: 0.9, pointerEvents: 'none' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontSize: 17, fontWeight: '800' },
  brandName: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  copy: { marginTop: 42 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 32 },
  input: { height: 58, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, fontSize: 15 },
  organizationOption: { minHeight: 58, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  organizationOptionText: { flex: 1, fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 7px 14px rgba(20, 63, 74, 0.18)', elevation: 5 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 24 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  vendorLink: { alignItems: 'center', marginTop: 28, paddingVertical: 8 },
  vendorLinkText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
