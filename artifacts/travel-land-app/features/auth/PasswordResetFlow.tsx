import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { authErrorMessage, emailValidationMessage } from '@/features/auth/authErrorMessage';
import { useSignIn } from '@clerk/expo';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type SignInResource = NonNullable<ReturnType<typeof useSignIn>['signIn']>;
type ResetStep = 'email' | 'code' | 'password';

type PasswordResetFlowProps = {
  signIn: SignInResource;
  initialEmail: string;
  onBackToLogin: () => void;
  onCompleted: () => void;
};

function resetPasswordValidationMessage(password: string, confirmation: string) {
  if (!password) return 'New password is required.';
  if (password !== confirmation) return 'Passwords do not match.';
  // The installed Future API does not expose local password metadata. Clerk's
  // submitPassword call remains authoritative for the configured requirements.
  return null;
}

export function PasswordResetFlow({
  signIn,
  initialEmail,
  onBackToLogin,
  onCompleted,
}: PasswordResetFlowProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fetchStatus } = useSignIn();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const loading = fetchStatus === 'fetching' || isSubmitting || isResending;

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
      const createResult = await signIn.create({ identifier: email.trim() });
      if (createResult.error) {
        setMessage(authErrorMessage(createResult.error, 'We could not start password reset. Check the email and try again.'));
        return;
      }
      const sendResult = await signIn.resetPasswordEmailCode.sendCode();
      if (sendResult.error) {
        setMessage(authErrorMessage(sendResult.error, 'We could not send a password reset code. Please try again.'));
        return;
      }
      setCode('');
      setStep('code');
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not start password reset. Check the email and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyResetCode = async () => {
    if (isSubmitting) return;
    setMessage('');
    if (code.trim().length !== 6) {
      setMessage('Enter the six-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyResult.error) {
        setMessage(authErrorMessage(verifyResult.error, 'We could not verify that code. Please try again.'));
        return;
      }
      if (signIn.status !== 'needs_new_password') {
        setMessage('We could not verify that code. Request a new code and try again.');
        return;
      }
      setStep('password');
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not verify that code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendResetCode = async () => {
    if (isResending) return;
    setMessage('');
    setIsResending(true);
    try {
      const sendResult = await signIn.resetPasswordEmailCode.sendCode();
      if (sendResult.error) {
        setMessage(authErrorMessage(sendResult.error, 'We could not send a new reset code. Please try again.'));
      } else {
        setMessage('A new password reset code was sent.');
      }
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not send a new reset code. Please try again.'));
    } finally {
      setIsResending(false);
    }
  };

  const submitNewPassword = async () => {
    if (isSubmitting) return;
    setMessage('');
    const validationMessage = resetPasswordValidationMessage(newPassword, confirmation);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (result.error) {
        setMessage(authErrorMessage(result.error, 'We could not reset your password. Please try again.'));
      } else {
        onCompleted();
      }
    } catch (error) {
      setMessage(authErrorMessage(error, 'We could not reset your password. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = step === 'email'
    ? 'Reset your password.'
    : step === 'code'
      ? 'Check your email.'
      : 'Create a new password.';
  const subtitle = step === 'email'
    ? 'Enter the email address on your account and we’ll send a secure reset code.'
    : step === 'code'
      ? 'Enter the six-digit code we sent to verify your password reset.'
      : 'Choose a new password that meets your account security requirements.';

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
        onPress={() => (step === 'email' ? onBackToLogin() : setStep(step === 'password' ? 'code' : 'email'))}
        style={styles.back}
      >
        <Feather name="arrow-left" size={22} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>PASSWORD RESET</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

      {step === 'email' && (
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
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send reset code</Text>}
          </Pressable>
        </>
      )}

      {step === 'code' && (
        <>
          <TextInput
            testID="password-reset-code"
            value={code}
            onChangeText={(value) => { setCode(value); setMessage(''); }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, styles.codeInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
          />
          {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
          <Pressable
            testID="password-reset-submit-code"
            disabled={loading}
            onPress={() => void verifyResetCode()}
            style={[styles.button, { backgroundColor: loading ? colors.muted : colors.primary }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Verify code</Text>}
          </Pressable>
          <Pressable testID="password-reset-resend" disabled={loading} onPress={() => void resendResetCode()} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>{isResending ? 'Sending a new code…' : 'Send a new code'}</Text>
          </Pressable>
        </>
      )}

      {step === 'password' && (
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
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '700' },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 24 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
});