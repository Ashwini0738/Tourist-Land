// @ts-nocheck
import { useState } from 'react';
import {
  useCreateAdminDestination,
  useListAdminDestinations,
  useUpdateAdminDestination,
} from '@workspace/api-client-react';
import { Loader2, Plus, X } from 'lucide-react';
import {
  Badge,
  Button,
  Cell,
  QueryState,
  Row,
  SearchBar,
  Table,
  Title,
  val,
} from './page-shared';

export function DestinationsPage() {
  const q = useListAdminDestinations();
  const create = useCreateAdminDestination();
  const update = useUpdateAdminDestination();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [country, setCountry] = useState('');
  const items = (q.data?.items ?? []).filter((destination) =>
    `${destination.name} ${destination.country} ${destination.region ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate(
      { data: { name, slug, country, status: 'draft' } },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setSlug('');
          setCountry('');
          q.refetch();
        },
      },
    );
  };
  return (
    <div className="rise-in">
      <Title
        eyebrow="Discovery catalog"
        title="Destinations"
        description="Maintain the places travelers can discover. Coordinates and summaries remain server-owned."
        action={
          <Button testId="button-add-destination" onClick={() => setOpen(true)}>
            <Plus size={15} />
            Add destination
          </Button>
        }
      />
      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <QueryState query={q} empty={!items.length}>
        <Table heads={['Destination', 'Country / region', 'Coordinates', 'Status', 'Action']}>
          {items.map((destination) => (
            <Row id={destination.id} key={destination.id}>
              <Cell>
                <p className="font-semibold">{destination.name}</p>
                <p className="mono text-[11px] text-muted-foreground">{destination.slug}</p>
              </Cell>
              <Cell>
                {destination.country}{' '}
                <span className="text-muted-foreground">· {val(destination.region)}</span>
              </Cell>
              <Cell className="mono text-xs">
                {destination.latitude === null || destination.longitude === null
                  ? 'Unavailable'
                  : `${destination.latitude}, ${destination.longitude}`}
              </Cell>
              <Cell><Badge value={destination.status} /></Cell>
              <Cell>
                <button
                  data-testid={`button-publish-destination-${destination.id}`}
                  onClick={() =>
                    update.mutate({
                      id: destination.id,
                      data: {
                        status: destination.status === 'published' ? 'draft' : 'published',
                      },
                    })
                  }
                  className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted"
                >
                  {destination.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              </Cell>
            </Row>
          ))}
        </Table>
      </QueryState>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-5"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="mb-6 flex justify-between">
              <h2 className="text-lg font-semibold">Add destination</h2>
              <button
                data-testid="button-close-destination-modal"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            {[
              ['Name', name, setName],
              ['Slug', slug, setSlug],
              ['Country', country, setCountry],
            ].map(([label, value, setter]) => (
              <label className="mb-4 block" key={String(label)}>
                <span className="mb-1.5 block text-xs font-semibold">{label}</span>
                <input
                  data-testid={`input-destination-${String(label).toLowerCase()}`}
                  required
                  value={String(value)}
                  onChange={(event) =>
                    (setter as (value: string) => void)(event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
            ))}
            <div className="flex justify-end gap-2">
              <Button testId="button-cancel-destination" variant="quiet" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                testId="button-submit-destination"
                type="submit"
                disabled={create.isPending}
              >
                {create.isPending && <Loader2 size={14} />}
                Create destination
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}