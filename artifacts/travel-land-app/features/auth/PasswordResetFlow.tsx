import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { authErrorMessage, emailValidationMessage } from '@/features/auth/authErrorMessage';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useMobileAuth } from '@/context/AuthContext';

type ResetMode = 'request' | 'recovery';
type ResetStep = 'email' | 'sent' | 'password' | 'complete';

type PasswordResetFlowProps = {
  mode: ResetMode;
  initialEmail: string;
  onBackToLogin: () => void;
  onCompleted: () => void;
};

function resetPasswordValidationMessage(password: string, confirmation: string) {
  if (!password) return 'New password is required.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}

export function PasswordResetFlow({
  mode,
  initialEmail,
  onBackToLogin,
  onCompleted,
}: PasswordResetFlowProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    requestSupabasePasswordReset,
    updateSupabasePassword,
    signOut,
    passwordRecoveryStatus,
    passwordRecoveryError,
  } = useMobileAuth();
  const [step, setStep] = useState<ResetStep>(mode === 'request' ? 'email' : 'password');
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recoveryIsLoading = mode === 'recovery' && (
    passwordRecoveryStatus === 'idle' || passwordRecoveryStatus === 'processing'
  );
  const loading = recoveryIsLoading || isSubmitting;

  const startReset = async () => {
    if (isSubmitting) return;
    setMessage('');
    const validationMessage = emailValidationMessage(email);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      await requestSupabasePasswordReset(email);
      setStep('sent');
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not start password reset. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitNewPassword = async () => {
    if (isSubmitting || recoveryIsLoading) return;
    setMessage('');
    const validationMessage = resetPasswordValidationMessage(newPassword, confirmation);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    if (passwordRecoveryStatus !== 'ready') {
      setMessage(passwordRecoveryError ?? 'This password reset link is no longer available. Request a new link.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSupabasePassword(newPassword);
      await signOut();
      setStep('complete');
      onCompleted();
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not reset your password. Request a new link and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const back = () => {
    if (mode === 'request' && step === 'sent') {
      setStep('email');
      setMessage('');
      return;
    }
    onBackToLogin();
  };

  const recoveryError = mode === 'recovery' && passwordRecoveryStatus === 'error';
  const title = mode === 'recovery'
    ? recoveryIsLoading
      ? 'Checking your link.'
      : recoveryError
        ? 'This link is no longer valid.'
        : step === 'complete'
          ? 'Password updated.'
          : 'Create a new password.'
    : step === 'email'
      ? 'Reset your password.'
      : 'Check your email.';
  const subtitle = mode === 'recovery'
    ? recoveryIsLoading
      ? 'We are securely restoring your password reset session.'
      : recoveryError
        ? passwordRecoveryError
        : step === 'complete'
          ? 'Your Supabase password was changed. Sign in again with your new password.'
          : 'Choose a new password for your Travel & Land account.'
    : step === 'email'
      ? 'Enter your email address and we’ll send a secure password reset link.'
      : 'If an account exists for that email, we sent a secure reset link. Open it on this device to continue.';

  return (
    <KeyboardAwareScrollViewCompat
      testID="password-reset-flow"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
      bottomOffset={72}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        testID="password-reset-back"
        accessibilityRole="button"
        onPress={back}
        style={styles.back}
      >
        <Feather name="arrow-left" size={22} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>PASSWORD RESET</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

      {mode === 'request' && step === 'email' && (
        <>
          <TextInput
            testID="password-reset-email"
            value={email}
            onChangeText={(value) => { setEmail(value); setMessage(''); }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
          />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable
            testID="password-reset-submit-email"
            disabled={loading}
            onPress={() => void startReset()}
            style={[styles.button, { backgroundColor: loading ? colors.muted : colors.primary }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send reset link</Text>}
          </Pressable>
        </>
      )}

      {mode === 'request' && step === 'sent' && (
        <Pressable
          testID="password-reset-done"
          onPress={onBackToLogin}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Back to sign in</Text>
        </Pressable>
      )}

      {mode === 'recovery' && !recoveryIsLoading && !recoveryError && step !== 'complete' && (
        <>
          <TextInput
            testID="password-reset-new-password"
            value={newPassword}
            onChangeText={(value) => { setNewPassword(value); setMessage(''); }}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            placeholder="New password"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
          />
          <TextInput
            testID="password-reset-confirm-password"
            value={confirmation}
            onChangeText={(value) => { setConfirmation(value); setMessage(''); }}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            placeholder="Confirm new password"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card, marginTop: 16 }]}
          />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable
            testID="password-reset-submit-password"
            disabled={loading}
            onPress={() => void submitNewPassword()}
            style={[styles.button, { backgroundColor: loading ? colors.muted : colors.primary }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Reset password</Text>}
          </Pressable>
        </>
      )}

      {mode === 'recovery' && (recoveryError || step === 'complete') && (
        <Pressable
          testID="password-reset-return"
          onPress={onBackToLogin}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Return to sign in</Text>
        </Pressable>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 46, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 32 },
  input: { height: 58, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, fontSize: 15 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});