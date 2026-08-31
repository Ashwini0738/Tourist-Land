// @ts-nocheck
import { useListAdminProperties, useUpdateAdminPropertyStatus } from '@workspace/api-client-react';
import { CatalogPage } from './catalog-page';
import { Cell, val, amount } from './page-shared';

export function PropertiesPage() {
  const query = useListAdminProperties();
  const mutation = useUpdateAdminPropertyStatus();
  return (
    <CatalogPage
      title="Land & properties"
      description="Moderate property records, verification status, and owner visibility."
      query={query}
      heads={['Property', 'Owner', 'Area', 'Asking price', 'Status']}
      render={(property: any) => (
        <>
          <Cell>
            <p className="font-semibold">{property.title}</p>
            <p className="text-xs text-muted-foreground">{property.propertyType} · {property.address}</p>
          </Cell>
          <Cell>
            <p className="text-xs font-medium">{val(property.ownerName)}</p>
            <p className="text-xs text-muted-foreground">{val(property.ownerEmail)}</p>
          </Cell>
          <Cell className="mono">{property.areaValue} {property.areaUnit}</Cell>
          <Cell>{property.askingPrice === null ? 'Unavailable' : amount(property.askingPrice, property.currency)}</Cell>
          <Cell>
            <select
              data-testid={`select-property-status-${property.id}`}
              value={property.status}
              onChange={(event) =>
                mutation.mutate({ id: property.id, data: { status: event.target.value, reason: null } })
              }
              className="rounded-md border border-border bg-card px-2 py-1.5 text-xs"
            >
              <option value="pending">pending</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </Cell>
        </>
      )}
    />
  );
}