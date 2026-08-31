// @ts-nocheck
import {
  useCreateAdminFeaturedContent,
  useDeleteAdminFeaturedContent,
  useListAdminFeaturedContent,
  useUpdateAdminFeaturedContent,
} from '@workspace/api-client-react';
import { FilePlus2, RefreshCw } from 'lucide-react';
import { Button, QueryState, Title } from './page-shared';

export function ContentPage() {
  const q = useListAdminFeaturedContent();
  const create = useCreateAdminFeaturedContent();
  const update = useUpdateAdminFeaturedContent();
  const remove = useDeleteAdminFeaturedContent();
  const items = [...(q.data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const candidates = q.data?.candidates ?? [];
  const feature = (candidate: any) =>
    create.mutate(
      {
        data: {
          entityType: candidate.entityType,
          entityId: candidate.entityId,
          sortOrder: items.length,
        },
      },
      { onSuccess: () => q.refetch() },
    );
  const move = (item: any, direction: -1 | 1) => {
    const index = items.findIndex((entry: any) => entry.id === item.id);
    const other = items[index + direction];
    if (!other) return;
    update.mutate({ id: item.id, data: { sortOrder: other.sortOrder } });
    update.mutate(
      { id: other.id, data: { sortOrder: item.sortOrder } },
      { onSuccess: () => q.refetch() },
    );
  };
  return (
    <div className="rise-in">
      <Title
        eyebrow="Editorial controls"
        title="Featured content"
        description="Select eligible, persisted catalog records and set the order shown to travelers. Unpublished records cannot be featured."
        action={
          <Button testId="button-refresh-featured" variant="quiet" onClick={() => q.refetch()}>
            <RefreshCw size={14} /> Refresh content
          </Button>
        }
      />
      <QueryState query={q}>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-xl border border-border bg-card p-6 panel-shadow">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Published selection</p>
                <h2 className="mt-1 text-lg font-semibold">Featured order</h2>
              </div>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary">{items.length} selected</span>
            </div>
            {!items.length ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <FilePlus2 className="mx-auto mb-3 text-muted-foreground/60" size={24} />
                <p className="font-semibold">Nothing is featured</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose a published destination, hotel, event, or offer from the available catalog.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item: any, index) => (
                  <div key={item.id} data-testid={`featured-item-${item.id}`} className={`flex items-center gap-3 rounded-lg border p-3 ${item.isAvailable ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                    <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="text-[11px] uppercase tracking-[.08em] text-muted-foreground">{item.entityType}{item.isAvailable ? '' : ' · unavailable'}</p>
                    </div>
                    <button aria-label={`Move ${item.title} up`} data-testid={`button-featured-up-${item.id}`} disabled={index === 0 || update.isPending} onClick={() => move(item, -1)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40">↑</button>
                    <button aria-label={`Move ${item.title} down`} data-testid={`button-featured-down-${item.id}`} disabled={index === items.length - 1 || update.isPending} onClick={() => move(item, 1)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40">↓</button>
                    <button data-testid={`button-remove-featured-${item.id}`} disabled={remove.isPending} onClick={() => remove.mutate({ id: item.id }, { onSuccess: () => q.refetch() })} className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-6 panel-shadow">
            <div className="mb-5">
              <p className="eyebrow">Eligible catalog</p>
              <h2 className="mt-1 text-lg font-semibold">Available to feature</h2>
              <p className="mt-1 text-xs text-muted-foreground">Only records currently published by the platform appear.</p>
            </div>
            {!candidates.length ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No published catalog records are available.</div>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate: any) => (
                  <div key={`${candidate.entityType}-${candidate.entityId}`} data-testid={`candidate-featured-${candidate.entityId}`} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{candidate.title}</p>
                      <p className="text-[11px] uppercase tracking-[.08em] text-muted-foreground">{candidate.entityType} · {candidate.sourceStatus}</p>
                    </div>
                    {candidate.featuredId ? (
                      <span className="rounded-md bg-[hsl(151_30%_43%/.12)] px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[hsl(151_30%_32%)]">Selected</span>
                    ) : (
                      <button data-testid={`button-feature-${candidate.entityId}`} disabled={create.isPending} onClick={() => feature(candidate)} className="rounded-md border border-primary/35 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5">Feature</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </QueryState>
    </div>
  );
}