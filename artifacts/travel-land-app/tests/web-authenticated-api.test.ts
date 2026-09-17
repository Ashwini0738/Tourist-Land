import { customFetch, setAuthTokenGetter, setBaseUrl, setUnauthorizedHandler } from '../../../lib/api-client-react/src/custom-fetch';

const mockFetch = jest.fn();

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestHeaders() {
  const [, init] = mockFetch.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined];
  return new Headers(init?.headers);
}

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch as typeof fetch;
  setBaseUrl('https://api.example.test');
  setAuthTokenGetter(null);
  setUnauthorizedHandler(null);
});

afterEach(() => {
  setBaseUrl(null);
  setAuthTokenGetter(null);
  setUnauthorizedHandler(null);
});

describe('Expo Web authenticated API requests', () => {
  it('registers and uses the Clerk getToken getter for Web requests', async () => {
    const getToken = jest.fn().mockResolvedValue('test-token');
    mockFetch.mockResolvedValueOnce(response({ role: 'traveller' }));
    setAuthTokenGetter(() => getToken());

    await customFetch('/api/v1/me', { responseType: 'json' });

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(requestHeaders().get('authorization')).toBe('Bearer test-token');
  });

  it('sends the bearer Authorization header for an authenticated /v1/me response', async () => {
    const getToken = jest.fn().mockResolvedValue('test-token');
    mockFetch.mockResolvedValueOnce(response({ id: 'user-1', role: 'traveller' }));
    setAuthTokenGetter(() => getToken());

    const currentUser = await customFetch<{ id: string; role: string }>('/api/v1/me', {
      responseType: 'json',
    });

    expect(currentUser).toEqual({ id: 'user-1', role: 'traveller' });
    expect(requestHeaders().get('authorization')).toBe('Bearer test-token');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not send an invalid Authorization header when Clerk has no token', async () => {
    const getToken = jest.fn().mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce(response({ ok: true }));
    setAuthTokenGetter(() => getToken());

    await customFetch('/api/v1/me', { responseType: 'json' });

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(requestHeaders().get('authorization')).toBeNull();
  });

  it('invokes the existing 401 handler once without retrying the request', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    const replace = jest.fn();
    mockFetch.mockResolvedValueOnce(response({ error: 'UNAUTHENTICATED' }, 401));
    setUnauthorizedHandler(async () => {
      await signOut();
      replace('/login');
    });

    await expect(customFetch('/api/v1/me', { responseType: 'json' })).rejects.toMatchObject({
      status: 401,
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/login');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('preserves bearer authentication for native requests', async () => {
    const getToken = jest.fn().mockResolvedValue('native-test-token');
    mockFetch.mockResolvedValueOnce(response({ ok: true }));
    setAuthTokenGetter(() => getToken());

    await customFetch('/api/v1/bookings', { responseType: 'json' });

    expect(requestHeaders().get('authorization')).toBe('Bearer native-test-token');
  });
});