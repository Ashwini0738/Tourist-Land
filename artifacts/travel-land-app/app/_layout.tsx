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
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { useAuth, useClerk } from '@clerk/expo';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import * as SplashScreen from 'expo-splash-screen';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthSecurityProvider } from '@/context/AuthSecurityContext';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl, setUnauthorizedHandler } from '@workspace/api-client-react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

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
  const { isReady, isUnlocked, hasPin, biometricsEnabled } = useAuthSecurity();
  const colors = useColors();
  const segments = useSegments();
  const route = segments[0];
  const publicRoutes = ['splash', 'login', 'verify'];
  const lockedSessionRoutes = ['verify', 'create-pin', 'pin-login', 'biometric', 'biometric-login'];
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
  if (!isLoaded && !publicRoutes.includes(route ?? '')) return <AuthLoadingScreen label="Securing your journey…" />;
  if (!isLoaded) return renderRoutes();
  if (!isSignedIn && route && !publicRoutes.includes(route)) return <Redirect href="/login" />;
  if (isSignedIn && !isReady) return <AuthLoadingScreen label="Preparing your secure account…" />;
  if (isSignedIn && isReady && !isUnlocked && route && !lockedSessionRoutes.includes(route)) {
    if (!hasPin) return <Redirect href="/create-pin" />;
    return <Redirect href={biometricsEnabled ? '/biometric-login' : '/pin-login'} />;
  }
  return renderRoutes();
}

function AuthLoadingScreen({ label }: { label: string }) {
  const colors = useColors();
  return <View style={[styles.authLoading, { backgroundColor: colors.background }]}>
    <ActivityIndicator color={colors.primary} />
    <Text style={[styles.authLoadingText, { color: colors.mutedForeground }]}>{label}</Text>
  </View>;
}

function renderRoutes() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="create-pin" />
      <Stack.Screen name="pin-login" />
      <Stack.Screen name="biometric" />
      <Stack.Screen name="biometric-login" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="destination/[id]" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="maps" />
      <Stack.Screen name="hotels" />
      <Stack.Screen name="hotel/[id]" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="change-pin" />
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
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AppStateProvider></AuthSecurityProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  authLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  authLoadingText: { fontSize: 13, fontWeight: '600' },
});
