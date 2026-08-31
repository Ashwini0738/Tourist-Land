// @ts-nocheck
import { useState } from 'react';
import {
  useListAdminHotels,
  useUpdateAdminHotelStatus,
} from '@workspace/api-client-react';
import { Badge, Cell, Row, ShellList, Table, val } from './page-shared';
import { MapPin } from 'lucide-react';

export function HotelsPage() {
  const q = useListAdminHotels();
  const mutation = useUpdateAdminHotelStatus();
  const [search, setSearch] = useState('');
  const items = (q.data?.items ?? []).filter((hotel) =>
    `${hotel.name} ${hotel.city ?? ''} ${hotel.ownerName ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <ShellList
      title="Hotels"
      eyebrow="Lodging catalog"
      description="Moderate hotel records and keep publication status aligned with verified ownership."
      query={q}
      items={items}
      search={search}
      setSearch={setSearch}
      count={q.data?.meta.total}
    >
      <Table heads={['Hotel', 'Owner visibility', 'Rooms', 'Approval', 'Publication']}>
        {items.map((hotel) => (
          <Row id={hotel.id} key={hotel.id}>
            <Cell>
              <p className="font-semibold">{hotel.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={12} /> {val(hotel.city)}, {val(hotel.country)}
              </p>
            </Cell>
            <Cell>
              <p className="text-xs font-medium">{val(hotel.ownerName, 'Ownership unavailable')}</p>
              <p className="text-xs text-muted-foreground">{val(hotel.ownerEmail)}</p>
            </Cell>
            <Cell className="mono">{hotel.roomCount}</Cell>
            <Cell><Badge value={hotel.approvalStatus} /></Cell>
            <Cell>
              <select
                data-testid={`select-hotel-status-${hotel.id}`}
                value={hotel.status}
                onChange={(event) =>
                  mutation.mutate({
                    id: hotel.id,
                    data: { status: event.target.value, approvalStatus: null, reason: null },
                  })
                }
                className="rounded-md border border-border bg-card px-2 py-1.5 text-xs"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </Cell>
          </Row>
        ))}
      </Table>
    </ShellList>
  );
}