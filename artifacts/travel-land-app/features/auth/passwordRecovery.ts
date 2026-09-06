import * as ExpoLinking from 'expo-linking';

const NATIVE_AUTH_CALLBACK_URI = 'travel-land-app://auth/callback';
const AUTH_CALLBACK_PATH = 'auth/callback';

export type SupabaseAuthFlow = 'signup' | 'recovery';

export type PasswordRecoveryLink =
  | { kind: 'code'; code: string }
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'invalid' };

export type SupabaseAuthCallback =
  | { flow: SupabaseAuthFlow; kind: 'code'; code: string }
  | { flow: SupabaseAuthFlow; kind: 'session'; accessToken: string; refreshToken: string }
  | { flow: SupabaseAuthFlow; kind: 'invalid' };

export function getSupabaseAuthRedirectUri(flow: SupabaseAuthFlow) {
  const redirect = new URL(ExpoLinking.createURL(AUTH_CALLBACK_PATH));
  redirect.searchParams.set('flow', flow);
  return redirect.toString();
}

function callbackLocation(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

function isApprovedCallbackUrl(value: string) {
  const location = callbackLocation(value);
  if (!location) return false;
  return [
    NATIVE_AUTH_CALLBACK_URI,
    ExpoLinking.createURL(AUTH_CALLBACK_PATH),
  ].some((approved) => callbackLocation(approved) === location);
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

function callbackFlow(params: URLSearchParams): SupabaseAuthFlow | null {
  const requestedFlow = params.get('flow');
  if (requestedFlow === 'signup' || requestedFlow === 'recovery') return requestedFlow;
  const providerType = params.get('type');
  if (providerType === 'signup') return 'signup';
  if (providerType === 'recovery') return 'recovery';
  return null;
}

export function parseSupabaseAuthCallback(value: string): SupabaseAuthCallback | null {
  if (!isApprovedCallbackUrl(value)) return null;

  const params = readParams(value);
  const code = params.get('code')?.trim();
  const flow = callbackFlow(params) ?? (code ? 'recovery' : null);
  if (!flow) return null;
  const hasProviderError = params.has('error') || params.has('error_code') || params.has('error_description');
  if (hasProviderError) return { flow, kind: 'invalid' };

  if (code) {
    return { flow, kind: 'code', code };
  }

  const accessToken = params.get('access_token')?.trim();
  const refreshToken = params.get('refresh_token')?.trim();
  if (accessToken && refreshToken) {
    return { flow, kind: 'session', accessToken, refreshToken };
  }

  return { flow, kind: 'invalid' };
}

export function parsePasswordRecoveryLink(value: string): PasswordRecoveryLink | null {
  const callback = parseSupabaseAuthCallback(value);
  if (!callback || callback.flow !== 'recovery') return null;
  if (callback.kind === 'code') return { kind: 'code', code: callback.code };
  if (callback.kind === 'session') {
    return {
      kind: 'session',
      accessToken: callback.accessToken,
      refreshToken: callback.refreshToken,
    };
  }
  return { kind: 'invalid' };
}