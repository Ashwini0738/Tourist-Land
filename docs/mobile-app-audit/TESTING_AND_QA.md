# Testing and QA

## Existing automation

- Mobile Jest/RNTL tests cover auth recovery, role routing, home sections, maps/location/directions, biometrics, secure storage, authenticated API behavior, vendor/admin screens.
- API tests cover catalog, explore, hotels, availability, booking, payment state, demo auth, onboarding, vendor/admin authorization, reports, notifications, and E2E/demo journeys.
- Admin uses Vitest and Playwright.
- Root scripts run workflow validation, typechecks, API build, and artifact builds.
- OpenAPI/generated-client contract validation runs in CI.

## Current evidence

During the preceding APK work, the mobile suite completed with **154 passing tests** and the mobile strict typecheck passed. The historical QA report under `docs/qa/QA_REPORT.md` is not the same as the current count and explicitly says native/live/production acceptance is blocked.

## Gaps

| Test area | Current state | Required acceptance |
|---|---|---|
| Physical Android | Not verified | Email code, demo login, force-close, resume, biometric, GPS, push, deep links |
| Physical iOS | Not verified | Same plus Face ID and iOS notification behavior |
| Slow network | Unit/mocked coverage exists | Real latency, resend races, retry and resume |
| Offline | No complete product behavior evidenced | Define cached browsing and failed booking semantics |
| Live Stripe | Not executed in audit | Test checkout, webhook replay, amount mismatch, cancellation/refund |
| Live supplier | Not configured/proven | Reservation, cancellation, inventory reconciliation |
| Concurrency | No visible oversell test | Parallel room reservation test |
| Security | Role/ownership tests strong | CORS, rate limits, enumeration, abuse tests |
| Accessibility | Not comprehensively evidenced | Screen reader, font scale, contrast, touch target |
| Performance | No production-scale evidence | Large catalog/image/API/database profiling |

## Recommended manual matrix

1. Android small phone, large phone, tablet; iOS small/large phone.
2. New signup, corrected email, repeated signup, email-code resend, interrupted verification.
3. Existing session resume after force-close and network loss.
4. Sign out/account switch and device-security isolation.
5. Demo preview login and confirmation that demo is absent from production builds.
6. Permission denied/blocked/GPS disabled and external map launch.
7. Push registration and notification tap/deep link.
8. Booking payment success, failure, duplicate tap, webhook replay, and cancellation.
9. Vendor ownership boundaries and admin role boundaries.
