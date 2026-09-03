// @ts-nocheck
import { useState } from 'react';
import {
  useLinkAdminUserSupabaseIdentity,
  useListAdminUsersPage,
  useUpdateAdminUserStatus,
} from '@workspace/api-client-react';
import { Badge, Cell, day, Row, ShellList, Table, val } from './page-shared';

export function UsersPage() {
  const q = useListAdminUsersPage();
  const mutation = useUpdateAdminUserStatus();
  const linkMutation = useLinkAdminUserSupabaseIdentity();
  const [search, setSearch] = useState('');
  const [linkingUserId, setLinkingUserId] = useState(null);
  const [authUserId, setAuthUserId] = useState('');
  const [reason, setReason] = useState('');
  const [linkError, setLinkError] = useState('');
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
              <p className="mt-1 text-[11px] text-muted-foreground">
                {user.supabaseLinked ? 'Supabase identity linked' : 'Supabase identity not linked'}
              </p>
            </Cell>
            <Cell className="text-xs text-muted-foreground">{val(user.role, 'traveller')}</Cell>
            <Cell className="text-muted-foreground">{day(user.createdAt)}</Cell>
            <Cell><Badge value={user.status} /></Cell>
            <Cell>
              <div className="flex flex-wrap gap-2">
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
                {!user.supabaseLinked && (
                  <button
                    data-testid={`button-link-supabase-${user.id}`}
                    disabled={linkMutation.isPending}
                    onClick={() => {
                      setLinkingUserId(linkingUserId === user.id ? null : user.id);
                      setAuthUserId('');
                      setReason('');
                      setLinkError('');
                    }}
                    className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {linkingUserId === user.id ? 'Close link' : 'Link Supabase'}
                  </button>
                )}
              </div>
              {linkingUserId === user.id && (
                <form
                  className="mt-3 min-w-[260px] space-y-2 rounded-lg border border-border bg-muted/30 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setLinkError('');
                    linkMutation.mutate({
                      id: user.id,
                      data: { authUserId: authUserId.trim(), reason: reason.trim() },
                    }, {
                      onSuccess: () => {
                        setLinkingUserId(null);
                        setAuthUserId('');
                        setReason('');
                        void q.refetch();
                      },
                      onError: (error) => {
                        setLinkError(error?.message ?? 'The identity could not be linked.');
                      },
                    });
                  }}
                >
                  <p className="text-[11px] font-semibold">Approved identity link</p>
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Verify this UUID in Supabase Auth first. Linking is permanent and never uses email matching.
                  </p>
                  <input
                    aria-label={`Supabase auth user ID for ${user.email}`}
                    data-testid={`input-supabase-user-id-${user.id}`}
                    value={authUserId}
                    onChange={(event) => setAuthUserId(event.target.value)}
                    placeholder="Supabase auth.users.id"
                    className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                  />
                  <textarea
                    aria-label={`Reason for linking ${user.email}`}
                    data-testid={`input-supabase-link-reason-${user.id}`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Approval reason for the audit history"
                    rows={2}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-xs outline-none focus:border-primary"
                  />
                  {linkError && <p className="text-[11px] text-destructive">{linkError}</p>}
                  <button
                    type="submit"
                    data-testid={`button-submit-supabase-link-${user.id}`}
                    disabled={linkMutation.isPending || !authUserId.trim() || !reason.trim()}
                    className="w-full rounded-md bg-primary px-2.5 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {linkMutation.isPending ? 'Saving link…' : 'Save approved link'}
                  </button>
                </form>
              )}
            </Cell>
          </Row>
        ))}
      </Table>
    </ShellList>
  );
}