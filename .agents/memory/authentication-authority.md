---
name: Authentication authority
description: Provider ownership during the mobile Supabase transition and the role of native device authentication.
---

Mobile email/password authentication is owned by Supabase Auth. Mobile phone OTP and MFA remain owned by Clerk during the transition. A single provider-neutral mobile boundary must expose only the active provider session and its access token; never create custom tokens or copy credentials between providers.

**Why:** The staged migration requires both managed providers temporarily, but each login transaction must still have exactly one owner so expiry, refresh, revocation, and logout behavior cannot conflict.

Invitation metadata is not an authorization authority. Vendor and admin invitations grant a local role only when the verified Clerk account email matches an active invitation/application record in PostgreSQL; rejected or revoked local states must fail closed even if a Clerk signup succeeds.

**Why:** Clerk owns account creation, but local onboarding review owns Travel & Land privileges. Matching the verified email connects those systems without accepting client-supplied roles or depending on mutable public metadata.

Provider token getters may change identity during auth updates. Security initialization effects must be keyed to stable auth facts such as signed-in state and external user ID. Do not use a changing token-getter function itself as a security initialization dependency.

**Why:** Depending on a changing token-getter identity repeatedly reset the security provider to not-ready and flooded the session endpoint, producing a continuous screen blink immediately after verification.

**How to apply:** Protected mobile flows require one restored provider session, successful API resolution to local `users.id`, role/account approval, and the existing device-unlock gate. Supabase maps only through `auth_user_id`; Clerk maps through `clerk_user_id`. Never email-match Supabase users or treat device unlock as account authentication.

Expo Router's root authentication guard must keep the root navigator mounted and perform destination changes from an effect. Returning a root-level redirect in place of the navigator can leave navigation actions unhandled and remount native authentication screens.

**Why:** An unmounted root stack caused both role-based dashboard redirects to fail and the biometric screen to remount, repeatedly reopening the system prompt.

**How to apply:** Derive auth, device-unlock, and role destinations centrally, navigate only after the relevant state is ready, and leave the root `Stack` rendered throughout authentication transitions.

An explicit mobile email/password submission creates only a Supabase session. It must never call Clerk password sign-in, activate a Clerk session, or fall back to a Clerk token. Phone OTP and its second-factor continuation remain entirely within Clerk.

**Why:** Competing sessions would make API identity, logout, and restoration ambiguous during the transition.

**How to apply:** Use the active Supabase access token for migrated email users and Clerk’s verified token for phone/MFA users. Sign out only the active provider. Keep refresh tokens inside provider-managed persistence and leave destination routing to the root state machine.

Supabase password recovery is a Supabase-only transaction: accept links only on the approved mobile callback, exchange the one-time code or provider session through Supabase, and hold recovery sessions outside normal app navigation until the password update completes.

**Why:** Recovery links grant temporary account access, so accepting arbitrary deep links or letting a recovery session enter role and device-unlock routing could turn an invalid or partially handled link into an unintended authenticated state.

**How to apply:** Keep the callback URI allow-listed and provider-validated, expose a dedicated recovery state, fail invalid/expired/reused links with generic user-facing copy, and clear the recovery session after the password changes. Never route recovery through Clerk or share its session state with phone/MFA flows.