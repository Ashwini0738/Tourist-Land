# Security Audit

This is a source/configuration review, not a penetration test. Secret values were not read or exposed.

| ID | Severity | Finding | Evidence | Impact | Recommendation | Verification |
|---|---|---|---|---|---|---|
| SEC-01 | High | Credentialed CORS reflects arbitrary origins | `artifacts/api-server/src/app.ts:53-54` | Cross-origin credential exposure risk | Allowlist known admin/mobile web origins; test preflight and credentials | Source-verified |
| SEC-02 | High | Production release pipeline incomplete | `artifacts/travel-land-app/eas.json:1-20` | Uncontrolled store/version/rollback process | Add production profile, version policy, submit/update policy, acceptance gates | Source-verified |
| SEC-03 | Medium | Public OTP/demo endpoint lacks visible rate limiting | `routes/auth.ts:22-59` | Brute-force/abuse risk | Add IP/device/account throttling, monitoring, generic failure responses | Source-verified; no abuse test found |
| SEC-04 | Medium | Vendor application/status endpoints may enable enumeration | `routes/onboarding.ts:18-88` | Workflow status disclosure/abuse | Use high-entropy status token and throttling; avoid exact existence disclosure | Source-verified |
| SEC-05 | Medium | Booking inventory race protection is not evident | `lib/booking.ts:198-276` | Overselling under concurrency | Add lock/atomic inventory reservation and concurrent integration tests | Requires runtime/concurrency test |
| SEC-06 | Medium | Provider payment reference uniqueness not visibly constrained | `schema/platform.ts:364-379` | Duplicate reconciliation records | Add uniqueness/idempotency invariant and replay tests | Source-verified |
| SEC-07 | Medium | API startup depends on DB/Stripe setup before listening | `api-server/src/index.ts:20-35` | Cold-start/outage blast radius | Separate migrations/readiness, add health/readiness and rollback behavior | Source-verified |
| SEC-08 | Medium | Demo configuration boundary must be isolated | `lib/demoAuth.ts:23-41`, `eas.json:5-14` | Demo account could be exposed in an unintended environment | Enforce environment assertions and production build checks | Source/config verified |
| SEC-09 | Low | Validation is inconsistent across routes | Reviews/admin route direct body/coercion usage | Malformed/oversized input | Standardize Zod schemas, bounds, UUID/date/pagination validation | Source-verified |
| SEC-10 | Low | Native security behaviors are not field-verified | Mobile biometric/location flows | False confidence in device behavior | Physical Android/iOS acceptance matrix | Test gap |

## Positive controls

- Pino redacts authorization/cookie/set-cookie fields.
- Generic 500 responses avoid returning internals.
- Stripe signatures are verified before webhook application.
- Admin/vendor ownership checks are server-side.
- Admin responses exclude passwords in tested paths.
