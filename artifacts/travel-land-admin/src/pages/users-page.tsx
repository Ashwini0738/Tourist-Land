// @ts-nocheck
import { useState } from 'react';
import {
  useListAdminUsersPage,
  useUpdateAdminUserStatus,
} from '@workspace/api-client-react';
import { Badge, Cell, day, Row, ShellList, Table, val } from './page-shared';

export function UsersPage() {
  const q = useListAdminUsersPage();
  const mutation = useUpdateAdminUserStatus();
  const [search, setSearch] = useState('');
  const items = (q.data?.items ?? []).filter((user) =>
    `${user.displayName ?? ''} ${user.email ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <ShellList
      title="Users"
      eyebrow="People & trust"
      description="Search identities and make deliberate, auditable status changes."
      query={q}
      items={items}
      search={search}
      setSearch={setSearch}
      count={q.data?.meta.total}
    >
      <Table heads={['User', 'Role', 'Joined', 'Status', 'Action']}>
        {items.map((user) => (
          <Row id={user.id} key={user.id}>
            <Cell>
              <p className="font-semibold">{val(user.displayName, 'Unnamed user')}</p>
              <p data-testid={`text-user-email-${user.id}`} className="text-xs text-muted-foreground">
                {val(user.email)}
              </p>
            </Cell>
            <Cell className="text-xs text-muted-foreground">{val(user.role, 'traveller')}</Cell>
            <Cell className="text-muted-foreground">{day(user.createdAt)}</Cell>
            <Cell><Badge value={user.status} /></Cell>
            <Cell>
              <button
                data-testid={`button-toggle-user-${user.id}`}
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    id: user.id,
                    data: {
                      status: user.status === 'active' ? 'suspended' : 'active',
                      reason: null,
                    },
                  })
                }
                className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted"
              >
                {user.status === 'active' ? 'Suspend' : 'Restore'}
              </button>
            </Cell>
          </Row>
        ))}
      </Table>
    </ShellList>
  );
}