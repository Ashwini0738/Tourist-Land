import { PasswordResetFlow } from '@/features/auth/PasswordResetFlow';
import { useMobileAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupabaseAuthCallbackScreen() {
  const {
    clearPasswordRecovery,
    isPasswordRecovery,
    processSupabaseAuthCallbackUrl,
    signupConfirmationError,
    signupConfirmationStatus,
  } = useMobileAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) void processSupabaseAuthCallbackUrl(url);
    });
  }, [processSupabaseAuthCallbackUrl]);

  if (isPasswordRecovery) return (
    <PasswordResetFlow
      mode="recovery"
      initialEmail=""
      onBackToLogin={() => {
        clearPasswordRecovery();
        router.replace('/login');
      }}
      onCompleted={() => router.replace('/login')}
    />
  );

  const failed = signupConfirmationStatus === 'error';
  return (
    <View style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: insets.top + 24,
      paddingBottom: insets.bottom + 24,
    }]}>
      {!failed && <ActivityIndicator color={colors.primary} size="large" />}
      <Text style={[styles.title, { color: colors.foreground }]}>
        {failed ? 'Email confirmation failed' : 'Confirming your email'}
      </Text>
      <Text style={[styles.message, { color: failed ? colors.destructive : colors.mutedForeground }]}>
        {signupConfirmationError ?? 'Please wait while Travel & Land completes your secure sign in.'}
      </Text>
      {failed && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/login')}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Return to sign in</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});