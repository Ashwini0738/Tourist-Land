// @ts-nocheck
import { useListAdminPayments } from '@workspace/api-client-react';
import { ShieldAlert } from 'lucide-react';
import { Badge, Cell, day, QueryState, Row, Table, Title, val, amount } from './page-shared';

export function PaymentsPage() {
  const q = useListAdminPayments();
  return (
    <div className="rise-in">
      <Title
        eyebrow="Read-only oversight"
        title="Payments"
        description="Provider-backed payment records only. Unsupported totals are unavailable, never inferred."
      />
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-accent/45 bg-accent/15 p-4 text-sm">
        <ShieldAlert size={18} className="shrink-0" />
        <p>
          <strong>Financial boundary:</strong> this workspace does not calculate settlement, revenue, or payout totals.
        </p>
      </div>
      <QueryState query={q} empty={!q.data?.items?.length}>
        <Table heads={['Payment', 'Booking', 'Provider', 'Provider reference', 'Amount', 'Status', 'Created']}>
          {(q.data?.items ?? []).map((payment) => (
            <Row id={payment.id} key={payment.id}>
              <Cell><span className="mono text-xs">{payment.id}</span></Cell>
              <Cell className="mono text-xs">{val(payment.bookingReference)}</Cell>
              <Cell>{payment.provider}</Cell>
              <Cell className="mono text-xs">{val(payment.providerReference)}</Cell>
              <Cell className="mono">{amount(payment.amount, payment.currency)}</Cell>
              <Cell><Badge value={payment.status} /></Cell>
              <Cell className="text-muted-foreground">{day(payment.createdAt)}</Cell>
            </Row>
          ))}
        </Table>
      </QueryState>
    </div>
  );
}