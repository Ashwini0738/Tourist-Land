# Travel & Land QA Hardening Report

Date: 2026-08-31

## Executive summary

The local application baseline is stable: mobile, admin, and API tests pass; all three artifacts typecheck; the Expo dependency set is compatible; workflow validation passes; and the admin production build completes. The audit fixed three high-risk defects:

1. simultaneous checkout requests could create competing Stripe sessions;
2. the property enquiry screen displayed success without submitting anything, while the non-demo API returned a fabricated receipt;
3. unhandled API and malformed-JSON failures could bypass the standard safe JSON error shape.

No test result below is used to claim native-device, live-provider, or production behavior.

## Validation evidence

| Check | Result | Evidence |
|---|---|---|
| Mobile Jest suite | PASS | 16 suites, 82 tests |
| Admin Vitest suite | PASS | 2 files, 15 tests |
| API Node test suite | PASS | 70 passed, 7 schema-dependent tests skipped |
| Mobile TypeScript | PASS | `@workspace/travel-land-app typecheck` |
| Admin TypeScript | PASS | covered by artifact/root checks |
| API TypeScript | PASS | `@workspace/api-server typecheck` |
| Shared library declarations | PASS | OpenAPI generation completed and `tsc --build` passed |
| Admin production-style build | PASS | Vite build completed with `BASE_PATH=/admin-portal/`; bundle-size warning remains |
| Expo dependency compatibility | PASS | `expo install --check` reports dependencies up to date |
| Workflow validation | PASS | actionlint and demo diagnostic classifier |
| API contract generation | PASS | OpenAPI clients and Zod schemas regenerated |
| Demo database journey | BLOCKED | requires disposable local `DEMO_E2E_DATABASE_URL`; seven database-backed cases skip against the current pending development schema |
| Native iOS/Android acceptance | BLOCKED | requires real development/production builds and physical/simulator environments |
| Live Stripe/Resend/supplier acceptance | BLOCKED | requires controlled provider test accounts, webhook delivery, and a managed inventory provider |
| Production database and deployment | BLOCKED | requires a published environment and production database access |

## Fixed defects

| ID | Severity | Reproduction | Expected / actual before | Resolution |
|---|---|---|---|---|
| QA-001 | P1 | Send two checkout requests before the first saves its Stripe session. | One reusable session / both requests could pass the initial unpaid read. | Payment rows now receive an atomic cross-process attempt claim; a per-process queue removes same-instance races; failed claims are released safely. |
| QA-002 | P1 | Submit the property enquiry form. | Success only after persistence / the screen set local success without an API call. | The screen now validates, disables duplicate taps, sends the generated API request with a stable idempotency key, and only confirms after success. |
| QA-003 | P1 | Submit an enquiry for a non-persisted development property. | Honest failure / API returned a generated `dev-enquiry-*` receipt. | The API now persists enquiries only for database properties and returns an explicit 503 without creating a receipt when persistence is unavailable. |
| QA-004 | P1 | Retry the same enquiry or submit it concurrently with the same key. | One record / duplicate records were possible. | Added user-scoped persistent idempotency and transactional history creation. |
| QA-005 | P1 | Throw from an async API route or send malformed JSON. | Safe JSON / default or implementation-specific output was possible. | Added global JSON error middleware plus regression tests for 400 and 500 responses. |
| QA-006 | P2 | Deep-link to an unknown property ID. | Not-found state / first property was silently substituted. | Unknown IDs now show a not-found screen with a deterministic Land fallback. |
| QA-007 | P2 | Open a property detail from a cold deep link and press Back. | Reach a valid screen / bare history back could leave the flow. | Back now falls back to Land when no history exists. |
| QA-008 | P2 | Read property-detail claims. | Only supported claims / UI asserted “Clear” title and “Road” access without a backing contract. | Unsupported claims were removed; verification language now reflects the available record only. |

## Open items

| ID | Severity | Status | Limitation / next prerequisite |
|---|---|---|---|
| QA-009 | P2 | OPEN | The mobile vendor Enquiries module is still an explicit placeholder because vendor-owned enquiry list/status APIs are not part of the current OpenAPI contract. This is recorded as incomplete product scope, not a passing flow. |
| QA-010 | P2 | OPEN | Mobile admin content/settings modules remain informational placeholders; the full operational admin portal is the web artifact. |
| QA-011 | P3 | OPEN | The admin bundle is about 509 kB minified. Route-level code splitting can reduce initial transfer before broad production rollout. |
| QA-012 | P3 | BLOCKED | Locale, currency, distance, and timezone acceptance across India, UAE, Singapore, UK, and US requires provider data and device/region settings. No FX conversion is currently claimed. |

## Security and data-integrity observations

- Clerk remains the session authority; database IDs are derived from the authenticated local user.
- Booking, notification, vendor, and admin routes retain server-side authorization.
- Checkout claims are scoped to the owned payment row.
- Enquiry idempotency is scoped to the authenticated user; client-supplied owner IDs are not accepted.
- API errors do not expose SQL, stack traces, provider secrets, tokens, or internal exception messages.
- No live availability, supplier confirmation, ownership verification, price conversion, or payment result was inferred from mocks.

## Performance and accessibility

- Mobile tab/layout regression suites cover representative web widths and larger text.
- Admin keyboard focus, focus-visible states, reduced motion, table overflow, and responsive layouts are covered by existing tests and CSS.
- New property controls use explicit button/radio roles, selected state, alert semantics, bounded input, and disabled pending state.
- API calls use bounded retries where already configured; the enquiry submit uses one request and one stable retry key.
- Bundle analysis found an admin chunk-size warning only; no runtime or build failure resulted.

## Blocked acceptance prerequisites

1. Apply the additive development schema through the established post-merge flow, including the enquiry idempotency column/index.
2. Provide a disposable local demo/test PostgreSQL URL to run the complete demo E2E journey.
3. Install an Expo development build on representative iOS and Android devices for biometric, GPS, push, map-app, keyboard, safe-area, and deep-link checks.
4. Connect controlled Stripe, Resend, and managed inventory test providers for webhook, delivery, supplier-outage, and payment recovery acceptance.
5. Publish a staging/production build before production database, region, CDN, and real-network profiling.