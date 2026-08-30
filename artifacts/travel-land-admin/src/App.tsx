import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminShell } from '@/components/admin-shell';
import {
  AuditLogsPage, BookingsPage, ContentPage, DashboardPage, DestinationsPage, EventsPage,
  HotelsPage, LoginPage, NotificationsPage, PaymentsPage, PlacesPage, PropertiesPage,
  ReviewsPage, RoomsPage, SettingsPage, UsersPage, VendorsPage,
} from '@/pages/admin-pages';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  return <DashboardPage />;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <AdminShell><Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/" component={Home} />
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
      </Switch></AdminShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
           <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
