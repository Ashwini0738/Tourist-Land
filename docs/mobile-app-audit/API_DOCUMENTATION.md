# API Documentation

The API is mounted below `/api`. The following inventory reflects discovered runtime routes; it is not an invented list. Exact schemas should be read from `lib/api-spec/openapi.yaml` and route implementations.

| Area | Representative methods/endpoints | Auth | Role | Status |
|---|---|---|---|---|
| Health | `GET /api/healthz` | No | None | Implemented |
| Auth | `POST /api/v1/auth/demo`, `GET /api/v1/auth/session`, `GET /api/v1/me`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` | Demo public; rest Clerk | User/admin rules | Implemented |
| Catalog | Home, destinations, properties, enquiries | Public reads; writes protected | User/vendor as applicable | Implemented |
| Explore | Search, categories, filters | Public | None | Implemented |
| Hotels | Search, detail, rooms, nearby, availability | Mostly public reads | Vendor/admin for management | Partial/local inventory |
| Bookings | List, create, get, cancel, checkout | Clerk | Owner/admin | Implemented/Stripe-dependent |
| Favorites | List/create/delete | Clerk | Owner | Implemented |
| Trips | List/items/reorder/archive | Clerk | Owner | Implemented |
| Notifications | List/read/unread/register push token | Clerk | Owner/admin broadcast | Implemented/provider-dependent |
| Reviews | Eligibility/list/create/update/delete/moderation | Clerk as required | Owner/admin | Implemented |
| Onboarding | Vendor application and status | Application public; status inputs | Admin review | Implemented |
| Vendor | Profile, hotels, rooms, availability, bookings, enquiries, reports | Clerk | Approved vendor | Backend implemented |
| Admin | Dashboard, users, vendors, catalog, hotels, rooms, bookings, payments, reviews, notifications, audit, settings | Clerk | Admin | Backend + SPA |
| Reports | Dashboard/export/role-protected reports | Clerk | Admin/vendor | Implemented with unavailable metrics |

## Request/response rules

- Mobile authenticated requests use a Clerk bearer token through the generated API client.
- API responses set private/no-store behavior for authenticated data.
- Booking checkout requires an `Idempotency-Key` (`artifacts/api-server/src/routes/bookings.ts:65-83`).
- Stripe webhook requires the raw request body and `stripe-signature`.
- Errors are centrally sanitized; details are logged server-side.

## Verified gaps

1. CORS uses `origin: true` with credentials (`src/app.ts:53-54`).
2. No visible rate limiting protects the public demo OTP or vendor application/status endpoints.
3. Several routes use direct coercion/body access instead of shared bounded schemas.
4. Booking inventory race safety needs concurrent test evidence.
5. Provider reference uniqueness is application-dependent rather than a visible database uniqueness constraint.
6. OpenAPI identity-link declarations (`lib/api-spec/openapi.yaml:952-999`) have no matching implementation found under API routes.

## Contract caution

OpenAPI and generated clients are valuable shared artifacts, but route implementation and code generation must be kept in lockstep. The contract validation workflow should fail when an operation is declared but unavailable at runtime.
