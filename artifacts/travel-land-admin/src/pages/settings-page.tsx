// @ts-nocheck
import { useGetCurrentUser } from '@workspace/api-client-react';
import { Check, ShieldAlert } from 'lucide-react';
import { Badge, QueryState, Title, val } from './page-shared';

export function SettingsPage() {
  const q = useGetCurrentUser();
  const user: any = q.data;
  return (
    <div className="rise-in">
      <Title
        eyebrow="Workspace controls"
        title="Settings"
        description="Identity and access values are read from the authenticated platform session."
      />
      <QueryState query={q}>
        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-xl border border-border bg-card p-6 panel-shadow">
            <p className="eyebrow">Administrator profile</p>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <ShieldAlert size={22} />}
              </div>
              <div>
                <h2 data-testid="text-admin-display-name" className="text-lg font-semibold">{val(user.displayName, 'Unnamed administrator')}</h2>
                <p data-testid="text-admin-email" className="text-sm text-muted-foreground">{val(user.email)}</p>
              </div>
            </div>
            <div className="mt-7 space-y-4 text-sm">
              <div className="flex justify-between border-b border-border pb-3"><span className="text-muted-foreground">Access level</span><strong data-testid="text-admin-role">{val(user.role)}</strong></div>
              <div className="flex justify-between border-b border-border pb-3"><span className="text-muted-foreground">Account status</span><Badge value={user.status} /></div>
              <div className="flex justify-between border-b border-border pb-3"><span className="text-muted-foreground">Session security</span><span className="font-medium text-[hsl(151_30%_32%)]">Protected by Clerk</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Profile editing</span><span className="text-xs text-muted-foreground">Managed by the identity provider</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-sidebar p-6 text-sidebar-foreground">
            <p className="eyebrow text-sidebar-foreground/50">Operating principles</p>
            <div className="mt-5 space-y-5">
              {[
                ['Accuracy before speed', 'Only values returned by the platform API are shown.'],
                ['Ownership stays visible', 'Vendor relationships are never inferred or hidden.'],
                ['Every change leaves a trace', 'Status actions are designed for auditability.'],
              ].map(([title, copy]) => (
                <div className="flex gap-3" key={title}>
                  <Check size={17} className="mt-0.5 shrink-0 text-accent" />
                  <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-sidebar-foreground/60">{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </QueryState>
    </div>
  );
}