import { PasswordResetFlow } from '@/features/auth/PasswordResetFlow';
import {
  PASSWORD_RECOVERY_REDIRECT_URI,
} from '@/features/auth/passwordRecovery';
import { useMobileAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import React, { useEffect } from 'react';

export default function PasswordRecoveryCallbackScreen() {
  const { processSupabasePasswordRecoveryUrl, clearPasswordRecovery } = useMobileAuth();

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      void processSupabasePasswordRecoveryUrl(url ?? PASSWORD_RECOVERY_REDIRECT_URI);
    });
  }, [processSupabasePasswordRecoveryUrl]);

  return (
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
}