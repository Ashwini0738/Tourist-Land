import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { getGetCurrentUserQueryKey, setUnauthorizedHandler, useGetCurrentUser } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminShell } from '@/components/admin-shell';
import NotFound from '@/pages/not-found';
import { ShieldAlert } from 'lucide-react';
import {
  Route,
  Redirect,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const signInPath = `${basePath}/sign-in`;

const AuditLogsPage = lazy(() =>
  import('@/pages/audit-logs-page').then(({ AuditLogsPage }) => ({
    default: AuditLogsPage,
  })),
);
const BookingsPage = lazy(() =>
  import('@/pages/bookings-page').then(({ BookingsPage }) => ({
    default: BookingsPage,
  })),
);
const ContentPage = lazy(() =>
  import('@/pages/content-page').then(({ ContentPage }) => ({
    default: ContentPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/pages/dashboard-page').then(({ DashboardPage }) => ({
    default: DashboardPage,
  })),
);
const DestinationsPage = lazy(() =>
  import('@/pages/destinations-page').then(({ DestinationsPage }) => ({
    default: DestinationsPage,
  })),
);
const EventsPage = lazy(() =>
  import('@/pages/events-page').then(({ EventsPage }) => ({
    default: EventsPage,
  })),
);
const HotelsPage = lazy(() =>
  import('@/pages/hotels-page').then(({ HotelsPage }) => ({
    default: HotelsPage,
  })),
);
const LoginPage = lazy(() =>
  import('@/pages/login-page').then(({ LoginPage }) => ({
    default: LoginPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/notifications-page').then(({ NotificationsPage }) => ({
    default: NotificationsPage,
  })),
);
const PaymentsPage = lazy(() =>
  import('@/pages/payments-page').then(({ PaymentsPage }) => ({
    default: PaymentsPage,
  })),
);
const PlacesPage = lazy(() =>
  import('@/pages/places-page').then(({ PlacesPage }) => ({
    default: PlacesPage,
  })),
);
const PropertiesPage = lazy(() =>
  import('@/pages/properties-page').then(({ PropertiesPage }) => ({
    default: PropertiesPage,
  })),
);
const ReviewsPage = lazy(() =>
  import('@/pages/reviews-page').then(({ ReviewsPage }) => ({
    default: ReviewsPage,
  })),
);
const RoomsPage = lazy(() =>
  import('@/pages/rooms-page').then(({ RoomsPage }) => ({
    default: RoomsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings-page').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/pages/users-page').then(({ UsersPage }) => ({
    default: UsersPage,
  })),
);
const VendorsPage = lazy(() =>
  import('@/pages/vendors-page').then(({ VendorsPage }) => ({
    default: VendorsPage,
  })),
);

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(199 55% 31%)',
    colorForeground: 'hsl(205 28% 18%)',
    colorMutedForeground: 'hsl(205 16% 44%)',
    colorDanger: 'hsl(0 64% 50%)',
    colorBackground: 'hsl(43 36% 98%)',
    colorInput: 'hsl(43 36% 98%)',
    colorInputForeground: 'hsl(205 28% 18%)',
    colorNeutral: 'hsl(39 20% 86%)',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-card rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    footerActionLink: 'text-primary',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-[hsl(151_30%_32%)]',
    alertText: 'text-destructive',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-border bg-card hover:bg-muted',
    formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    formFieldInput: 'border-border bg-card text-foreground',
    footerAction: 'border-border',
    dividerLine: 'bg-border',
    alert: 'border-destructive/25 bg-destructive/5',
    otpCodeFieldInput: 'border-border bg-card text-foreground',
    formFieldRow: 'text-foreground',
    main: 'bg-card',
  },
};

function LoadingScreen({ message = 'Checking secure access…' }: { message?: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <div className="rounded-2xl border border-border bg-card px-8 py-10 text-center panel-shadow">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function LoginRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LoginPage />;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <LoginPage />;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function AccessDeniedPage() {
  const { signOut } = useClerk();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center panel-shadow">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert size={22} />
        </div>
        <p className="eyebrow">Administrator access required</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.04em]">This account cannot enter the console</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Your Clerk account is signed in, but it does not have an active platform administrator role.
          Contact an existing administrator if you believe this is incorrect.
        </p>
        <button
          type="button"
          data-testid="button-access-denied-sign-out"
          onClick={() => void signOut({ redirectUrl: basePath || '/' })}
          className="mt-7 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function AdminArea() {
  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/login" />;
  if (currentUser.isLoading) return <LoadingScreen message="Verifying administrator access…" />;
  if (currentUser.isError) {
    const status = (currentUser.error as { status?: number } | undefined)?.status;
    if (status === 403) return <AccessDeniedPage />;
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center panel-shadow">
          <ShieldAlert className="mx-auto mb-4 text-destructive" size={24} />
          <h1 className="text-2xl font-semibold tracking-[-.04em]">Access could not be verified</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The secure workspace could not reach the Travel &amp; Land API. Try again without signing out.
          </p>
          <button
            type="button"
            data-testid="button-retry-access"
            onClick={() => void currentUser.refetch()}
            className="mt-7 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (currentUser.data?.role !== 'admin') return <AccessDeniedPage />;

  return (
    <AdminShell>
      <Suspense fallback={<LoadingScreen message="Loading workspace view…" />}>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/vendors" component={VendorsPage} />
          <Route path="/hotels" component={HotelsPage} />
          <Route path="/rooms" component={() => <RoomsPage />} />
          <Route path="/availability" component={() => <RoomsPage availability />} />
          <Route path="/destinations" component={DestinationsPage} />
          <Route path="/places" component={PlacesPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/properties" component={PropertiesPage} />
          <Route path="/bookings" component={BookingsPage} />
          <Route path="/payments" component={PaymentsPage} />
          <Route path="/reviews" component={ReviewsPage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/content" component={ContentPage} />
          <Route path="/audit-logs" component={AuditLogsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AdminShell>
  );
}

function ClerkQueryClientCacheInvalidator({
  onSessionRecovery,
  onSessionRecoveryComplete,
}: {
  onSessionRecovery: () => void;
  onSessionRecoveryComplete: () => void;
}) {
  const { addListener, signOut } = useClerk();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      onSessionRecovery();
      queryClient.clear();
      await signOut({ redirectUrl: signInPath });
      onSessionRecoveryComplete();
    });
    return () => setUnauthorizedHandler(null);
  }, [onSessionRecovery, signOut]);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/login" component={LoginRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={AdminArea} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const [isSessionRecovery, setIsSessionRecovery] = useState(false);

  function stripBase(path: string) {
    return basePath && path.startsWith(basePath)
      ? path.slice(basePath.length) || '/'
      : path;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Travel & Land operations',
            subtitle: 'Sign in to access the administrator console',
          },
        },
        signUp: {
          start: {
            title: 'Create your administrator account',
            subtitle: 'An administrator must approve access before you can enter',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator
        onSessionRecovery={() => setIsSessionRecovery(true)}
        onSessionRecoveryComplete={() => setIsSessionRecovery(false)}
      />
      {isSessionRecovery ? <LoadingScreen message="Securing your session…" /> : <Router />}
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;