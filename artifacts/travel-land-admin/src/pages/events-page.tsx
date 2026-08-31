// @ts-nocheck
import { useListAdminEvents } from '@workspace/api-client-react';
import { CatalogPage } from './catalog-page';
import { Badge, Cell, day, val } from './page-shared';

export function EventsPage() {
  return (
    <CatalogPage
      title="Events"
      description="Scheduled event records and their destination association."
      query={useListAdminEvents()}
      heads={['Event', 'Destination', 'Starts', 'Ends', 'Status']}
      render={(event: any) => (
        <>
          <Cell>
            <p className="font-semibold">{event.name}</p>
            <p className="text-xs text-muted-foreground">{val(event.description, 'No description')}</p>
          </Cell>
          <Cell>{val(event.destinationName)}</Cell>
          <Cell>{day(event.startsAt)}</Cell>
          <Cell>{day(event.endsAt)}</Cell>
          <Cell><Badge value={event.status} /></Cell>
        </>
      )}
    />
  );
}