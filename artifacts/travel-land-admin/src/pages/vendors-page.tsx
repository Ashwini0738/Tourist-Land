// @ts-nocheck
import { useState } from 'react';
import {
  useListAdminVendors,
  useUpdateAdminVendorStatus,
} from '@workspace/api-client-react';
import { Badge, Cell, Row, ShellList, Table, val } from './page-shared';

export function VendorsPage() {
  const q = useListAdminVendors();
  const mutation = useUpdateAdminVendorStatus();
  const [search, setSearch] = useState('');
  const items = (q.data?.items ?? []).filter((vendor) =>
    `${vendor.profile?.businessName ?? ''} ${vendor.user?.email ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <ShellList
      title="Vendors"
      eyebrow="Supply & ownership"
      description="Review vendor access and ownership visibility without crossing account boundaries."
      query={q}
      items={items}
      search={search}
      setSearch={setSearch}
      count={q.data?.meta.total}
    >
      <Table heads={['Business / owner', 'Hotels', 'Contact', 'Access', 'Action']}>
        {items.map((vendor) => (
          <Row id={vendor.userId} key={vendor.userId}>
            <Cell>
              <p className="font-semibold">{val(vendor.profile?.businessName, 'Unnamed business')}</p>
              <p className="text-xs text-muted-foreground">{val(vendor.user?.displayName, 'Unnamed owner')}</p>
            </Cell>
            <Cell className="mono">{vendor.hotelCount}</Cell>
            <Cell className="text-xs text-muted-foreground">{val(vendor.user?.email)}</Cell>
            <Cell><Badge value={vendor.profile?.status} /></Cell>
            <Cell>
              <button
                data-testid={`button-toggle-vendor-${vendor.userId}`}
                onClick={() =>
                  mutation.mutate({
                    userId: vendor.userId,
                    data: {
                      status: vendor.profile?.status === 'approved' ? 'suspended' : 'approved',
                      reason: null,
                    },
                  })
                }
                className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted"
              >
                {vendor.profile?.status === 'approved' ? 'Suspend' : 'Approve'}
              </button>
            </Cell>
          </Row>
        ))}
      </Table>
    </ShellList>
  );
}