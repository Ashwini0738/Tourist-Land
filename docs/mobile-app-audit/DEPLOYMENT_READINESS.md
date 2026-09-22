# Deployment Readiness

## Current configuration

| Item | Current evidence | Assessment |
|---|---|---|
| Android package | `com.arohagroup.travelandland` | Configured |
| iOS bundle | `com.arohagroup.travelandland` | Configured |
| App version | `1.0.0` | Configured but static |
| Android version code | `3` | Must be incremented for future store builds |
| EAS preview | Internal APK, preview env | Available |
| EAS production | No profile found | Missing |
| iOS preview | Internal profile | Available, native acceptance pending |
| Submit/update policy | Not found | Missing |
| Runtime version/OTA policy | Not found | Missing |
| API deployment | Replit autoscale/workflows | Environment evidence incomplete |
| Production DB | Not evidenced | Blocked |
| Production Stripe/Clerk/Resend | Names/config paths exist | Live acceptance blocked |

## Release blockers

1. No production EAS build/submit profile.
2. No documented versioning, OTA/runtime, rollback, or store metadata process.
3. No physical Android/iOS acceptance sign-off.
4. No production provider/database/domain readiness evidence.
5. CORS policy is not production-safe.
6. Live supplier booking fulfillment is not demonstrated.
7. API startup dependency chain needs operational readiness testing.

## Staging-to-production checklist

- [ ] Create a production EAS profile with live-key guardrails.
- [ ] Define version/code increment and signing ownership.
- [ ] Define OTA/runtime compatibility and rollback.
- [ ] Verify production Clerk environment and domains.
- [ ] Provision production DB, apply schema, backup, and rollback plan.
- [ ] Connect Stripe, verify managed webhook, and test replay/idempotency.
- [ ] Configure Resend, push, optional live providers.
- [ ] Replace arbitrary-origin credentialed CORS with allowlist.
- [ ] Execute physical Android/iOS matrix.
- [ ] Run security, load, payment, and supplier acceptance.
