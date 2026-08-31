# Travel & Land Route and API QA Matrix

Status meanings:

- **PASS**: locally compiled and covered by a focused route/component/API test or deterministic structural check.
- **FAIL**: known incomplete or incorrect behavior remains.
- **BLOCKED**: meaningful verification requires a real device, provider, disposable database, or production environment.

## Mobile application routes

| Route | Status | Evidence / limitation |
|---|---|---|
| `/` and `/(tabs)` | PASS | role/auth redirect structure typechecked; tab regression suite passes |
| `/splash` | PASS | route compiles; auth initialization remains covered by context/routing tests |
| `/login` | PASS | Clerk route compiles; live OTP/provider delivery BLOCKED |
| `/verify` | PASS | route compiles; live OTP acceptance BLOCKED |
| `/biometric` | PASS | mocked setup tests pass; native hardware BLOCKED |
| `/biometric-login` | PASS | mocked unlock tests pass; native hardware BLOCKED |
| `/vendor-application` | PASS | route and API validation compile; live invitation email BLOCKED |
| `/(tabs)/index` | PASS | Home component tests pass |
| `/(tabs)/explore` | PASS | search/filter pure tests and visual route tests pass |
| `/(tabs)/bookings` | PASS | route compiles and uses owned booking API |
| `/(tabs)/land` | PASS | visual route test passes; persisted-provider data acceptance BLOCKED |
| `/(tabs)/saved` | PASS | route compiles; full collection completeness is tracked separately |
| `/(tabs)/profile` | PASS | route compiles and role routing tests pass |
| `/destination/[id]` | PASS | focused detail tests include missing-data behavior |
| `/place/[id]` | PASS | route compiles; catalog API contract generated |
| `/event/[id]` | PASS | route compiles; catalog API contract generated |
| `/food/[id]` | PASS | route compiles; catalog API contract generated |
| `/maps` | PASS | web/location fallback tests pass; native GPS/map-app behavior BLOCKED |
| `/hotels` | PASS | route compiles; API hotel search tests pass |
| `/hotel/[id]` | PASS | route compiles; API detail/rooms tests pass |
| `/hotel/availability` | PASS | loading/error/empty/selection states compile; API availability tests pass |
| `/booking` | PASS | duplicate taps disabled; idempotent API create; validation tests pass |
| `/booking/[reference]` | PASS | owned read/cancel/checkout flow compiles; live Stripe BLOCKED |
| `/notifications` | PASS | Expo Go-safe import path; remote push on development build BLOCKED |
| `/reviews` | PASS | route compiles; API moderation/visibility tests pass |
| `/review` | PASS | route compiles; eligibility remains server-owned |
| `/wallet` | PASS | route compiles; no unsupported settlement/payout claims |
| `/property/[id]` | PASS | unknown/deep-link fallback fixed; unsupported title/access claims removed |
| `/property-enquiry` | PASS | real API submission, validation, idempotency, pending/error states |
| `/vendor` and `/vendor/index` | PASS | protected dashboard route compiles |
| `/vendor/hotels` | PASS | route compiles; ownership API tests pass |
| `/vendor/rooms` | PASS | route compiles; ownership API tests pass |
| `/vendor/availability` | PASS | route compiles; inventory constraints tested |
| `/vendor/bookings` | PASS | route compiles; server query is owner-scoped |
| `/vendor/listings` | PASS | route compiles; role/ownership guard is server-side |
| `/vendor/profile` | PASS | route compiles |
| `/vendor/enquiries` | PASS | database-backed vendor list/detail/status flow, ownership isolation, valid/invalid transitions, duplicate status protection, and push-failure resilience |
| `/admin` and `/admin/index` | PASS | protected mobile namespace compiles |
| `/admin/users` | PASS | route tests pass |
| `/admin/vendors` | PASS | focused component tests pass |
| `/admin/listings` | PASS | route compiles |
| `/admin/profile` | PASS | route compiles |
| `/admin/content` | FAIL | informational placeholder; operational page exists in web admin |
| `/admin/settings` | FAIL | informational placeholder; operational page exists in web admin |
| `/+not-found` | PASS | route compiles |

## Web admin routes

| Route | Status | Evidence |
|---|---|---|
| `/`, `/login`, `/sign-in/*`, `/sign-up/*` | PASS | Clerk routing and access-state tests pass; live provider BLOCKED |
| `/dashboard` | PASS | tested role gate and server-backed metrics |
| `/users` | PASS | admin route authorization matrix |
| `/vendors` | PASS | admin route authorization matrix |
| `/hotels` | PASS | admin route authorization matrix |
| `/rooms` | PASS | admin route authorization matrix |
| `/availability` | PASS | admin route authorization matrix |
| `/destinations` | PASS | dialog/status behavior and admin authorization tests |
| `/places` | PASS | admin route authorization matrix |
| `/events` | PASS | admin route authorization matrix |
| `/properties` | PASS | admin route authorization matrix |
| `/bookings` | PASS | admin route authorization matrix |
| `/payments` | PASS | read-only provider-backed view |
| `/reviews` | PASS | moderation route and status validation |
| `/notifications` | PASS | server-backed announcement validation |
| `/content` | PASS | generated contract and page build |
| `/audit-logs` | PASS | read-only audit routes and tests |
| `/settings` | PASS | page build; unsupported settings are not fabricated |
| fallback 404 | PASS | NotFound component in routed error boundary |

## API routes

Every OpenAPI path was regenerated into the client and Zod packages. “Auth matrix” means unauthenticated/wrong-role rejection is tested; disposable-database mutation acceptance is covered where listed, while native/provider/production acceptance remains BLOCKED.

| Surface | Paths | Status | Evidence |
|---|---|---|---|
| Health | `GET /healthz` | PASS | startup/E2E smoke contract |
| Home | `GET /v1/home`, `/banners`, `/featured`, `/destinations`, `/nearby`, `/events`, `/hotels`, `/properties` | PASS | pure/HTTP catalog tests and generated response schemas |
| Explore | `GET /v1/explore/search`, `/categories`, `/filters` | PASS | filter, pagination, provider-isolation tests |
| Destinations | `GET /v1/destinations`, `/v1/destinations/{id}` | PASS | detail composition and 404 tests |
| Properties | `GET /v1/properties`, `/v1/properties/{id}` | PASS | generated contract; published-only enquiry eligibility and invalid/unpublished property checks run against disposable PostgreSQL |
| Enquiries | `POST /v1/properties/{id}/enquiries` | PASS | unauthenticated/invalid/unpublished rejection, persistent idempotency, transactional history, vendor ownership/status lifecycle, and traveller notification reads run against disposable PostgreSQL |
| Hotels | `GET /v1/hotels`, `/{id}`, `/{id}/rooms`, `/{id}/availability`, `/{id}/nearby` | PASS | catalog and availability tests |
| Bookings | `GET/POST /v1/bookings`, `GET /{reference}`, `POST /{reference}/checkout`, `POST /{reference}/cancel` | PASS | validation, ownership, idempotency, inventory, payment-state tests; live provider BLOCKED |
| Favorites | `GET /v1/favorites`, `PUT/DELETE /{entityType}/{entityId}` | PASS | entity resolution and no-fallback tests |
| Notifications | `GET /v1/notifications`, `/unread-count`; `POST /read-all`, `/push-token`, `/push-token/revoke`, `GET /{id}`, `POST /{id}/read` | PASS | ownership and generated contract; remote push BLOCKED |
| Reviews | `GET /v1/hotels/{id}/reviews`, `GET/POST /v1/reviews`, `GET /eligible`, `GET/PATCH/DELETE /{id}` | PASS | eligibility, ownership, moderation visibility tests |
| Auth/user | `GET /v1/auth/session`, `POST /refresh`, `POST /logout`, `GET/PATCH /v1/me` | PASS | Clerk authority and role tests; live provider BLOCKED |
| Vendor onboarding | `POST /v1/vendor/applications`, `GET /status` | PASS | validation/idempotent approval tests; email delivery BLOCKED |
| Vendor dashboard/profile | `GET /v1/vendor/dashboard`, `GET/PATCH /profile` | PASS | auth matrix |
| Vendor hotels | `GET/POST /v1/vendor/hotels`, `GET/PATCH /{id}`, `POST /{id}/submit`, `/archive` | PASS | disposable-database owner-isolation and mutation tests |
| Vendor rooms | `GET/POST /v1/vendor/rooms`, `GET /hotels/{hotelId}/rooms`, `PATCH /rooms/{id}`, `POST /activate`, `/deactivate` | PASS | disposable-database owner-isolation and validation tests |
| Vendor inventory | `GET/PATCH /v1/vendor/availability` | PASS | disposable-database reservation-floor and owner-isolation tests |
| Vendor bookings | `GET /v1/vendor/bookings` | PASS | owner-scoped query and auth matrix |
| Vendor listings | `GET/POST /v1/vendor/listings`, `GET/PATCH /{id}`, `POST /publish`, `/archive` | PASS | role guard and generated contract |
| Admin onboarding | `GET /vendor-applications`, `/vendor-approval-history`, `/vendor-listings`; approval/rejection/invitation/role/suspension mutations | PASS | all admin paths reject non-admins; transition tests |
| Admin dashboard/catalog | `GET /dashboard`, featured-content CRUD, users/vendors/hotels/rooms/availability/destinations/places/events/properties routes | PASS | auth matrix, validation, audit transaction tests; DB mutation acceptance partly BLOCKED |
| Admin operations | bookings detail/list, payments, reviews status, notifications, audit log detail/list | PASS | auth matrix and safe read/update tests |
| Unknown API route | any unmatched `/api/*` | PASS | Express 404 behavior; no protected data returned |
| Malformed/unhandled request | applicable routes | PASS | global 400/500 safe JSON regression tests |

## Explicitly blocked matrix

| Area | Why blocked |
|---|---|
| Face ID, Touch ID, Android biometrics/device passcode | browser/Jest mocks cannot validate native hardware |
| GPS prompts, revoked permission, disabled services, map-app launch | requires native OS settings and devices |
| Android Expo Go remote push | unsupported by Expo Go SDK 53+; requires a development build |
| Live payment, webhook latency, declined card recovery | requires controlled Stripe test execution |
| Email acceptance/retry | requires controlled Resend delivery and inbox access |
| Supplier reservation confirmation/outage | no managed inventory provider is connected |
| Production data/schema | no production database or published deployment was used; the disposable schema run deliberately targeted a separate local database |
| 3G/4G/offline restoration, cross-region latency | requires device/network shaping |
| Multi-country currency/locale acceptance | requires region-specific device settings and provider records; no FX is implemented |