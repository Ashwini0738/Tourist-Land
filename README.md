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

Payments, live room inventory, maps, and notification delivery are intentionally represented by service boundaries rather than fake integrations. Add those providers only after their accounts and secrets are configured.

## Security and authentication

No secrets are committed. Authentication uses Replit-managed Clerk for account verification and session lifecycle. Mobile session material is stored through Clerk's SecureStore-backed token cache; app PINs are salted and hashed server-side with scrypt, throttled after repeated failures, and never stored on-device. Fingerprint and Face ID use the operating system's biometric prompt only—no biometric information is stored by the app.

Protected mobile routes require both a valid Clerk session and successful local PIN or biometric unlock. Protected API routes validate Clerk authentication and return a clean `401` response when a session is missing or expired.

## Database domains

The Drizzle schema covers users and roles, provider sessions, destination content, attractions and events, hotels and room inventory, bookings and payments, wallets and transactions, property listings and enquiries, favorites, reviews, notifications, and offers. UUID primary keys and foreign keys are used throughout, with timestamps and statuses on lifecycle-managed records.