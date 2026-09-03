import {
  PASSWORD_RECOVERY_REDIRECT_URI,
  parsePasswordRecoveryLink,
} from './passwordRecovery';

describe('Supabase password recovery links', () => {
  it('accepts the approved PKCE callback and extracts its one-time code', () => {
    expect(parsePasswordRecoveryLink(
      `${PASSWORD_RECOVERY_REDIRECT_URI}?code=one-time-code`,
    )).toEqual({ kind: 'code', code: 'one-time-code' });
  });

  it('accepts the approved implicit callback and extracts the session tokens', () => {
    expect(parsePasswordRecoveryLink(
      `${PASSWORD_RECOVERY_REDIRECT_URI}#access_token=access-token&refresh_token=refresh-token&type=recovery`,
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
      `${PASSWORD_RECOVERY_REDIRECT_URI}?error=access_denied&error_description=expired`,
    )).toEqual({ kind: 'invalid' });
    expect(parsePasswordRecoveryLink(`${PASSWORD_RECOVERY_REDIRECT_URI}`)).toEqual({ kind: 'invalid' });
    expect(parsePasswordRecoveryLink(
      `${PASSWORD_RECOVERY_REDIRECT_URI}#access_token=token&type=signup`,
    )).toEqual({ kind: 'invalid' });
  });
});