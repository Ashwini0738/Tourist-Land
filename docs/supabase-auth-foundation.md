# Supabase authentication foundation

This foundation is additive. Clerk remains the active authentication provider
for the mobile app, admin portal, and API.

## Identity mapping

Application ownership remains anchored to `users.id`, the local PostgreSQL
UUID referenced by bookings, favorites, reviews, wallets, roles, and other
domain records.

The nullable unique `users.auth_user_id` column is reserved for a future
Supabase `auth.users.id` value:

```text
Supabase JWT sub
  -> users.auth_user_id
  -> users.id
  -> existing roles and ownership foreign keys
```

`users.clerk_user_id` remains required and unchanged during the transition.
No identity values are backfilled in this step.

## Runtime client boundaries

The `@workspace/supabase` package exposes separate entry points:

- `@workspace/supabase/mobile` requires an injected secure storage adapter and
  disables URL session detection.
- `@workspace/supabase/browser` uses browser persistence and URL session
  detection for the future admin flow.
- `@workspace/supabase/server` is stateless and disables session persistence,
  URL detection, and automatic refresh.

No current Clerk provider imports these factories. They are foundation code for
later migration steps.

## Server verification boundary

The API now has an explicit, fail-closed provider selector:
`TRAVEL_LAND_API_AUTH_PROVIDER`. It defaults to `clerk`; `supabase` must be
selected explicitly, and no mode accepts both providers automatically.

In Supabase mode, the provider-specific beginning of `requireAuth`:

1. Read the bearer token.
2. Cryptographically verify it through the Supabase SDK.
3. Validate the configured issuer, audience, expiration, and `sub`.
4. Resolve `users.auth_user_id = sub`.
5. Populate `req.localUser` using the existing local UUID and profile.
6. Continue using the existing role and ownership middleware.

An unmapped subject is rejected. Email is never used as an identity fallback,
and Supabase mode does not provision users or claim invitations. The current
Clerk middleware, provisioning, invitation claim, configured-admin behavior,
and 401 response remain unchanged in the default Clerk mode.

## Invitation migration design

Existing invitation email, status, onboarding state, and Clerk invitation IDs
remain untouched. A later migration should add provider-neutral invitation
metadata before changing behavior, preserve historical Clerk IDs for rollback
and audit, and map Supabase invitation/user results to the same local onboarding
records.

## `authentication_sessions`

Repository search found no active reads or writes of this table. Current auth
routes explicitly delegate session lifecycle to Clerk and do not create local
sessions. The development database currently has no applied `users` or
`authentication_sessions` tables, so row counts cannot be established there.
The table is retained unchanged until production data and historical usage can
be reviewed safely.

## Future contract changes

The OpenAPI source still intentionally contains `clerkUserId`,
`sessionAuthority: clerk`, Clerk session JWT descriptions, and Clerk invitation
language. These remain unchanged until the API authentication migration step,
after which generated React Query and Zod clients must be regenerated.