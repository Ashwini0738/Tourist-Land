// @ts-nocheck
import { useListAdminPlaces } from '@workspace/api-client-react';
import { CatalogPage } from './catalog-page';
import { Badge, Cell, val } from './page-shared';

export function PlacesPage() {
  return (
    <CatalogPage
      title="Places"
      description="Attractions and food-place records from the catalog service."
      query={useListAdminPlaces()}
      heads={['Place', 'Type', 'Destination', 'Address', 'Status']}
      render={(place: any) => (
        <>
          <Cell>
            <p className="font-semibold">{place.name}</p>
            <p className="text-xs text-muted-foreground">{val(place.description, 'No description')}</p>
          </Cell>
          <Cell><Badge value={place.type} /></Cell>
          <Cell>{val(place.destinationName)}</Cell>
          <Cell className="text-xs text-muted-foreground">{val(place.address)}</Cell>
          <Cell><Badge value={place.status} /></Cell>
        </>
      )}
    />
  );
}