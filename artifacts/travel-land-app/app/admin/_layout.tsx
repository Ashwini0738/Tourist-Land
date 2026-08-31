import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useRole } from '@/context/RoleContext';

export default function AdminLayout() {
  const { isSignedIn } = useAuth();
  const { isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete } = useAuthSecurity();
  const { role, isReady: roleReady } = useRole();
  if (!isSignedIn) return <Redirect href="/login" />;
  if (!isReady) return null;
  if (!deviceAuthSetupComplete) return <Redirect href="/biometric" />;
  if (biometricsEnabled && !isUnlocked) return <Redirect href="/biometric-login" />;
  if (!roleReady) return null;
  if (role !== 'admin') return <Redirect href={role === 'vendor' ? '/vendor' : '/(tabs)'} />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="listings" />
      <Stack.Screen name="users" />
      <Stack.Screen name="vendors" />
      <Stack.Screen name="content" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
