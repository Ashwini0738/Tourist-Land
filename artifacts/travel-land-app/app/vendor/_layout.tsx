import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useRole } from '@/context/RoleContext';

export default function VendorLayout() {
  const { isSignedIn } = useAuth();
  const { isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete } = useAuthSecurity();
  const { role, isReady: roleReady } = useRole();
  if (!isSignedIn) return <Redirect href="/login" />;
  if (!isReady) return null;
  if (!deviceAuthSetupComplete) return <Redirect href="/biometric" />;
  if (biometricsEnabled && !isUnlocked) return <Redirect href="/biometric-login" />;
  if (!roleReady) return null;
  if (role !== 'vendor' && role !== 'admin') return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="listings" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="enquiries" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
