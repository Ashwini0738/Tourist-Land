import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import * as SplashScreen from 'expo-splash-screen';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthSecurityProvider } from '@/context/AuthSecurityContext';
import { RoleProvider, useRole } from '@/context/RoleContext';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl, setUnauthorizedHandler } from '@workspace/api-client-react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { resolveAuthenticatedNavigation } from '@/features/auth/authenticatedNavigation';
import { SecureStorageRecovery } from '@/components/SecureStorageRecovery';
import { MobileAuthProvider, useMobileAuth } from '@/context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RoleResolutionError({
  onRetry,
  accountNotLinked,
}: {
  onRetry: () => Promise<unknown>;
  accountNotLinked: boolean;
}) {
  const colors = useColors();
  const { signOut, clearAccessError } = useMobileAuth();
  const router = useRouter();
  const [action, setAction] = useState<'retrying' | 'signing-out' | null>(null);
  const [message, setMessage] = useState('');

  const retry = async () => {
    if (action) return;
    setAction('retrying');
    setMessage('');
    try {
      clearAccessError();
      await onRetry();
    } catch {
      setMessage('We could not refresh your access yet. Please try again.');
    } finally {
      setAction(null);
    }
  };

  const leave = async () => {
    if (action) return;
    setAction('signing-out');
    setMessage('');
    try {
      await signOut();
      router.replace('/login');
    } catch {
      setMessage('We could not sign you out. Please try again.');
      setAction(null);
    }
  };

  return (
    <View style={[styles.roleErrorOverlay, { backgroundColor: colors.background }]}>
      <Text style={[styles.roleErrorKicker, { color: colors.primary }]}>ACCESS CHECK</Text>
      <Text style={[styles.roleErrorTitle, { color: colors.foreground }]}>
        {accountNotLinked ? 'Your account is not linked yet.' : 'We could not verify your access.'}
      </Text>
      <Text style={[styles.roleErrorText, { color: colors.mutedForeground }]}>
        {accountNotLinked
          ? 'Your email session is secure, but it is not connected to a Travel & Land account. No bookings or saved data were changed. Contact support or sign out safely.'
          : 'Your secure session is still protected, but your Travel & Land role could not be loaded. Try again or sign out safely.'}
      </Text>
      {!!message && <Text style={[styles.roleErrorMessage, { color: colors.destructive }]}>{message}</Text>}
      <Pressable
        accessibilityRole="button"
        disabled={Boolean(action)}
        onPress={() => void retry()}
        style={[styles.roleErrorButton, { backgroundColor: colors.primary }]}
      >
        {action === 'retrying' ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.roleErrorButtonText, { color: colors.primaryForeground }]}>Try again</Text>}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={Boolean(action)}
        onPress={() => void leave()}
        style={[styles.roleErrorSecondary, { borderColor: colors.border }]}
      >
        {action === 'signing-out' ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.roleErrorSecondaryText, { color: colors.primary }]}>Sign out and return to login</Text>}
      </Pressable>
    </View>
  );
}

function RootLayoutNav() {
  const {
    provider,
    isLoaded,
    isSignedIn,
    getToken,
    signOut,
    accessError,
    markAccountNotLinked,
    isPasswordRecovery,
    isIdentityLinking,
  } = useMobileAuth();
  const router = useRouter();
  const { isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete, securityError, retrySecurityState } = useAuthSecurity();
  const { role, isReady: roleReady, isLoading: roleLoading, isError: roleError, refetch: refetchRole } = useRole();
  const colors = useColors();
  const segments = useSegments();
  const route = segments[0];

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setUnauthorizedHandler(async () => {
      if (provider === 'supabase') {
        markAccountNotLinked();
        return;
      }
      await signOut();
      router.replace('/login');
    });
    return () => {
      setAuthTokenGetter(null);
      setUnauthorizedHandler(null);
    };
  }, [getToken, markAccountNotLinked, provider, router, signOut]);

  useEffect(() => {
    const target = resolveAuthenticatedNavigation({
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      route,
      isReady,
      isUnlocked,
      biometricsEnabled,
      deviceAuthSetupComplete,
      securityError,
      role,
      roleReady,
      roleLoading,
      roleError,
      isPasswordRecovery,
    });
    if (target) router.replace(target);
  }, [
    biometricsEnabled,
    deviceAuthSetupComplete,
    isLoaded,
    isReady,
    isSignedIn,
    isPasswordRecovery,
    isUnlocked,
    role,
    roleError,
    roleLoading,
    roleReady,
    route,
    router,
    securityError,
  ]);

  const showRoleError = Boolean(isSignedIn && isReady && isUnlocked && roleError && !isIdentityLinking);
  const showSecureStorageRecovery = Boolean(isSignedIn && securityError === 'SECURE_STORAGE_UNAVAILABLE');

  return (
    <View style={styles.root}>
      {renderRoutes()}
      {showRoleError && <RoleResolutionError onRetry={refetchRole} accountNotLinked={accessError === 'ACCOUNT_NOT_LINKED'} />}
      {showSecureStorageRecovery && <SecureStorageRecovery onRetry={retrySecurityState} />}
    </View>
  );
}

function renderRoutes() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="vendor-application" />
      <Stack.Screen name="biometric" />
      <Stack.Screen name="biometric-login" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="vendor" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="destination/[id]" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="property-enquiry" />
      <Stack.Screen name="property-enquiries" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="trips" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="review" />
      <Stack.Screen name="maps" />
      <Stack.Screen name="hotels" />
      <Stack.Screen name="hotel/[id]" />
      <Stack.Screen name="hotel/availability" />
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
      <MobileAuthProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <AuthSecurityProvider>
              <QueryClientProvider client={queryClient}>
                <AppStateProvider>
                  <RoleProvider>
                    <GestureHandlerRootView style={styles.gestureRoot}>
                      <RootLayoutNav />
                    </GestureHandlerRootView>
                  </RoleProvider>
                </AppStateProvider>
              </QueryClientProvider>
            </AuthSecurityProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </MobileAuthProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gestureRoot: { flex: 1 },
  roleErrorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  roleErrorKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  roleErrorTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  roleErrorText: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  roleErrorMessage: { fontSize: 13, lineHeight: 18, marginTop: 16 },
  roleErrorButton: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  roleErrorButtonText: { fontSize: 16, fontWeight: '700' },
  roleErrorSecondary: { minHeight: 54, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  roleErrorSecondaryText: { fontSize: 14, fontWeight: '700' },
});

