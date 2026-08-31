# Local demo environment

The demo dataset is deliberately opt-in. Set `DEMO_MODE=true` and point
`DATABASE_URL` at a local database whose name contains `demo` or `test`:

```sh
DEMO_MODE=true NODE_ENV=development DATABASE_URL=postgres://localhost/travel_demo \
  pnpm --filter @workspace/scripts demo:seed
```

Start the API with the same `DEMO_MODE=true` setting to expose the seeded
hotel, room, property, destination, explore, favorite, booking, and enquiry
paths. Set `EXPO_PUBLIC_DEMO_MODE=true` for the Expo client and
`VITE_DEMO_MODE=true` for the admin portal to show the non-production demo
indicator. These UI flags do not enable server data by themselves.

Run `demo:reset` with the same variables to remove only deterministic demo
records. Both commands refuse production, a disabled demo mode, malformed
URLs, remote hosts, and databases without a `demo`/`test` name. The reset
operation deletes dependent records first and is safe to repeat.

Demo users are local database records only. No Clerk accounts or passwords
are created. Their `clerkUserId` values (`demo_traveller`, `demo_vendor`, and
`demo_admin`) are stable mapping keys for local development; applications
must map a real Clerk user explicitly rather than treating these as live
identities.

The demo dataset contains no real payment, supplier, ownership, or
availability claims. Hotel room availability is vendor-managed development
inventory, and all demo prices and enquiry responses are clearly labeled.