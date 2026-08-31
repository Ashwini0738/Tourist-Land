import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const testState = vi.hoisted(() => {
  let resolveSignOut: () => void = () => {};

  return {
    authListeners: new Set<() => void>(),
    clerkListeners: new Set<(event: { user?: { id: string } }) => void>(),
    authSignedIn: true,
    signOut: vi.fn(async ({ redirectUrl }: { redirectUrl: string }) => {
      await new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      });
      testState.authSignedIn = false;
      testState.authListeners.forEach((listener) => listener());
      testState.clerkListeners.forEach((listener) => listener({ user: undefined }));
      window.history.pushState({}, '', redirectUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }),
    releaseSignOut: () => resolveSignOut(),
    reset() {
      this.authSignedIn = true;
      this.authListeners.clear();
      this.clerkListeners.clear();
      this.signOut.mockClear();
      resolveSignOut = () => {};
    },
  };
});

vi.mock('@clerk/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    SignIn: ({ path }: { path: string }) => (
      <div data-testid="clerk-sign-in">
        Clerk sign-in recovery at {path}
      </div>
    ),
    SignUp: () => <div data-testid="clerk-sign-up">Clerk sign-up</div>,
    useAuth: () => {
      React.useSyncExternalStore(
        (listener) => {
          testState.authListeners.add(listener);
          return () => testState.authListeners.delete(listener);
        },
        () => testState.authSignedIn,
        () => testState.authSignedIn,
      );
      return { isLoaded: true, isSignedIn: testState.authSignedIn };
    },
    useClerk: () => ({
      addListener: (listener: (event: { user?: { id: string } }) => void) => {
        testState.clerkListeners.add(listener);
        return () => testState.clerkListeners.delete(listener);
      },
      signOut: testState.signOut,
    }),
  };
});

vi.mock('@clerk/react/internal', () => ({
  publishableKeyFromHost: () => 'pk_test_session_recovery',
}));

vi.mock('@clerk/themes', () => ({ shadcn: {} }));

vi.mock('@workspace/api-client-react', async () => {
  const actual = await vi.importActual<typeof import('@workspace/api-client-react')>('@workspace/api-client-react');
  return {
    ...actual,
    getGetCurrentUserQueryKey: () => ['/api/current-user'],
    setUnauthorizedHandler: actual.setUnauthorizedHandler,
    useGetCurrentUser: () => ({
      data: { role: 'admin' },
      isError: false,
      isLoading: false,
    }),
  };
});

vi.mock('@/components/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/pages/audit-logs-page', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const { useListAdminAuditLogs } = await vi.importActual<typeof import('@workspace/api-client-react')>('@workspace/api-client-react');

  function AuditLogsPage() {
    const auditQuery = useListAdminAuditLogs(
      { page: 1, limit: 20 },
      {
        query: {
          queryKey: ['/api/v1/admin/audit-logs', { page: 1, limit: 20 }],
          retry: false,
        },
      },
    );

    return (
      <section>
        {auditQuery.data?.items.map((item) => (
          <p key={item.id} data-testid="audit-content">
            {(item as typeof item & { destinationName?: string }).destinationName}
          </p>
        ))}
        <button type="button" data-testid="button-expire-session" onClick={() => void auditQuery.refetch()}>
          Refresh audit history
        </button>
      </section>
    );
  }

  return { AuditLogsPage };
});

vi.mock('@/pages/login-page', () => ({
  LoginPage: () => <div>Login</div>,
}));

describe('admin session recovery', () => {
  let clearQueryCache: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    testState.reset();
    window.history.replaceState({}, '', '/audit-logs');
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({
          items: [{
            id: 'audit-1',
            destinationName: 'Kerala Backwaters',
          }],
          meta: { page: 1, limit: 20, total: 1, hasMore: false },
        }), { status: 200, headers: { 'content-type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Session expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })),
    );
    clearQueryCache = vi.spyOn(QueryClient.prototype, 'clear');
  });

  afterEach(() => {
    clearQueryCache.mockRestore();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('clears audit data before Clerk redirects an expired session to secure sign-in', async () => {
    const { default: App } = await import('@/App');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-content')).toHaveTextContent('Kerala Backwaters');
    });

    act(() => {
      screen.getByTestId('button-expire-session').click();
    });

    await waitFor(() => expect(testState.signOut).toHaveBeenCalledTimes(1));
    expect(clearQueryCache).toHaveBeenCalledTimes(1);
    expect(testState.signOut).toHaveBeenCalledWith({ redirectUrl: '/sign-in' });
    expect(window.location.pathname).toBe('/audit-logs');
    expect(screen.queryByTestId('audit-content')).not.toBeInTheDocument();
    expect(screen.getByText('Securing your session…')).toBeInTheDocument();

    act(() => {
      testState.releaseSignOut();
    });
    await waitFor(() => expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument());

    expect(window.location.pathname).toBe('/sign-in');
    expect(screen.queryByTestId('audit-content')).not.toBeInTheDocument();
  });
});