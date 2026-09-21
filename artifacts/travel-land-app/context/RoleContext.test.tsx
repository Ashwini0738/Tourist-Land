import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMobileAuth } from './AuthContext';
import { useAuthSecurity } from './AuthSecurityContext';
import { RoleProvider, useRole } from './RoleContext';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { Text } from 'react-native';

jest.mock('./AuthContext', () => ({ useMobileAuth: jest.fn() }));
jest.mock('./AuthSecurityContext', () => ({ useAuthSecurity: jest.fn() }));

const mockUseMobileAuth = useMobileAuth as jest.Mock;
const mockUseAuthSecurity = useAuthSecurity as jest.Mock;
const mockFetch = jest.fn();
let queryClient: QueryClient | null = null;

function Probe() {
  const { currentUser, role, isReady } = useRole();
  return (
    <Text testID="profile">
      {`${isReady}:${role ?? 'none'}:${currentUser?.email ?? 'none'}:${currentUser?.displayName ?? 'none'}`}
    </Text>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = null;
  globalThis.fetch = mockFetch as typeof fetch;
  setBaseUrl('https://api.example.test');
  setAuthTokenGetter(() => 'clerk-demo-token');
  mockUseMobileAuth.mockReturnValue({
    isSignedIn: true,
    userId: 'clerk-demo-user',
  });
  mockUseAuthSecurity.mockReturnValue({
    isReady: true,
    isUnlocked: true,
  });
  mockFetch.mockResolvedValue(new Response(JSON.stringify({
    id: 'local-demo-user',
    clerkUserId: 'clerk-demo-user',
    email: 'demo@travel-land.example',
    displayName: 'Travel & Land Demo',
    phone: null,
    avatarUrl: null,
    role: 'user',
    status: 'active',
    vendorProfile: null,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));
});

afterEach(() => {
  queryClient?.clear();
  queryClient = null;
  setBaseUrl(null);
  setAuthTokenGetter(null);
});

it('loads the authenticated server profile after Clerk sign-in', async () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = render(
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <Probe />
      </RoleProvider>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('profile').props.children).toBe(
      'true:user:demo@travel-land.example:Travel & Land Demo',
    );
  });

  const [requestUrl, requestInit] = mockFetch.mock.calls[0] as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];
  expect(requestUrl).toBe('https://api.example.test/api/v1/me');
  expect(new Headers(requestInit?.headers).get('authorization')).toBe('Bearer clerk-demo-token');
});
