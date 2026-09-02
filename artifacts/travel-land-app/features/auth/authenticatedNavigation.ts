import type { PrimaryRole } from '@workspace/api-client-react';
import { roleHome, unauthorizedHome } from '@/features/role/roleRouting';

export const publicRoutes = ['splash', 'login', 'verify', 'vendor-application'];
export const lockedSessionRoutes = ['verify', 'biometric', 'biometric-login'];

export type AuthenticatedNavigationTarget =
  | '/login'
  | '/biometric'
  | '/biometric-login'
  | '/(tabs)'
  | '/vendor'
  | '/admin'
  | null;

export type AuthenticatedNavigationState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  route: string | undefined;
  isReady: boolean;
  isUnlocked: boolean;
  biometricsEnabled: boolean;
  deviceAuthSetupComplete: boolean;
  securityError: 'SECURE_STORAGE_UNAVAILABLE' | null;
  role: PrimaryRole | null;
  roleReady: boolean;
  roleLoading: boolean;
  roleError: boolean;
};

export function resolveAuthenticatedNavigation({
  isLoaded,
  isSignedIn,
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
}: AuthenticatedNavigationState): AuthenticatedNavigationTarget {
  if (!isLoaded) return null;

  if (!isSignedIn) {
    return route && !publicRoutes.includes(route) ? '/login' : null;
  }

  if (securityError === 'SECURE_STORAGE_UNAVAILABLE' || !isReady) return null;

  if (!deviceAuthSetupComplete) {
    return route === 'biometric' ? null : '/biometric';
  }

  if (biometricsEnabled && !isUnlocked) {
    return route === 'biometric-login' ? null : '/biometric-login';
  }

  if (!isUnlocked || roleLoading || (!roleReady && !roleError) || roleError || !role) {
    return null;
  }

  if (publicRoutes.includes(route ?? '') || lockedSessionRoutes.includes(route ?? '')) {
    return roleHome(role);
  }

  const redirectedHome = role !== 'user' || route === 'vendor' || route === 'admin'
    ? unauthorizedHome(role, route)
    : null;
  return redirectedHome && redirectedHome !== `/${route}` ? redirectedHome : null;
}