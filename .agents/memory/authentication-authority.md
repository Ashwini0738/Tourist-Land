---
name: Authentication authority
description: Why Clerk remains the sole session authority while native device authentication provides local app unlock.
---

Clerk is the only account and session authority. Native device authentication only unlocks an already-restored Clerk session. Never create parallel application refresh tokens or store app PINs, device credentials, passwords, or biometric data on-device.

**Why:** Keeping one session authority avoids conflicting expiry, revocation, and logout behavior. Native device authentication provides convenience without adding a second application credential or weakening managed identity verification.

Invitation metadata is not an authorization authority. Vendor and admin invitations grant a local role only when the verified Clerk account email matches an active invitation/application record in PostgreSQL; rejected or revoked local states must fail closed even if a Clerk signup succeeds.

**Why:** Clerk owns account creation, but local onboarding review owns Travel & Land privileges. Matching the verified email connects those systems without accepting client-supplied roles or depending on mutable public metadata.

Clerk hook functions such as token getters may change identity during auth updates. Security initialization effects must be keyed to stable auth facts such as signed-in state and user ID, while reading the current token getter through a ref. Do not use the getter function itself as an initialization-effect dependency.

**Why:** Depending on a changing token-getter identity repeatedly reset the security provider to not-ready and flooded the session endpoint, producing a continuous screen blink immediately after verification.

**How to apply:** New protected mobile flows must require a valid Clerk session plus the app-unlocked state. New protected API routes must use Clerk middleware and local-user provisioning; they must not accept app-PIN verification as a replacement for a Clerk session. Privileged invitation claims must check an active local record against Clerk’s verified email. Auth bootstrap effects should rerun only when the signed-in user changes.

Expo Router's root authentication guard must keep the root navigator mounted and perform destination changes from an effect. Returning a root-level redirect in place of the navigator can leave navigation actions unhandled and remount native authentication screens.

**Why:** An unmounted root stack caused both role-based dashboard redirects to fail and the biometric screen to remount, repeatedly reopening the system prompt.

**How to apply:** Derive auth, device-unlock, and role destinations centrally, navigate only after the relevant state is ready, and leave the root `Stack` rendered throughout authentication transitions.

An explicit email/password submission owns a fresh Clerk session transition: clear known prior Clerk sessions before beginning that new transaction, retry a reported identifiable stale session at most once, and never run this cleanup from startup or while MFA is active. Startup and native unlock must reuse the restored Clerk session instead.

**Why:** Reusing a session from the local session-list hook after Clerk returned `session_exists` failed when Clerk's server knew about a session that was not usable locally. Cleanup during MFA would destroy the in-progress transaction, while cleanup during startup would break device-unlock reuse.

**How to apply:** Keep fresh-login cleanup, password transaction creation, finalization, and activation under one login owner. After finalization, resolve the session ID from Clerk's current post-finalize state, confirm that active session exists locally, and only then clear verification UI; leave destination routing to the root state machine.