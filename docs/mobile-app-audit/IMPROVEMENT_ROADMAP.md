# Improvement Roadmap

## Phase 1 — Critical security and release controls

| Problem | Action | Acceptance |
|---|---|---|
| Arbitrary credentialed CORS | Add explicit origin allowlist | Unknown origin cannot make credentialed API request |
| No production EAS path | Add production profile, version, submit/update, rollback policy | Reproducible signed production build |
| Demo boundary risk | Add CI/runtime assertions for demo flags | Production artifact/API cannot use demo auth |
| API startup blast radius | Separate readiness from migrations/provider setup | Health/readiness behavior is observable and recoverable |

## Phase 2 — Authentication and native UX

- Complete physical Android/iOS test matrix.
- Verify force-close, resume, sign-out, account switch, resend races, and recovery.
- Replace blank protected layouts with explicit loading/error/retry screens.
- Add accessibility/font-scaling/focus checks.

## Phase 3 — API and database correctness

- Add consistent Zod validation and bounded pagination.
- Add concurrent inventory reservation tests and locking/atomic reservation where needed.
- Enforce payment provider-reference uniqueness.
- Reconcile OpenAPI declarations and runtime routes.
- Document and automate DB migration/backup/rollback.

## Phase 4 — Real tourism and hotel functionality

- Decide whether the atlas is sufficient or integrate a map provider.
- Configure and validate live hotel/event suppliers.
- Define supplier reservation, cancellation, refund, and reconciliation contracts.
- Replace demo/local availability messaging with environment-aware truth.

## Phase 5 — Vendor and property operations

- Complete mobile vendor module screens.
- Add managed image/document storage with ownership, resizing, and cleanup.
- Define property verification, legal disclaimers, and enquiry-to-lead workflow.

## Phase 6 — Payments and reliability

- Run live Stripe acceptance with webhook replay and failure cases.
- Add supplier/payment reconciliation and refund states.
- Add operational monitoring, alerting, and idempotency dashboards.

## Phase 7 — Scale and production

- Load-test catalog, availability, bookings, reports, and admin lists.
- Add image CDN/thumbnail strategy.
- Define offline discovery behavior.
- Complete production launch checklist and staged rollout.
