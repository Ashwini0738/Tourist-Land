// @ts-nocheck
import {
  useGetAdminOperationsDashboard,
} from '@workspace/api-client-react';
import {
  Activity,
  Clock3,
  Landmark,
  MapPin,
  RefreshCw,
  Tag,
  Users,
} from 'lucide-react';
import { amount, Button, day, QueryState, Title } from './page-shared';

export function DashboardPage() {
  const q = useGetAdminOperationsDashboard();
  const d = q.data;
  const cards = d
    ? [
        { label: 'Users', n: d.users.total, sub: `${d.users.active} active`, Icon: Users, color: 'bg-primary' },
        { label: 'Vendors', n: d.vendors.total, sub: `${d.vendors.pending} awaiting review`, Icon: Landmark, color: 'bg-[hsl(151_30%_43%)]' },
        { label: 'Hotels', n: d.hotels.total, sub: `${d.hotels.active} active`, Icon: MapPin, color: 'bg-accent' },
        { label: 'Bookings', n: d.bookings.total, sub: `${d.bookings.pending} pending`, Icon: Tag, color: 'bg-[hsl(281_25%_45%)]' },
      ]
    : [];
  return (
    <div className="rise-in">
      <Title
        eyebrow="Northstar / command center"
        title="Platform operations"
        description="A calm read on the marketplace. Review the signals that need a human decision."
        action={
          <Button
            testId="button-refresh-dashboard"
            variant="quiet"
            onClick={() => q.refetch()}
          >
            <RefreshCw size={14} />
            Refresh data
          </Button>
        }
      />
      <QueryState query={q}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="group rounded-xl border border-border bg-card p-5 panel-shadow transition hover:-translate-y-0.5"
            >
              <div className="mb-5 flex justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color} ${
                    card.label === 'Hotels'
                      ? 'text-primary-foreground'
                      : 'text-sidebar-foreground'
                  }`}
                >
                  <card.Icon size={17} />
                </span>
                <Activity size={16} className="text-muted-foreground/50" />
              </div>
              <p className="eyebrow">{card.label}</p>
              <p
                data-testid={`metric-${card.label.toLowerCase()}`}
                className="mono mt-1 text-3xl font-bold"
              >
                {card.n.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{card.sub}</p>
            </div>
          ))}
        </div>
        {d && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-xl border border-border bg-card p-6 panel-shadow">
              <p className="eyebrow">Operations pulse</p>
              <h2 className="mt-1 text-lg font-semibold">Where attention is waiting</h2>
              <div className="mt-7 space-y-5">
                {[
                  ['Users', d.users],
                  ['Vendors', d.vendors],
                  ['Hotels', d.hotels],
                  ['Bookings', d.bookings],
                ].map(([label, metrics]: any) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">
                        {metrics.pending} pending · {metrics.rejected} rejected
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${metrics.total ? Math.max(4, (metrics.active / metrics.total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 panel-shadow">
              <p className="eyebrow">Payment visibility</p>
              <h2 className="mt-1 text-lg font-semibold">Revenue reporting</h2>
              <div className="mt-8 flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                {d.revenue.status === 'available'
                  ? 'Available from provider'
                  : 'Unavailable from current data'}
              </div>
              {d.revenue.status === 'available' ? (
                <p data-testid="text-payment-volume" className="mono mt-4 text-3xl font-bold">
                  {amount(d.revenue.paymentVolume, d.revenue.currency)}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Financial totals are intentionally not estimated. Payment oversight remains available in Payments.
                </p>
              )}
              <p className="mt-8 border-t border-border pt-4 text-[11px] text-muted-foreground">
                Generated {day(d.generatedAt)} · Source: operations database
              </p>
            </div>
          </div>
        )}
        <div className="mt-5 rounded-xl border border-dashed border-border bg-card/60 p-6">
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 text-accent-foreground" size={18} />
            <div>
              <p className="text-sm font-semibold">Recent operational activity</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Activity feed is not included in the available dashboard contract. Audit history is the source of truth for immutable administrative actions.
              </p>
            </div>
          </div>
        </div>
      </QueryState>
    </div>
  );
}