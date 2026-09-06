import {
  getSupabaseAuthRedirectUri,
  parsePasswordRecoveryLink,
  parseSupabaseAuthCallback,
} from './passwordRecovery';
import * as ExpoLinking from 'expo-linking';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

const mockCreateURL = ExpoLinking.createURL as jest.Mock;
const nativeCallback = 'travel-land-app://auth/callback';

describe('Supabase password recovery links', () => {
  beforeEach(() => {
    mockCreateURL.mockReturnValue(nativeCallback);
  });

  it('derives flow-specific callback URLs through Expo Linking', () => {
    mockCreateURL.mockReturnValue('exp://development-host/--/auth/callback');
    expect(getSupabaseAuthRedirectUri('signup')).toBe(
      'exp://development-host/--/auth/callback?flow=signup',
    );
    expect(parseSupabaseAuthCallback(
      'exp://development-host/--/auth/callback?flow=signup&code=signup-code',
    )).toEqual({ flow: 'signup', kind: 'code', code: 'signup-code' });
  });

  it('accepts the approved PKCE callback and extracts its one-time code', () => {
    expect(parsePasswordRecoveryLink(
      `${nativeCallback}?flow=recovery&code=one-time-code`,
    )).toEqual({ kind: 'code', code: 'one-time-code' });
  });

  it('accepts the approved implicit callback and extracts the session tokens', () => {
    expect(parsePasswordRecoveryLink(
      `${nativeCallback}#access_token=access-token&refresh_token=refresh-token&type=recovery`,
    )).toEqual({
      kind: 'session',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('rejects callbacks from another scheme or route', () => {
    expect(parsePasswordRecoveryLink('https://example.com/auth/callback?code=code')).toBeNull();
    expect(parsePasswordRecoveryLink('travel-land-app://other/callback?code=code')).toBeNull();
  });

  it('returns a safe invalid result for provider-rejected or incomplete links', () => {
    expect(parsePasswordRecoveryLink(
      `${nativeCallback}?flow=recovery&error=access_denied&error_description=expired`,
    )).toEqual({ kind: 'invalid' });
    expect(parsePasswordRecoveryLink(nativeCallback)).toEqual({ kind: 'invalid' });
    expect(parsePasswordRecoveryLink(
      `${nativeCallback}#access_token=token&type=signup`,
    )).toBeNull();
  });
});