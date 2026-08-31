// @ts-nocheck
import { useMemo, useState } from 'react';
import { getExportAdminReportsUrl, useGetAdminReports } from '@workspace/api-client-react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  Filter,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, type ChartConfig } from '../components/ui/chart';
import {
  Badge,
  Button,
  Cell,
  day,
  QueryState,
  Row,
  Table,
  Title,
  val,
} from './page-shared';

type DatePreset = '7d' | '30d' | 'quarter' | 'custom';
type TableKey = 'bookings' | 'payments' | 'properties' | 'enquiries' | 'vendors';

const TABLE_LABELS: Record<TableKey, string> = {
  bookings: 'Bookings',
  payments: 'Payments',
  properties: 'Properties',
  enquiries: 'Enquiries',
  vendors: 'Vendors',
};

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayNumber = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNumber}`;
};

const formatCompactDate = (value: unknown) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(String(value)),
  );
};

const prettyKey = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const exportFileName = (table: TableKey, from: string, to: string) =>
  `travel-land-${table}-${from}-to-${to}.csv`;

const exportUrl = ({
  table,
  from,
  to,
  country,
  status,
}: {
  table: TableKey;
  from?: string;
  to?: string;
  country?: string;
  status?: string;
}) => {
  return getExportAdminReportsUrl({ from, to, country, status, table });
};

const responseErrorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    if (body?.error?.message) return body.error.message;
  } catch {
    // The service may have closed the response before writing its JSON error.
  }
  return `The report service returned an error (${response.status}). Try again.`;
};

async function streamExportToFile(
  url: string,
  fileName: string,
  onProgress: (message: string) => void,
): Promise<boolean> {
  const showSaveFilePicker = (window as any).showSaveFilePicker;
  if (typeof showSaveFilePicker !== 'function') return false;

  let writable: any;
  try {
    const fileHandle = await showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
    });
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(await responseErrorMessage(response));
    if (!response.body) throw new Error('The browser could not read the streamed export. Try again.');

    writable = await fileHandle.createWritable();
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      await writable.write(chunk.value);
      receivedBytes += chunk.value.byteLength;
      onProgress(
        contentLength
          ? `Downloading server export… ${Math.round((receivedBytes / contentLength) * 100)}%`
          : `Downloading server export… ${(receivedBytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 0 })} KB received`,
      );
    }
    await writable.close();
    return true;
  } catch (cause) {
    try {
      await writable?.abort();
    } catch {
      // The partial file is best-effort cleanup; the original stream error is more useful.
    }
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    if (cause instanceof Error && cause.message.startsWith('The report')) throw cause;
    throw new Error('The export download was interrupted before it finished. Try again.');
  }
}

function MetricCard({
  label,
  value,
  detail,
  tone = 'primary',
  icon: Icon,
}: {
  label: string;
  value: unknown;
  detail: string;
  tone?: 'primary' | 'gold' | 'green' | 'ink';
  icon: typeof BarChart3;
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    gold: 'bg-accent/25 text-accent-foreground',
    green: 'bg-[hsl(151_30%_43%/.14)] text-[hsl(151_30%_32%)]',
    ink: 'bg-foreground/8 text-foreground',
  }[tone];

  return (
    <div className="group rounded-xl border border-border bg-card p-5 panel-shadow transition duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={17} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
          live
        </span>
      </div>
      <p data-testid={`text-report-kpi-${label}`} className="mt-5 text-sm font-medium text-muted-foreground">
        {prettyKey(label)}
      </p>
      <p className="mono mt-1 text-[clamp(1.5rem,2.5vw,2rem)] font-bold tracking-[-.06em]">
        {typeof value === 'number' ? value.toLocaleString() : val(value)}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function CurrencyPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ currency: string; amount: number; records: number }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 panel-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{title}</p>
          <h3 className="mt-1 text-base font-semibold">Currency totals</h3>
        </div>
        <CircleDollarSign size={18} className="text-accent-foreground" />
      </div>
      {!items.length ? (
        <p className="mt-7 text-sm text-muted-foreground">No currency totals in this range.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={`${title}-${item.currency}`}
              data-testid={`currency-total-${title.toLowerCase()}-${item.currency}`}
              className="flex items-center justify-between border-b border-border/70 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <span className="mono text-sm font-bold">{item.currency}</span>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.records.toLocaleString()} records
                </p>
              </div>
              <span className="mono text-sm font-semibold">
                {item.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Array<{ status: string; count: number }>;
}) {
  const maximum = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-5 panel-shadow">
      <p className="eyebrow">{title}</p>
      <div className="mt-4 space-y-4">
        {!items.length && <p className="text-sm text-muted-foreground">No breakdown returned.</p>}
        {items.map((item) => (
          <div key={`${title}-${item.status}`} data-testid={`breakdown-${title.toLowerCase()}-${item.status}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{item.status.replaceAll('_', ' ')}</span>
              <span className="mono text-muted-foreground">{item.count.toLocaleString()}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(item.count ? 4 : 0, (item.count / maximum) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ trends }: { trends: any[] }) {
  const config: ChartConfig = {
    bookings: { label: 'Bookings', color: 'hsl(199 55% 31%)' },
    payments: { label: 'Payments', color: 'hsl(39 81% 50%)' },
    enquiries: { label: 'Enquiries', color: 'hsl(151 30% 43%)' },
    reviews: { label: 'Reviews', color: 'hsl(281 25% 45%)' },
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 panel-shadow">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="eyebrow">Recorded activity</p>
          <h2 className="mt-1 text-base font-semibold">Daily operating trend</h2>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          {Object.entries(config).map(([key, item]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {!trends.length ? (
        <div className="mt-7 flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
          No trend records in this range.
        </div>
      ) : (
        <ChartContainer config={config} className="mt-5 h-64 w-full aspect-auto">
          <AreaChart data={trends} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              {Object.entries(config).map(([key, item]) => (
                <linearGradient key={key} id={`report-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(39 20% 86%)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatCompactDate}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: '1px solid hsl(39 20% 86%)',
                background: 'hsl(43 36% 98%)',
                fontSize: 12,
              }}
              labelFormatter={(label) => day(label)}
            />
            {Object.entries(config).map(([key, item]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={item.color}
                fill={`url(#report-${key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

function ReportTable({
  table,
  rows,
  onExport,
  exporting,
}: {
  table: TableKey;
  rows: any[];
  onExport: () => void;
  exporting: boolean;
}) {
  const heads =
    table === 'bookings'
      ? ['Reference', 'Stay', 'Total', 'Status', 'Created']
      : table === 'payments'
        ? ['Payment', 'Booking', 'Provider', 'Amount', 'Status', 'Created']
        : table === 'properties'
          ? ['Property', 'Type', 'Asking price', 'Status', 'Created']
          : table === 'enquiries'
            ? ['Property', 'Status', 'Created']
            : ['Vendor', 'Country / city', 'Email', 'Status', 'Created'];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card panel-shadow">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Loaded records</p>
          <h2 className="mt-1 text-base font-semibold">{TABLE_LABELS[table]}</h2>
        </div>
        <Button testId={`button-export-${table}`} variant="quiet" onClick={onExport} disabled={exporting}>
          <Download size={14} />
          {exporting ? 'Streaming CSV…' : 'Export CSV'}
        </Button>
      </div>
      {!rows.length ? (
        <div className="flex min-h-44 items-center justify-center px-5 text-sm text-muted-foreground">
          No {TABLE_LABELS[table].toLowerCase()} returned for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table heads={heads}>
            {rows.map((item) => {
              const id = item.id ?? item.reference;
              return (
                <Row id={`report-${table}-${id}`} key={id}>
                  {table === 'bookings' && (
                    <>
                      <Cell><span data-testid={`text-report-booking-${id}`} className="mono text-xs font-bold text-primary">{item.reference}</span></Cell>
                      <Cell className="text-xs">{day(item.startsOn)} — {day(item.endsOn)}</Cell>
                      <Cell className="mono">{item.currency} {item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Cell>
                      <Cell><Badge value={item.status} /></Cell>
                      <Cell className="text-muted-foreground">{day(item.createdAt)}</Cell>
                    </>
                  )}
                  {table === 'payments' && (
                    <>
                      <Cell><span className="mono text-xs">{item.id}</span></Cell>
                      <Cell className="mono text-xs">{val(item.bookingReference)}</Cell>
                      <Cell>{item.provider}</Cell>
                      <Cell className="mono">{item.currency} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Cell>
                      <Cell><Badge value={item.status} /></Cell>
                      <Cell className="text-muted-foreground">{day(item.createdAt)}</Cell>
                    </>
                  )}
                  {table === 'properties' && (
                    <>
                      <Cell><p className="font-medium">{item.title}</p><p className="mono text-[10px] text-muted-foreground">{item.id}</p></Cell>
                      <Cell>{item.propertyType}</Cell>
                      <Cell className="mono">{item.askingPrice === null ? 'Unavailable' : `${item.currency} ${item.askingPrice.toLocaleString()}`}</Cell>
                      <Cell><Badge value={item.status} /></Cell>
                      <Cell className="text-muted-foreground">{day(item.createdAt)}</Cell>
                    </>
                  )}
                  {table === 'enquiries' && (
                    <>
                      <Cell><p className="font-medium">{item.propertyTitle}</p><p className="mono text-[10px] text-muted-foreground">{item.id}</p></Cell>
                      <Cell><Badge value={item.status} /></Cell>
                      <Cell className="text-muted-foreground">{day(item.createdAt)}</Cell>
                    </>
                  )}
                  {table === 'vendors' && (
                    <>
                      <Cell><p className="font-medium">{item.businessName}</p><p className="mono text-[10px] text-muted-foreground">{item.id}</p></Cell>
                      <Cell>{item.country} · {item.city}</Cell>
                      <Cell className="text-xs">{item.email}</Cell>
                      <Cell><Badge value={item.status} /></Cell>
                      <Cell className="text-muted-foreground">{day(item.createdAt)}</Cell>
                    </>
                  )}
                </Row>
              );
            })}
          </Table>
        </div>
      )}
    </div>
  );
}

export function ReportsPage() {
  const today = new Date();
  const initialFrom = new Date(today);
  initialFrom.setDate(today.getDate() - 29);
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [from, setFrom] = useState(formatInputDate(initialFrom));
  const [to, setTo] = useState(formatInputDate(today));
  const [draftFrom, setDraftFrom] = useState(formatInputDate(initialFrom));
  const [draftTo, setDraftTo] = useState(formatInputDate(today));
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [table, setTable] = useState<TableKey>('bookings');
  const [dateError, setDateError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const params = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      country: country || undefined,
      status: status || undefined,
      page,
      limit: 10,
    }),
    [country, from, page, status, to],
  );
  const q = useGetAdminReports(params);
  const report = q.data;
  const rows = report?.tables?.[table] ?? [];
  const tableMeta = report?.meta?.[table];
  const availableTables = (Object.keys(TABLE_LABELS) as TableKey[]).filter(
    (key) => key !== 'vendors' || report?.tables?.vendors,
  );
  const kpis = report?.kpis ? Object.entries(report.kpis) : [];

  const selectPreset = (nextPreset: DatePreset) => {
    setPreset(nextPreset);
    setDateError('');
    if (nextPreset === 'custom') return;
    const end = new Date();
    const start = new Date(end);
    const days = nextPreset === '7d' ? 6 : nextPreset === '30d' ? 29 : 89;
    start.setDate(end.getDate() - days);
    const nextFrom = formatInputDate(start);
    const nextTo = formatInputDate(end);
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  };

  const applyCustomRange = () => {
    if (!draftFrom || !draftTo) {
      setDateError('Choose both a start and end date.');
      return;
    }
    if (draftFrom > draftTo) {
      setDateError('Start date must be before end date.');
      return;
    }
    setDateError('');
    setPreset('custom');
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  };

  const exportCsv = async () => {
    setExportStatus('');
    setIsExporting(true);
    const fileName = exportFileName(table, from, to);
    const url = exportUrl({ table, from, to, country, status });
    try {
      setExportStatus(`Preparing ${TABLE_LABELS[table].toLowerCase()} export on the server…`);
      const preflight = await fetch(url, { method: 'HEAD', credentials: 'include' });
      if (!preflight.ok) throw new Error(await responseErrorMessage(preflight));
      const rowCount = Number(preflight.headers.get('x-report-row-count') ?? 0);
      const tableName = TABLE_LABELS[table].toLowerCase();
      setExportStatus(
        rowCount
          ? `Server prepared ${rowCount.toLocaleString()} ${tableName}. Starting streamed download…`
          : `No ${tableName} match the selected filters. Starting a header-only CSV download…`,
      );

      if (await streamExportToFile(url, fileName, setExportStatus)) {
        setExportStatus(
          rowCount
            ? `Downloaded ${rowCount.toLocaleString()} ${tableName} from the server stream.`
            : `Downloaded an empty ${tableName} CSV with headers.`,
        );
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setExportStatus(
          rowCount
            ? `Download started: the server is streaming ${rowCount.toLocaleString()} ${tableName} without loading all rows in the browser.`
            : `Download started: an empty ${tableName} CSV with headers.`,
        );
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setExportStatus('Export cancelled before the file was saved.');
      } else if (cause instanceof TypeError) {
        setExportStatus('The report service could not be reached. Try again.');
      } else {
        setExportStatus(cause instanceof Error ? cause.message : 'The CSV could not be prepared. Try again.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rise-in pb-10">
      <Title
        eyebrow="Operations / reporting"
        title="Reports"
        description="A database-backed view of marketplace activity. Read the range, provenance, and limits before making a decision."
        action={
          <Button testId="button-refresh-reports" variant="quiet" onClick={() => q.refetch()}>
            <RefreshCw size={14} className={q.isFetching ? 'animate-spin' : ''} />
            Refresh data
          </Button>
        }
      />

      <section className="mb-5 rounded-xl border border-primary/20 bg-primary/[.045] p-4 panel-shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold">Operational record, not an estimate</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Totals stay separated by currency. Metrics the service cannot support are shown as unavailable.
              </p>
            </div>
          </div>
          {report && (
            <div data-testid="text-report-provenance" className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-[hsl(151_30%_43%)]" />
              {report.provenance === 'demo' ? 'Demo dataset · clearly labeled' : 'Live database'}
              <span className="font-normal text-muted-foreground">· {report.source} · {report.timezone}</span>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-card p-4 panel-shadow">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Report scope</h2>
          {q.isFetching && !q.isLoading && <span className="text-[11px] text-muted-foreground">Updating…</span>}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', 'quarter', 'custom'] as DatePreset[]).map((value) => (
              <button
                key={value}
                type="button"
                data-testid={`button-report-preset-${value}`}
                onClick={() => selectPreset(value)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                  preset === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'
                }`}
              >
                {value === '7d' ? 'Last 7 days' : value === '30d' ? 'Last 30 days' : value === 'quarter' ? 'Last 90 days' : 'Custom range'}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
            <label className="text-xs font-semibold">
              <span className="mb-1.5 block text-muted-foreground">From</span>
              <span className="relative block">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input data-testid="input-report-from" type="date" value={draftFrom} onChange={(event) => { setDraftFrom(event.target.value); setPreset('custom'); }} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </span>
            </label>
            <label className="text-xs font-semibold">
              <span className="mb-1.5 block text-muted-foreground">To</span>
              <span className="relative block">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input data-testid="input-report-to" type="date" value={draftTo} onChange={(event) => { setDraftTo(event.target.value); setPreset('custom'); }} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </span>
            </label>
            <label className="text-xs font-semibold">
              <span className="mb-1.5 block text-muted-foreground">Country</span>
              <select data-testid="select-report-country" value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                <option value="">All countries</option>
                {(report?.supportedFilters?.countries ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">
              <span className="mb-1.5 block text-muted-foreground">Status</span>
              <select data-testid="select-report-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                <option value="">All statuses</option>
                {(report?.supportedFilters?.statuses ?? []).map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <Button testId="button-apply-report-range" onClick={applyCustomRange} disabled={preset !== 'custom'}>
              <Filter size={14} />
              Apply
            </Button>
          </div>
          {dateError && <p data-testid="text-report-date-error" className="text-xs font-medium text-destructive">{dateError}</p>}
          {report?.range && (
            <p data-testid="text-report-range" className="mono text-[11px] text-muted-foreground">
              Server range: {day(report.range.from)} — {day(report.range.to)}
            </p>
          )}
        </div>
      </section>

      <QueryState query={q}>
        {report && (
          <>
            {report.unavailable?.length > 0 && (
              <section className="mb-5 rounded-xl border border-accent/50 bg-accent/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-accent-foreground" />
                  <div>
                    <p className="text-sm font-semibold">Unavailable in this report</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {report.unavailable.map((item) => (
                        <div key={item.key} data-testid={`unavailable-metric-${item.key}`} className="rounded-lg border border-accent/30 bg-card/55 p-3">
                          <p className="text-xs font-semibold">{item.label}</p>
                          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {kpis.length > 0 ? (
              <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map(([key, value], index) => (
                  <MetricCard
                    key={key}
                    label={key}
                    value={value}
                    detail={`Recorded for ${formatCompactDate(report.range.from)} — ${formatCompactDate(report.range.to)}`}
                    tone={(['primary', 'gold', 'green', 'ink'] as const)[index % 4]}
                    icon={[BarChart3, TrendingUp, UsersRound, Table2][index % 4]}
                  />
                ))}
              </section>
            ) : (
              <div className="mb-5 rounded-xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                No KPI values were returned for this range.
              </div>
            )}

            <div className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
              <TrendChart trends={report.trends ?? []} />
              <div className="rounded-xl border border-border bg-card p-5 panel-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow">Record mix</p>
                    <h2 className="mt-1 text-base font-semibold">Ratings</h2>
                  </div>
                  <BarChart3 size={18} className="text-muted-foreground" />
                </div>
                <div className="mt-5 space-y-3">
                  {(report.breakdowns?.reviewRatings ?? []).map((item) => (
                    <div key={item.rating} data-testid={`rating-breakdown-${item.rating}`} className="flex items-center gap-3 text-xs">
                      <span className="mono w-9 text-muted-foreground">{item.rating}/5</span>
                      <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, item.count * 10)}%` }} /></div>
                      <span className="mono w-8 text-right font-semibold">{item.count}</span>
                    </div>
                  ))}
                  {!report.breakdowns?.reviewRatings?.length && <p className="text-sm text-muted-foreground">No ratings returned.</p>}
                </div>
              </div>
            </div>

            <div className="mb-5 grid gap-5 lg:grid-cols-2">
              <CurrencyPanel title="Bookings" items={report.currencies?.bookings ?? []} />
              <CurrencyPanel title="Payments" items={report.currencies?.payments ?? []} />
            </div>

            <section className="mb-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <BreakdownList title="Booking status" items={report.breakdowns?.bookings ?? []} />
              <BreakdownList title="Payment status" items={report.breakdowns?.payments ?? []} />
              <BreakdownList title="Enquiry status" items={report.breakdowns?.enquiries ?? []} />
              {report.breakdowns?.hotelsByCountry ? <BreakdownList title="Hotels by country" items={report.breakdowns.hotelsByCountry} /> : <BreakdownList title="Roles" items={report.breakdowns?.roles ?? []} />}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold">Source tables</h2>
                </div>
                <span className="text-[11px] text-muted-foreground">Export reflects the selected server response</span>
              </div>
              <div className="mb-3 flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/45 p-1">
                {availableTables.map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`button-report-table-${key}`}
                    onClick={() => { setTable(key); setPage(1); }}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${
                      table === key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                    }`}
                  >
                    {TABLE_LABELS[key]}
                    <span className="mono ml-1.5 text-[10px] opacity-60">{report.tables?.[key]?.length ?? 0}</span>
                  </button>
                ))}
              </div>
              <ReportTable table={table} rows={rows} onExport={() => void exportCsv()} exporting={isExporting} />
              {exportStatus && (
                <p data-testid="text-report-export-status" className="mt-2 text-xs text-muted-foreground">
                  {exportStatus}
                </p>
              )}
              {tableMeta && (tableMeta.page > 1 || tableMeta.hasMore) && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p data-testid="text-report-pagination" className="text-xs text-muted-foreground">
                    Page {tableMeta.page} · Showing {rows.length} of {tableMeta.total.toLocaleString()} records
                  </p>
                  <div className="flex gap-2">
                    <button type="button" data-testid="button-report-previous" disabled={page <= 1 || q.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40">
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <button type="button" data-testid="button-report-next" disabled={!tableMeta.hasMore || q.isFetching} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40">
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span data-testid="text-report-generated">Generated {day(report.generatedAt)} · source: {report.source}</span>
               <span>CSV streams every matching record and keeps currencies separated by row.</span>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}