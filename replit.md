# Travel & Land

A cross-platform travel discovery, booking, and verified land-sourcing application.

## Run & Operate

- Replit manages the app through the artifact workflows `artifacts/travel-land-app: expo`, `artifacts/travel-land-admin: web`, `artifacts/api-server: API Server`, and `artifacts/mockup-sandbox: Component Preview Server`.
- `pnpm --filter @workspace/api-server run dev` — run the API server outside its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run validate:workflows` — lint all GitHub Actions workflow YAML and expressions
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Development authentication requires `TRAVEL_LAND_AUTH_TARGET=external-development`, `TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY`, `TRAVEL_LAND_DEV_CLERK_SECRET_KEY`, and `TRAVEL_LAND_DEV_ADMIN_CLERK_USER_IDS`.
- The API also requires the Replit Stripe integration because payment synchronization and managed webhook registration run during startup.
- `DATABASE_URL` and the PostgreSQL connection variables are supplied by Replit's built-in database.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Mobile app: `artifacts/travel-land-app`
- API server: `artifacts/api-server`
- API source of truth: `lib/api-spec/openapi.yaml`
- Database schema: `lib/db/src/schema/platform.ts`
- Mobile theme: `artifacts/travel-land-app/constants/colors.ts`

## Architecture decisions

- The mobile app keeps development favorites in AsyncStorage while server-backed account persistence is not yet configured.
- External payment, maps, notification, and identity providers stay behind explicit service boundaries; no fake production integration is presented as live.
- OpenAPI remains the source of truth for every REST endpoint before client/server implementation.

## Product

- Discover destinations and stays
- Search and save places locally
- Browse verified land opportunities
- Enter booking and property-enquiry flows

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
