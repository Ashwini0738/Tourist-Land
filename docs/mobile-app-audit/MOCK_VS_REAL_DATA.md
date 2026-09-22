# Mock vs Real Data Audit

| Area | Data source | Real/mock | Production readiness |
|---|---|---|---|
| Clerk users/sessions | Clerk | Real provider | Provider/environment dependent |
| Local users/roles | PostgreSQL | Real app data | Requires DB and provisioning |
| Catalog/search | API/DB | Real path; may be seeded | Depends on content quality |
| Demo catalog | Demo seed/config | Demo | Not production evidence |
| Hotel availability | Local/vendor DB and development samples | Local/demo/provider adapter | Not live supplier fulfillment |
| Booking | PostgreSQL + local inventory | Real application flow | Payment/supplier caveat |
| Stripe payment | Stripe Checkout/webhook | Real provider path | Connector/webhook/domain dependent |
| Demo payments | Seed provider=`demo` rows | Fake/demo | Never use for revenue claims |
| Map | Custom geometry and bundled visuals | Simulated/provider-free | Not a live map |
| Location | Expo Location | Real native capability | Physical-device unverified |
| Directions | External URL/Linking | Real handoff | Physical-device unverified |
| Wallet | Local/presentational UI | Demo/partial | Not a financial wallet |
| Images | Bundled assets/URL arrays | Partial | No managed upload/storage |
| Notifications | DB records | Real app state | Provider delivery dependent |
| Push | Expo push service | Real external call | Device delivery unverified |
| Email | Resend connector proxy | Real external call | Provider configuration dependent |
| Events/hotel live data | Optional adapters | Configurable, not proven configured | Not verified |

The presence of a successful UI state or seeded record does not prove a live supplier reservation, payment settlement, delivery, or legal property transaction.
