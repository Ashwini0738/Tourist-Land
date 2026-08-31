// @ts-nocheck
import { useState } from 'react';
import {
  useListAdminAvailability,
  useListAdminRooms,
} from '@workspace/api-client-react';
import { Badge, Cell, day, Row, ShellList, Table, val, amount } from './page-shared';

export function RoomsPage({ availability = false }: { availability?: boolean }) {
  const q = availability ? useListAdminAvailability() : useListAdminRooms();
  const [search, setSearch] = useState('');
  const items = (q.data?.items ?? []).filter((room: any) =>
    `${room.name ?? room.roomName ?? ''} ${room.hotelName ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <ShellList
      title={availability ? 'Availability' : 'Rooms & inventory'}
      eyebrow="Inventory oversight"
      description={
        availability
          ? 'Inspect recorded availability and blackout states. No future inventory is estimated.'
          : 'Review room capacity, rates, and recorded availability.'
      }
      query={q}
      items={items}
      search={search}
      setSearch={setSearch}
      count={q.data?.meta.total}
    >
      <Table
        heads={
          availability
            ? ['Date', 'Room', 'Hotel', 'Available', 'Reserved', 'State']
            : ['Room', 'Hotel', 'Capacity', 'Units', 'Rate', 'State']
        }
      >
        {items.map((room: any) => (
          <Row id={room.id} key={room.id}>
            <Cell><p className="font-semibold">{val(room.name ?? room.roomName)}</p></Cell>
            <Cell className="text-muted-foreground">{val(room.hotelName)}</Cell>
            {availability ? (
              <>
                <Cell>{day(room.date)}</Cell>
                <Cell className="mono">{val(room.availableUnits)}</Cell>
                <Cell className="mono">{val(room.reservedUnits)}</Cell>
              </>
            ) : (
              <>
                <Cell className="mono">{room.capacity} guests</Cell>
                <Cell className="mono">{`${val(room.availableUnits)}/${val(room.totalUnits)}`}</Cell>
                <Cell>{amount(room.nightlyRate, room.currency)}</Cell>
              </>
            )}
            <Cell><Badge value={room.status} /></Cell>
          </Row>
        ))}
      </Table>
    </ShellList>
  );
}