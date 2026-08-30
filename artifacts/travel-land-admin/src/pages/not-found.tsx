import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 panel-shadow">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <h1 className="text-xl font-semibold">Page not found</h1>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          This workspace route does not exist. Use the navigation to return to the operations overview.
        </p>
      </div>
    </div>
  );
}
