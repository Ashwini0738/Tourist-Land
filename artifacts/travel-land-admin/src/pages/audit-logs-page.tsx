// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import {
  useGetAdminAuditLog,
  useListAdminAuditLogs,
} from '@workspace/api-client-react';
import { CircleAlert, FileClock, X } from 'lucide-react';
import {
  Button,
  Cell,
  day,
  dialogFocusableSelector,
  QueryState,
  Row,
  SearchBar,
  Table,
  Title,
  val,
} from './page-shared';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const auditDetailDialogRef = useRef<HTMLElement | null>(null);
  const auditDetailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const q = useListAdminAuditLogs({
    entityType: 'destination',
    q: search || undefined,
    page,
    limit: 20,
  });
  const detail = useGetAdminAuditLog(selectedAuditId ?? '', {
    query: { enabled: Boolean(selectedAuditId) },
  });
  const currentDetail =
    !detail.isError && detail.data?.id === selectedAuditId ? detail.data : undefined;

  useEffect(() => {
    if (selectedAuditId) {
      auditDetailDialogRef.current?.focus();
    } else {
      auditDetailTriggerRef.current?.focus();
    }
  }, [selectedAuditId]);

  const keepFocusInAuditDialog = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(dialogFocusableSelector),
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;
    const activeIndex = focusable.indexOf(activeElement as HTMLElement);
    event.preventDefault();
    if (event.shiftKey) {
      focusable[activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1].focus();
    } else {
      focusable[activeIndex === -1 || activeIndex === focusable.length - 1 ? 0 : activeIndex + 1].focus();
    }
  };

  const items = q.data?.items ?? [];
  const meta = q.data?.meta;
  const hasSearch = Boolean(search.trim());
  const metadata = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length) {
      return 'No additional details';
    }
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key}: ${Array.isArray(entry) ? entry.join(', ') : String(entry)}`)
      .join(' · ');
  };
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="rise-in">
      <Title
        eyebrow="Governance / immutable record"
        title="Audit history"
        description="Review attributable changes to destinations. Metadata is limited to the safe fields returned by the audit service."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={updateSearch}
          placeholder="Search destination, action, or record ID"
        />
        <span data-testid="text-audit-filter" className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
          Destination changes
        </span>
        <span data-testid="text-audit-count" className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          {meta?.total ?? 0} records
        </span>
      </div>
      <QueryState query={q}>
        {!items.length ? (
          <div data-testid="audit-empty-state" className="rounded-xl border border-dashed border-border bg-card/60 p-12 text-center">
            <FileClock className="mx-auto mb-3 text-muted-foreground/60" size={25} />
            <p className="font-semibold">{hasSearch ? 'No matching destination changes' : 'No destination changes yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasSearch
                ? 'Try a different destination name, action, or record ID.'
                : 'Destination creation and edits will appear here once recorded.'}
            </p>
            {hasSearch && (
              <button type="button" data-testid="button-clear-audit-search" onClick={() => updateSearch('')} className="mt-5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Table heads={['Timestamp', 'Actor', 'Action', 'Destination', 'Safe metadata', 'Review']}>
              {items.map((log: any) => (
                <Row id={log.id} key={log.id}>
                  <Cell className="whitespace-nowrap text-xs text-muted-foreground">
                    {day(log.createdAt)}
                    <span className="mt-1 block text-[10px]">
                      {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(String(log.createdAt)))}
                    </span>
                  </Cell>
                  <Cell>
                    <p className="font-medium">{val(log.adminName, 'Unknown administrator')}</p>
                    <p className="mono text-[10px] text-muted-foreground">{log.adminUserId}</p>
                  </Cell>
                  <Cell><span data-testid={`audit-action-${log.id}`} className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">{log.action}</span></Cell>
                  <Cell>
                    <p data-testid={`audit-destination-${log.id}`} className="font-semibold">{val(log.destinationName, 'Destination unavailable')}</p>
                    <p className="mono text-[10px] text-muted-foreground">{log.entityId}</p>
                  </Cell>
                  <Cell className="max-w-[280px] text-xs text-muted-foreground">{metadata(log.metadata)}</Cell>
                  <Cell>
                    <button
                      type="button"
                      data-testid={`button-audit-details-${log.id}`}
                      onClick={(event) => {
                        auditDetailTriggerRef.current = event.currentTarget;
                        setSelectedAuditId(log.id);
                      }}
                      className="whitespace-nowrap rounded-md border border-primary/35 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5"
                    >
                      Inspect revision
                    </button>
                  </Cell>
                </Row>
              ))}
            </Table>
            {meta && (meta.page > 1 || meta.hasMore) && (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <p data-testid="text-audit-pagination" className="text-xs text-muted-foreground">
                  Page {meta.page} · Showing {items.length} of {meta.total} records
                </p>
                <div className="flex gap-2">
                  <button type="button" data-testid="button-audit-previous" disabled={page <= 1 || q.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40">Previous</button>
                  <button type="button" data-testid="button-audit-next" disabled={!meta.hasMore || q.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </QueryState>
      {selectedAuditId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-5" onClick={() => setSelectedAuditId(null)}>
          <section
            ref={auditDetailDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setSelectedAuditId(null);
                return;
              }
              keepFocusInAuditDialog(event);
            }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Immutable revision context</p>
                <h2 id="audit-detail-title" className="mt-1 text-xl font-semibold">Destination change details</h2>
                <p className="mt-1 text-sm text-muted-foreground">Only values recorded by the audit service are shown.</p>
              </div>
              <button type="button" aria-label="Close revision details" data-testid="button-close-audit-details" onClick={() => setSelectedAuditId(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X size={17} /></button>
            </div>
            {!currentDetail && !detail.isError ? (
              <div data-testid="audit-detail-loading" className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">Loading revision details…</div>
            ) : detail.isError ? (
              <div data-testid="audit-detail-unavailable" className="rounded-lg border border-destructive/25 bg-destructive/5 p-8 text-center">
                <CircleAlert className="mx-auto mb-3 text-destructive" size={22} />
                <p className="font-semibold">Revision details unavailable</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">The audit record could not be loaded.</p>
                <Button testId="button-retry-audit-detail" variant="quiet" onClick={() => detail.refetch()}>Try again</Button>
              </div>
            ) : currentDetail ? (
              <div className="space-y-5">
                <div className="grid gap-4 rounded-lg border border-border bg-muted/25 p-4 sm:grid-cols-2">
                  <div>
                    <p className="eyebrow">Destination</p>
                    <p data-testid="text-audit-detail-destination" className="mt-1 font-semibold">{val(currentDetail.destinationName, 'Destination unavailable')}</p>
                    <p className="mono mt-1 text-[10px] text-muted-foreground">{currentDetail.entityId}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Recorded change</p>
                    <p className="mt-1 font-semibold">{val(currentDetail.action)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{day(currentDetail.createdAt)} · {val(currentDetail.adminName, 'Unknown administrator')}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div><p className="eyebrow">Field values</p><h3 className="mt-1 font-semibold">Before and after</h3></div>
                    <span data-testid="text-audit-detail-field-count" className="text-xs text-muted-foreground">{currentDetail.revision?.fields?.length ?? 0} fields recorded</span>
                  </div>
                  {!(currentDetail.revision?.fields?.length) ? (
                    <div data-testid="audit-detail-unavailable" className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Unavailable — no field-level historical detail was recorded for this entry.</div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/45"><tr className="border-b border-border"><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Field</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Before</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">After</th></tr></thead>
                        <tbody>
                          {currentDetail.revision.fields.map((field: string) => {
                            const before = currentDetail.revision.before;
                            const after = currentDetail.revision.after;
                            const format = (values: Record<string, unknown> | null | undefined) =>
                              values && Object.prototype.hasOwnProperty.call(values, field)
                                ? values[field] === null ? 'null' : String(values[field])
                                : 'Unavailable';
                            return (
                              <tr key={field} className="border-b border-border last:border-0">
                                <td className="mono px-4 py-3 text-xs font-semibold">{field}</td>
                                <td data-testid={`audit-before-${field}`} className="max-w-[220px] break-words px-4 py-3 text-xs text-muted-foreground">{format(before)}</td>
                                <td data-testid={`audit-after-${field}`} className="max-w-[220px] break-words px-4 py-3 text-xs">{format(after)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}