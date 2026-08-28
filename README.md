# Travel & Land

Travel & Land is a cross-platform Expo application for discovering destinations and stays, alongside a verified land-sourcing marketplace. The repository includes a mobile/web client, versioned Express REST API, generated API clients, and a PostgreSQL/Drizzle schema baseline.

## Workspace map

- `artifacts/travel-land-app` — Expo Router app for iOS, Android, and web
- `artifacts/api-server` — Express + TypeScript REST API mounted at `/api`
- `lib/api-spec` — OpenAPI source of truth
- `lib/api-client-react` — generated React Query client
- `lib/api-zod` — generated request/response validation schemas
- `lib/db` — PostgreSQL configuration, Drizzle schema, and seed-data fixtures

## Run

Replit manages the app processes through workflows:

- `artifacts/travel-land-app: expo`
- `artifacts/api-server: API Server`

Useful validation and generation commands:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/travel-land-app run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm run typecheck
```

Once `DATABASE_URL` is configured, apply the development schema with:

```bash
pnpm --filter @workspace/db run push
```

## MVP boundaries

The first build provides a working discovery UI, search, destination and property detail routes, notifications, profile/navigation shells, and locally persisted favorites. The API currently exposes development catalog adapters for home, destinations, properties, and property enquiries.

Payments, live room inventory, maps, notification delivery, and production authentication are intentionally represented by service boundaries rather than fake integrations. Add those providers only after their accounts and secrets are configured.

## Security and authentication

No secrets are committed. Use Replit Secrets for `SESSION_SECRET`, `DATABASE_URL`, and future provider credentials. The `authentication_sessions` table is provider-neutral so a managed identity provider can be connected without implementing password storage locally.

## Database domains

The Drizzle schema covers users and roles, provider sessions, destination content, attractions and events, hotels and room inventory, bookings and payments, wallets and transactions, property listings and enquiries, favorites, reviews, notifications, and offers. UUID primary keys and foreign keys are used throughout, with timestamps and statuses on lifecycle-managed records.