# Technical Debt and Issue Register

| ID | Category | Issue | Severity | Complexity | Evidence |
|---|---|---|---|---|---|
| TD-01 | Release | Production EAS profile and submission/update policy absent | High | Medium | `eas.json` |
| TD-02 | Security | Credentialed arbitrary-origin CORS | High | Small/Medium | `api-server/src/app.ts:53-54` |
| TD-03 | Booking | Concurrent inventory reservation safety not evident | High | Large | `lib/booking.ts:198-276` |
| TD-04 | Integrations | Local hotel inventory is not supplier fulfillment | High | Large | hotel inventory policy |
| TD-05 | Operations | Stripe setup blocks API readiness | High | Medium | `api-server/src/index.ts:20-35` |
| TD-06 | API contract | OpenAPI identity-link drift | Medium | Medium | `lib/api-spec/openapi.yaml:952-999` |
| TD-07 | Abuse | No visible OTP/application rate limiting | Medium | Medium | auth/onboarding routes |
| TD-08 | Validation | Inconsistent route input validation | Medium | Medium | reviews/admin routes |
| TD-09 | UX | Blank protected layouts while role/security state waits | Medium | Small | mobile layouts |
| TD-10 | UX/product | Wallet is presentation-only/unclear | Medium | Medium | wallet screens |
| TD-11 | UX/product | Provider-free map may be misunderstood | Medium | Medium/Large | `MapCanvas.tsx` |
| TD-12 | Mobile | Vendor module screens exceed current UI implementation | Medium | Large | `RoleDashboard.tsx` |
| TD-13 | Storage | No managed image/file upload lifecycle | Medium | Large | URL arrays/bundled assets |
| TD-14 | Versions | Root/mobile TypeScript drift | Low | Small | package manifests |
| TD-15 | QA | Native/live/provider/production tests missing | High | Large | QA report and test inventory |

## Debt handling principle

Prioritize security, release controls, booking correctness, and provider truthfulness before adding more catalog features.
