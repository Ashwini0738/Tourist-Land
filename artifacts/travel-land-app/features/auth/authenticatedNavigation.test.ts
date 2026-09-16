import {
  resolveAuthenticatedNavigation,
  type AuthenticatedNavigationState,
} from './authenticatedNavigation';

function state(overrides: Partial<AuthenticatedNavigationState> = {}): AuthenticatedNavigationState {
  return {
    isLoaded: true,
    isSignedIn: true,
    route: 'login',
    isReady: true,
    isUnlocked: false,
    biometricsEnabled: false,
    deviceAuthSetupComplete: false,
    securityError: null,
    role: 'user',
    roleReady: true,
    roleLoading: false,
    roleError: false,
    ...overrides,
  };
}

describe('authenticated navigation state machine', () => {
  it('routes a first-time password login to biometric setup', () => {
    expect(resolveAuthenticatedNavigation(state())).toBe('/biometric');
  });

  it('routes a first-time verified signup to biometric setup', () => {
    expect(resolveAuthenticatedNavigation(state({ route: 'verify' }))).toBe('/biometric');
  });

  it('routes an enabled device-security session to biometric unlock', () => {
    expect(resolveAuthenticatedNavigation(state({
      deviceAuthSetupComplete: true,
      biometricsEnabled: true,
    }))).toBe('/biometric-login');
  });

  it('routes a device-security-disabled session to traveller Home', () => {
    expect(resolveAuthenticatedNavigation(state({
      deviceAuthSetupComplete: true,
      isUnlocked: true,
    }))).toBe('/(tabs)');
  });

  it('stays locked while SecureStore recovery is required', () => {
    expect(resolveAuthenticatedNavigation(state({
      securityError: 'SECURE_STORAGE_UNAVAILABLE',
    }))).toBeNull();
  });

  it('routes vendors to the vendor destination', () => {
    expect(resolveAuthenticatedNavigation(state({
      role: 'vendor',
      deviceAuthSetupComplete: true,
      isUnlocked: true,
    }))).toBe('/vendor');
  });

  it('routes admins to the admin destination', () => {
    expect(resolveAuthenticatedNavigation(state({
      role: 'admin',
      deviceAuthSetupComplete: true,
      isUnlocked: true,
    }))).toBe('/admin');
  });

  it('routes travellers to /(tabs)', () => {
    expect(resolveAuthenticatedNavigation(state({
      role: 'user',
      deviceAuthSetupComplete: true,
      isUnlocked: true,
    }))).toBe('/(tabs)');
  });

  it('routes an existing restored session from splash to its destination', () => {
    expect(resolveAuthenticatedNavigation(state({
      route: 'splash',
      deviceAuthSetupComplete: true,
      isUnlocked: true,
    }))).toBe('/(tabs)');
  });

  it('falls back to password login when a restored biometric session is no longer signed in', () => {
    expect(resolveAuthenticatedNavigation(state({
      route: 'biometric-login',
      isSignedIn: false,
      deviceAuthSetupComplete: true,
      biometricsEnabled: true,
    }))).toBe('/login');
  });

  it('does not route home after failed or cancelled biometric authentication', () => {
    expect(resolveAuthenticatedNavigation(state({
      route: 'biometric-login',
      deviceAuthSetupComplete: true,
      biometricsEnabled: true,
    }))).toBeNull();
  });
});