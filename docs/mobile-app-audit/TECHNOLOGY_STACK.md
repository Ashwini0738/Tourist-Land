# Technology Stack

| Layer | Technology | Version/evidence | Purpose |
|---|---|---|---|
| Workspace | pnpm workspaces | `pnpm-workspace.yaml:37-40` | Monorepo packages/artifacts |
| Runtime | Node.js | Node 24 documented in `replit.md:21-27` | API/build tooling |
| Mobile | Expo | `~57.0.23` | Native app/runtime |
| Mobile UI | React Native | `0.86.3` | Cross-platform UI |
| Navigation | Expo Router | `~57.0.21` | File-based routes |
| Language | TypeScript | mobile `~6.0.3`; root `~5.9.3` | Static typing |
| Auth mobile | `@clerk/expo` | `^4.6.0` | Clerk sessions/email code |
| Auth server | `@clerk/express` | package source | Token verification/identity |
| API | Express | Express 5 | HTTP routes/middleware |
| Data access | Drizzle ORM | workspace catalog | PostgreSQL schema/queries |
| Database | PostgreSQL | `DATABASE_URL` and `@workspace/db` | Persistent application data |
| API contract | OpenAPI + generated clients/Zod | `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` | Shared request/response types |
| Data fetching | TanStack React Query | mobile package | Cache/loading/refetch |
| Validation | Zod plus route-level checks | shared generated models and route code | Input validation |
| Admin web | Vite + React | `artifacts/travel-land-admin/package.json` | Admin SPA |
| Admin tests | Vitest/Playwright | admin scripts | Unit/browser validation |
| Mobile tests | Jest + React Native Testing Library | mobile scripts | Component/flow tests |
| API tests | Node test/tsx | API scripts | Route/lib/integration tests |
| Payments | Stripe + `stripe-replit-sync` | API startup/client/webhook code | Checkout and payment events |
| Email | Resend through Replit connector | `src/lib/email.ts` | Transactional messages |
| Push | Expo push service | `src/lib/notifications.ts` | Device notifications |
| Device auth | Expo LocalAuthentication | mobile package | Biometric/passcode gate |
| Secure storage | Expo SecureStore/native local storage | `lib/platformSecureStorage.ts` | Per-account device state |
| Maps | Custom React Native atlas + Expo Location | `features/maps` | Location context/directions |
| Build | EAS | `artifacts/travel-land-app/eas.json` | Internal preview builds |
| Hosting | Replit workflows/autoscale | `.replit`, `replit.md` | Development and API serving |

## Communication

The mobile app uses generated React Query hooks and a Clerk bearer token for the API. The admin SPA uses Clerk session/cookie behavior with the API. The API uses Drizzle/PostgreSQL and connector-backed Stripe/Resend services. OpenAPI is intended to be the contract source of truth, but identity-link declarations currently have runtime drift.

## Installed/configured but incomplete

- Production EAS release path.
- Live supplier inventory/reservation provider.
- Object storage and upload pipeline.
- Concrete hotel/event provider configuration.
- Full mobile vendor module implementation.
- TypeScript version alignment between root and mobile package.
