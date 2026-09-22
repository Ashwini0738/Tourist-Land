# Feature Inventory

| Feature | Users | Evidence / services | Status | Limitations and next step |
|---|---|---|---|---|
| Customer registration | Guest/customer | Clerk `signUp.create`, email code, `/verify` (`app/login.tsx:179-195`, `app/verify.tsx:37-84`) | Backend-connected; tested | Physical-device and provider email acceptance remain. |
| Email-code login | Customer | Clerk `signIn.create`, email-code verify/finalize (`app/login.tsx:199-227,294-312`) | Backend-connected; tested | Native/release behavior needs physical acceptance. |
| Demo login | Internal tester | `/v1/auth/demo`, Clerk sign-in ticket (`app/login.tsx:393-429`, `routes/auth.ts:22-59`) | Development/preview demo | Server and client flags must never enter production. |
| Logout/session | All signed-in users | Clerk client sign-out; API logout is informational (`routes/auth.ts:78-85`) | Implemented | Test force-close, resume, account switching, and stale device state. |
| Device security | Customer/vendor/admin | SecureStore + LocalAuthentication (`context/AuthSecurityContext.tsx:28-79`, `app/biometric*.tsx`) | Partial; native unverified | It gates UI over Clerk and is not server MFA. |
| Customer home | Customer/guest | React Query catalog and composed sections (`features/home/HomeScreen.tsx:43-79`) | Backend-connected | Catalog image assets are partly bundled/local. |
| Explore/search | Customer/guest | Search/categories/filters API (`app/maps.tsx:17-30`, `routes/explore.ts`) | Backend-connected | Pagination/performance needs production-scale testing. |
| Destinations/places/events/food | Customer/guest | Catalog routes and detail screens | Backend-connected plus seeded/demo data | Content completeness depends on database environment. |
| Hotels/rooms | Customer/vendor/admin | Hotel search, rooms, availability, vendor portal, admin views | Partial | Local/development inventory; no proven live supplier fulfillment. |
| Booking | Customer/admin | Create/list/detail/cancel/checkout routes (`routes/bookings.ts:53-149`) | Partial/backend-connected | Stripe payment is not supplier reservation confirmation. |
| Cancellation | Customer/admin | Reference-scoped cancellation | Implemented with constraints | Refund policy and supplier cancellation are not demonstrated. |
| Favorites/trips | Customer | Favorites/trips APIs and app hooks | Backend-connected | Needs device/account lifecycle testing. |
| Reviews | Customer/admin | Eligibility, CRUD, moderation routes | Backend-connected | Moderation workflow is real; scale and abuse controls need testing. |
| Notifications | Customer/admin | DB notifications, read state, push registration, admin broadcast | Backend-connected | Delivery failure is logged/swallowed; no delivery analytics. |
| Wallet | Customer | `app/wallet.tsx`, `WalletCard` | UI/demo-like | No verified balance or transaction API was found for the screen. |
| Maps/directions | Customer | Location permission, atlas projection, Linking directions | Partial | No map tiles, pan/zoom SDK, or native map provider. |
| Property discovery/enquiry | Customer/vendor/admin | Property catalog, idempotent enquiry, vendor status/history | Backend-connected | Enquiry is not a sale, legal verification, or ownership transfer. |
| Vendor application | Guest/vendor | Application create/status and email/in-app updates | Backend-connected | Status endpoint enumeration and rate limiting need review. |
| Vendor operations | Vendor | Hotels, rooms, availability, enquiries, reports | Backend-connected API; partial mobile UI | Mobile dashboard modules include foundation placeholders. |
| Admin operations | Admin | Protected SPA and `/admin` routes | Backend-connected | Some content types are read-only and reporting has unavailable metrics. |
| Payments | Customer/admin | Stripe Checkout, managed webhook, payment state | Backend-connected; provider-dependent | Requires live connector/webhook/domain and supplier reconciliation. |
| Image/file storage | Vendor/admin/customer | URL arrays and bundled assets | Not implemented as object upload | No S3/Supabase/Cloudinary/object-storage upload flow found. |
| Email | Customer/vendor/admin | Resend connector proxy | Backend-connected; provider-dependent | Failures do not roll back saved business state. |
| Push notifications | Customer/vendor/admin | Expo push API | Backend-connected; delivery unverified | Physical token/device testing required. |

## Data status legend

- **Real**: API/database path exists and authorization is present.
- **Local/demo**: seeded or development-only data.
- **Provider-dependent**: code exists but the current environment/provider is not proven.
- **Unverified**: source code exists but native/live execution is required.
