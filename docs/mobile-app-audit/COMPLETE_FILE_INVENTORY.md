# Complete File Inventory

This inventory groups the repository by responsibility rather than listing generated/vendor files.

## Workspace and operations

- `package.json`
- `pnpm-workspace.yaml`
- `replit.md`
- `.replit`
- `workflows/`
- `.github/workflows/`
- `.env.example`

## Mobile artifact

- `artifacts/travel-land-app/app/` — Expo Router screens/layouts.
- `artifacts/travel-land-app/components/` — shared native UI.
- `artifacts/travel-land-app/context/` — auth, security, role, app state.
- `artifacts/travel-land-app/features/` — home, maps, explore, role, shared domain UI.
- `artifacts/travel-land-app/hooks/`
- `artifacts/travel-land-app/lib/`
- `artifacts/travel-land-app/tests/`
- `artifacts/travel-land-app/app.json`
- `artifacts/travel-land-app/eas.json`
- `artifacts/travel-land-app/package.json`
- `artifacts/travel-land-app/scripts/`

## API artifact

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/routes/`
- `artifacts/api-server/src/lib/`
- `artifacts/api-server/src/middlewares/`
- `artifacts/api-server/src/*.test.ts`
- `artifacts/api-server/package.json`

## Shared libraries

- `lib/db/` — Drizzle schema/config/database access.
- `lib/api-spec/` — OpenAPI contract/checking.
- `lib/api-client-react/` — generated React Query client.
- `lib/api-zod/` — generated Zod models.
- `lib/integrations/` — connector/integration support.

## Admin artifact

- `artifacts/travel-land-admin/src/App.tsx`
- `artifacts/travel-land-admin/src/components/`
- `artifacts/travel-land-admin/src/pages/`
- `artifacts/travel-land-admin/src/lib/`
- `artifacts/travel-land-admin/package.json`

## Other artifacts

- `artifacts/mockup-sandbox/` — component preview/design server.
- `docs/qa/` — existing QA reports.
- `docs/role-based-access.md` — role assumptions/documentation.
- `attached_assets/` — user-provided assets; not application runtime code.

## Generated/build output

Generated clients, static builds, node_modules, and downloaded APKs should not be treated as primary source evidence. Prefer source, package manifests, OpenAPI, schema, and tests.
