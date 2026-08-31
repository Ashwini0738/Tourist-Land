// @ts-nocheck
import type { ReactNode } from 'react';

import { CircleAlert, Database, Filter, Search } from 'lucide-react';

export const dialogFocusableSelector =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const val = (v: unknown, fallback = 'Unavailable') =>
  v === null || v === undefined || v === '' ? fallback : String(v);
export const day = (v: unknown) =>
  v
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(String(v)))
    : 'Unavailable';
export const amount = (v: unknown, c?: unknown) =>
  typeof v === 'number'
    ? `${val(c, '')} ${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`.trim()
    : 'Unavailable';

export function Button({
  children,
  onClick,
  testId,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  testId: string;
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition duration-200 active:scale-[.98] disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md'
          : 'border border-border bg-card hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export function Title({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-.045em]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Badge({ value }: { value: unknown }) {
  const text = val(value);
  const good = [
    'active',
    'approved',
    'published',
    'confirmed',
    'paid',
    'available',
  ].includes(text);
  const warn = ['pending', 'processing', 'pending_payment', 'draft'].includes(
    text,
  );
  return (
    <span
      data-testid={`status-${text}`}
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${
        good
          ? 'bg-[hsl(151_30%_43%/.12)] text-[hsl(151_30%_32%)]'
          : warn
            ? 'bg-[hsl(39_81%_63%/.22)] text-[hsl(29_55%_32%)]'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {text.replaceAll('_', ' ')}
    </span>
  );
}

export function QueryState({
  query,
  empty,
  children,
}: {
  query: any;
  empty?: boolean;
  children: ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-card p-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-10 text-center">
        <CircleAlert className="mx-auto mb-3 text-destructive" size={24} />
        <p className="font-semibold">This view could not load</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Check administrator access or try again.
        </p>
        <Button testId="button-retry" variant="quiet" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-12 text-center">
        <Database className="mx-auto mb-3 text-muted-foreground/60" size={25} />
        <p className="font-semibold">No records to review</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only server-provided records appear here. Nothing has been fabricated.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Table({
  heads,
  children,
}: {
  heads: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card panel-shadow">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/45">
              {heads.map((head) => (
                <th
                  key={head}
                  className="whitespace-nowrap px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Row({ id, children }: { id: string; children: ReactNode }) {
  return (
    <tr data-testid={`row-${id}`} className="transition-colors hover:bg-muted/35">
      {children}
    </tr>
  );
}

export function Cell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-5 py-4 align-middle text-sm ${className}`}>{children}</td>;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search records',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative max-w-md flex-1">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={16}
      />
      <input
        data-testid="input-search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

export function ShellList({
  title,
  eyebrow,
  description,
  query,
  items,
  setSearch,
  search,
  children,
  count,
}: {
  title: string;
  eyebrow: string;
  description: string;
  query: any;
  items: any[];
  setSearch: (v: string) => void;
  search: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <div className="rise-in">
      <Title eyebrow={eyebrow} title={title} description={description} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} />
        <span className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          {count ?? items.length} records
        </span>
        <button
          data-testid="button-filter"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-semibold hover:bg-muted"
        >
          <Filter size={14} />
          Filters
        </button>
      </div>
      <QueryState query={query} empty={!items.length}>
        {children}
      </QueryState>
    </div>
  );
}