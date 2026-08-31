// @ts-nocheck
import { useListAdminBookings } from '@workspace/api-client-react';
import { CatalogPage } from './catalog-page';
import { Badge, Cell, day, val, amount } from './page-shared';

export function BookingsPage() {
  return (
    <CatalogPage
      title="Bookings"
      description="Follow booking lifecycle and payment status as recorded by the platform."
      query={useListAdminBookings()}
      heads={['Reference', 'Guest', 'Stay', 'Hotel / vendor', 'Amount', 'Status']}
      render={(booking: any) => (
        <>
          <Cell>
            <span data-testid={`text-booking-reference-${booking.id}`} className="mono font-bold text-primary">
              {booking.reference}
            </span>
          </Cell>
          <Cell>
            <p className="font-medium">{booking.guestName}</p>
            <p className="text-xs text-muted-foreground">{booking.guestEmail}</p>
          </Cell>
          <Cell className="text-xs">{day(booking.startsOn)} — {day(booking.endsOn)}</Cell>
          <Cell>
            <p className="text-xs">{val(booking.hotelName)}</p>
            <p className="text-xs text-muted-foreground">{val(booking.vendorName)}</p>
          </Cell>
          <Cell className="mono">{amount(booking.totalAmount, booking.currency)}</Cell>
          <Cell>
            <div className="flex flex-col items-start gap-1">
              <Badge value={booking.status} />
              <span className="text-[10px] text-muted-foreground">
                payment: {val(booking.paymentStatus)}
              </span>
            </div>
          </Cell>
        </>
      )}
    />
  );
}