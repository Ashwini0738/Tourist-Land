// @ts-nocheck
import { useLocation } from 'wouter';
import { ShieldAlert, Users } from 'lucide-react';
import { Button } from './page-shared';

export function LoginPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 panel-shadow">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldAlert size={19} />
          </span>
          <div>
            <p className="font-semibold">Travel &amp; Land operations</p>
            <p className="eyebrow">Authorized access only</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-[-.04em]">Sign in to continue</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use your Travel &amp; Land administrator account. Sign-in and account security are handled by Clerk.
        </p>
        <div className="mt-7 rounded-lg border border-accent/40 bg-accent/12 p-4 text-xs leading-5">
          <ShieldAlert size={15} className="mr-2 inline" />
          Access checks are server-owned. No credentials are collected in this interface.
        </div>
        <Button testId="button-request-access" onClick={() => setLocation('/sign-in')}>
          <Users size={15} />
          Continue to secure sign-in
        </Button>
      </div>
    </div>
  );
}