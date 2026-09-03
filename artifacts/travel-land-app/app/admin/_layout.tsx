import { useMobileAuth } from '@/context/AuthContext';
import { Stack } from 'expo-router';
import React from 'react';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useRole } from '@/context/RoleContext';

export default function AdminLayout() {
  const { isSignedIn } = useMobileAuth();
  const { isReady, isUnlocked, deviceAuthSetupComplete } = useAuthSecurity();
  const { role, isReady: roleReady } = useRole();
  if (!isSignedIn || !isReady || !deviceAuthSetupComplete || !isUnlocked || !roleReady || role !== 'admin') return null;
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
