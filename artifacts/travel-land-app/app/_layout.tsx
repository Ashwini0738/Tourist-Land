import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth, useClerk } from '@clerk/expo';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import * as SplashScreen from 'expo-splash-screen';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthSecurityProvider } from '@/context/AuthSecurityContext';
import { RoleProvider, useRole } from '@/context/RoleContext';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl, setUnauthorizedHandler } from '@workspace/api-client-react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { roleHome, unauthorizedHome } from '@/features/role/roleRouting';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RootLayoutNav() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const { isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete } = useAuthSecurity();
  const { role, isReady: roleReady, isLoading: roleLoading, isError: roleError } = useRole();
  const colors = useColors();
  const segments = useSegments();
  const route = segments[0];
  const publicRoutes = ['splash', 'login', 'verify', 'vendor-application'];
  const lockedSessionRoutes = ['verify', 'biometric', 'biometric-login'];

  useEffect(() => {
    setAuthTokenGetter(Platform.OS === 'web' ? null : () => getToken());
    setUnauthorizedHandler(async () => {
      await signOut();
      router.replace('/login');
    });
    return () => {
      setAuthTokenGetter(null);
      setUnauthorizedHandler(null);
    };
  }, [getToken, router, signOut]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      if (route && !publicRoutes.includes(route)) router.replace('/login');
      return;
    }

    if (!isReady) return;

    if (!deviceAuthSetupComplete) {
      if (route !== 'biometric') router.replace('/biometric');
      return;
    }

    if (biometricsEnabled && !isUnlocked) {
      if (route !== 'biometric-login') router.replace('/biometric-login');
      return;
    }

    if (!isUnlocked || roleLoading || (!roleReady && !roleError) || roleError || !role) return;

    if (publicRoutes.includes(route ?? '') || lockedSessionRoutes.includes(route ?? '')) {
      router.replace(roleHome(role));
      return;
    }

    const redirectedHome = role !== 'user' || route === 'vendor' || route === 'admin'
      ? unauthorizedHome(role, route)
      : null;
    if (redirectedHome && redirectedHome !== `/${route}`) {
      router.replace(redirectedHome);
    }
  }, [
    biometricsEnabled,
    deviceAuthSetupComplete,
    isLoaded,
    isReady,
    isSignedIn,
    isUnlocked,
    role,
    roleError,
    roleLoading,
    roleReady,
    route,
    router,
  ]);

  return renderRoutes();
}

function renderRoutes() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="vendor-application" />
      <Stack.Screen name="biometric" />
      <Stack.Screen name="biometric-login" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="vendor" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="destination/[id]" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="maps" />
      <Stack.Screen name="hotels" />
      <Stack.Screen name="hotel/[id]" />
      <Stack.Screen name="place/[id]" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="food/[id]" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthSecurityProvider><AppStateProvider>
          <QueryClientProvider client={queryClient}>
            <RoleProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </RoleProvider>
          </QueryClientProvider>
        </AppStateProvider></AuthSecurityProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
    </ClerkProvider>
  );
}

