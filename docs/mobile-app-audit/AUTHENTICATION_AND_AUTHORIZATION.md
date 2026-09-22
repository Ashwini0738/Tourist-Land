# Authentication and Authorization

## Authority

Clerk is the sole authentication authority. Mobile profile/session context derives from Clerk (`artifacts/travel-land-app/context/AuthContext.tsx:22-44`). The API verifies Clerk identity and maps it to a local `users` record (`artifacts/api-server/src/middlewares/requireAuth.ts:44-95`).

## Sign-up/sign-in

- Signup: Clerk create → email code send → `/verify` → verify → `signUp.finalize`.
- Sign-in: Clerk create → email code send → verify → finalize/activate.
- Demo login: server validates a development OTP, creates/reuses a fixed Clerk identity, issues a sign-in ticket, and the client consumes the ticket.
- Phone OTP/SMS was not found as a configured authentication flow.

## Session and device security

Clerk persists the server session. SecureStore stores a per-Clerk-user local security state. Biometrics/passcode are a UI access gate over the restored Clerk session; they do not replace Clerk token validation. State is namespaced by user ID and reset on sign-out/user switch. Browser previews use a compatible local-storage wrapper.

## Roles

Roles are `user`, `vendor`, and `admin` (`lib/db/src/schema/platform.ts:34-45`). Admin and vendor routers apply role middleware globally. Vendors additionally require approval. Ownership checks prevent cross-user/vendor access (`artifacts/api-server/src/middlewares/authorization.ts:44-106`).

## Account recovery/deletion

Recovery/retry state exists for interrupted delivery and verification. No complete customer account-deletion workflow was found in the inspected routes/screens. Document deletion/retention requirements before launch.

## Security assessment

| Area | Status | Evidence / issue |
|---|---|---|
| Clerk token validation | Implemented | `requireAuth.ts` |
| Server role checks | Implemented | `authorization.ts`, vendor/admin routers |
| Owner checks | Implemented/tested | Vendor/admin route tests |
| Local device unlock | Partial/unverified native | `AuthSecurityContext.tsx`, biometric screens |
| Phone OTP | Not found | No Twilio/SMS implementation |
| Logout revocation | Clerk-client controlled | API logout is informational |
| OTP abuse limiting | Gap | No visible rate limiting |
| Cross-origin policy | Gap | Credentialed arbitrary-origin CORS |
| Production keys/profile | Incomplete | No production EAS profile |
