import { useMobileAuth } from '@/context/AuthContext';
import { Stack } from 'expo-router';
import React from 'react';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useRole } from '@/context/RoleContext';

export default function VendorLayout() {
  const { isSignedIn } = useMobileAuth();
  const { isReady, isUnlocked, deviceAuthSetupComplete } = useAuthSecurity();
  const { role, isReady: roleReady } = useRole();
  if (!isSignedIn || !isReady || !deviceAuthSetupComplete || !isUnlocked || !roleReady || role !== 'vendor') return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="hotels" />
      <Stack.Screen name="rooms" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="listings" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="enquiries" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
