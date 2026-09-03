export const PASSWORD_RECOVERY_REDIRECT_URI = 'travel-land-app://auth/callback';

export type PasswordRecoveryLink =
  | { kind: 'code'; code: string }
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'invalid' };

function isApprovedCallbackUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'travel-land-app:') return false;
    return (
      (url.hostname === 'auth' && url.pathname === '/callback') ||
      (url.hostname === '' && url.pathname === '/auth/callback')
    );
  } catch {
    return false;
  }
}

function readParams(value: string) {
  const queryStart = value.indexOf('?');
  const hashStart = value.indexOf('#');
  const queryEnd = hashStart >= 0 ? hashStart : value.length;
  const query = queryStart >= 0 && queryStart < queryEnd
    ? value.slice(queryStart + 1, queryEnd)
    : '';
  const hash = hashStart >= 0 ? value.slice(hashStart + 1) : '';
  return new URLSearchParams(`${query}${query && hash ? '&' : ''}${hash}`);
}

export function parsePasswordRecoveryLink(value: string): PasswordRecoveryLink | null {
  if (!isApprovedCallbackUrl(value)) return null;

  const params = readParams(value);
  const hasRecoveryError = params.has('error') || params.has('error_code') || params.has('error_description');
  if (hasRecoveryError) return { kind: 'invalid' };

  const code = params.get('code')?.trim();
  if (code && (!params.has('type') || params.get('type') === 'recovery')) {
    return { kind: 'code', code };
  }

  const accessToken = params.get('access_token')?.trim();
  const refreshToken = params.get('refresh_token')?.trim();
  if (params.get('type') === 'recovery' && accessToken && refreshToken) {
    return { kind: 'session', accessToken, refreshToken };
  }

  return { kind: 'invalid' };
}