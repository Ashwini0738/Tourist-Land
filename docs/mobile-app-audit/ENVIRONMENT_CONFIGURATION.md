# Environment Configuration

Values are intentionally omitted. The names below are the configured names discovered in source/configuration and examples.

| Variable group | Names | Secret? | Purpose/status |
|---|---|---|---|
| Database/session | `DATABASE_URL`, `SESSION_SECRET` | Yes | PostgreSQL/session infrastructure |
| Replit runtime | `REPLIT_DOMAINS`, `REPL_IDENTITY`, `X_REPLIT_TOKEN`, `REPL_ID` | Mixed | Hosting/connectors/runtime |
| Clerk | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY`, `TRAVEL_LAND_DEV_CLERK_SECRET_KEY` | Mixed/secret | Managed auth |
| Admin identity | `TRAVEL_LAND_ADMIN_CLERK_USER_IDS`, `TRAVEL_LAND_DEV_ADMIN_CLERK_USER_IDS` | Sensitive config | Admin bootstrap |
| Auth routing | `TRAVEL_LAND_AUTH_TARGET`, `TRAVEL_LAND_API_AUTH_PROVIDER` | No | Selects auth environment/provider |
| Demo server | `TRAVEL_LAND_DEMO_AUTH_ENABLED`, `TRAVEL_LAND_DEMO_EMAIL`, `TRAVEL_LAND_DEMO_PHONE`, `TRAVEL_LAND_DEMO_OTP` | OTP/phone/email sensitive | Development/preview demo |
| Build policy | `TRAVEL_LAND_BUILD_ENV`, `EAS_BUILD_PROFILE` | No | Release/demo guards |
| Expo public | `EXPO_PUBLIC_*` including Clerk/domain/Supabase names | Public values may be exposed | Mobile compile-time config |
| Admin public | `VITE_*` | Depends | Admin compile-time config |
| Messaging | `TRAVEL_LAND_EMAIL_FROM`, Resend/provider URL/key names | Sender public; keys secret | Email delivery |
| Optional live providers | Hotel/event provider URL/API-key names | Keys secret | Optional external data |
| Logging | `LOG_LEVEL` | No | Pino logging |

## Configuration conclusions

- Never print values from these variables.
- Public Expo variables are embedded in the client and are not a place for secrets.
- Demo variables must be development/preview-only and rejected in production.
- The current preview EAS profile explicitly enables the demo client flag.
- Production requires a checked-in profile/process that proves live Clerk key and environment selection.
