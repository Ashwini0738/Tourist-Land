# Performance Audit

## Current observations

- React Query provides client caching and refetch behavior.
- Home refresh uses `Promise.allSettled`, reducing all-or-nothing refresh failure.
- The API includes catalog/search and reporting surfaces but pagination and bounded query behavior must be checked route by route.
- Image delivery is largely bundled/fallback URL based; there is no image resize/thumbnail pipeline.
- API startup performs migrations/webhook setup/backfill before listening.
- Mobile preview build archive was large enough to require compressed APK delivery, indicating release artifact size should be tracked.

## Risks

| Risk | Impact | Recommendation |
|---|---|---|
| Unbounded catalog/admin queries | Memory and slow screens | Enforce pagination and maximum limits |
| Bundled/remote images without optimization | Startup/download cost | Resize, CDN/cache, thumbnails |
| Booking availability read-before-write | Oversell and retries | Atomic reservation/locking |
| API startup integration work | Slow/unavailable cold starts | Separate readiness and migration jobs |
| No offline strategy | Poor travel connectivity experience | Define cached discovery and explicit booking failure |
| Provider calls | Latency/error propagation | Timeouts, retries, circuit breaker, observability |
| Admin reports | Large DB scans | Index and pre-aggregate where justified |

## Required measurements

- Cold start and first contentful screen on Android/iOS.
- Home feed time with empty, demo, and production-scale catalog.
- Search/availability p50/p95 latency.
- API query counts per screen and cache hit rates.
- APK/AAB size and native startup memory.
- Database query plans for availability, bookings, reports, and admin lists.
