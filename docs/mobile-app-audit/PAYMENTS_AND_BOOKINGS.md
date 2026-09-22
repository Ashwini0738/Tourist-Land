# Payments, Bookings, and External Integrations

## Booking path

1. Customer searches/selects a hotel and room.
2. Availability is calculated from local/development/vendor inventory.
3. Booking creation validates inventory, pricing, ownership context, and idempotency.
4. Checkout creates Stripe state/session.
5. Stripe webhook verifies signature and applies payment-state transitions.
6. The system confirms only what the configured inventory policy supports.

Evidence: `artifacts/api-server/src/lib/booking.ts:173-276`, `routes/bookings.ts:65-149`, `lib/booking-payments.ts:56-219`, `lib/webhookHandlers.ts:13-34`.

## What is verified

- Checkout uses idempotency keys.
- Stripe webhook raw body/signature handling exists.
- Payment state transitions are monotonic/stale-event aware.
- User/reference scoping exists for booking reads/cancellation.
- Demo payments are explicitly separate from Stripe.

## What is not verified

- A successful Stripe payment creates a supplier reservation.
- Live supplier hotel inventory is configured.
- Refund/cancellation settlement with a supplier is complete.
- Concurrent room requests cannot oversell.
- All production webhook/connector/database setup is ready.

## Integration table

| Integration | Purpose | Current status |
|---|---|---|
| Stripe/Replit Sync | Checkout, managed webhook, payment events | Substantive/provider-dependent |
| Clerk | Auth and identity | Live code path |
| Resend/Replit connector | Transactional email | Implemented/provider-dependent |
| Expo push | Push delivery | Implemented/provider-dependent |
| Hotel/event adapters | Optional live data | Adapter exists; concrete config not proven |
| Maps provider | None found | Provider-free atlas and external directions |

## Launch requirement

Market the current booking system as application/payment-preview functionality until live supplier reservation and reconciliation are demonstrated end to end.
