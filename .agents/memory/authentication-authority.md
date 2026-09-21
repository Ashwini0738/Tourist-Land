---
name: Authentication authority
description: Clerk is the sole account authentication authority; local roles and native unlock remain separate gates.
---

Clerk is the sole authentication and session authority for mobile email OTP, email-based MFA, token restoration, and logout. Supabase Auth, phone login, provider linking, password callbacks, and Supabase bearer-token acceptance are not part of the active application.

**Why:** Parallel Clerk and Supabase sessions caused ambiguous identity, navigation, callback, and API behavior. A single provider gives expiry, refresh, revocation, and logout one source of truth.

Clerk organization membership is not part of login, profile provisioning, or role authorization. Sessions must become active without organization provisioning; `/v1/me` resolves the verified Clerk identity to the local profile and database role.

**Why:** Organization-required pending sessions blocked normal Android login with provisioning 401s even though Travel & Land authorization already lives in PostgreSQL.

Invitation metadata is not an authorization authority. Vendor and admin invitations grant a local role only when the verified Clerk account email matches an active invitation/application record in PostgreSQL; rejected or revoked local states must fail closed even if a Clerk signup succeeds.

**Why:** Clerk owns account creation, but local onboarding review owns Travel & Land privileges. Matching the verified email connects those systems without accepting client-supplied roles or depending on mutable public metadata.

Provider token getters may change identity during auth updates. Security initialization effects must be keyed to stable auth facts such as signed-in state and Clerk user ID. Do not use a changing token-getter function itself as a security initialization dependency.

**Why:** Depending on a changing token-getter identity repeatedly reset the security provider to not-ready and flooded the session endpoint, producing a continuous screen blink immediately after verification.

**How to apply:** Protected mobile flows require a restored Clerk session, successful API resolution to a local user, role/account approval, and the existing device-unlock gate. Never treat biometric unlock as account authentication.

Expo Router's root authentication guard must keep the root navigator mounted and perform destination changes from an effect. Returning a root-level redirect in place of the navigator can leave navigation actions unhandled and remount native authentication screens.

**Why:** An unmounted root stack caused both role-based dashboard redirects to fail and the biometric screen to remount, repeatedly reopening the system prompt.

**How to apply:** Derive auth, device-unlock, and role destinations centrally, navigate only after the relevant state is ready, and leave the root `Stack` rendered throughout authentication transitions.

Email signup and login use Clerk email-code verification. Phone-number login is intentionally unavailable. Any supported second-factor continuation uses email and converges on the same Clerk session flow.

**Why:** Competing sessions make API identity, logout, and restoration ambiguous.

**How to apply:** Send the verified Clerk bearer token on mobile API calls. The backend verifies Clerk, provisions or resolves the local user, loads local roles, and fails closed for inactive accounts. Never add organization provisioning to session activation.

Clerk ticket sign-in can return `session_exists` after an earlier partial attempt, including on a physical Expo Go device. The mobile demo flow should first activate the locally available session and only clear the attempt when activation is not possible.

**Why:** Clearing a recoverable session converted a successful native authentication state into a red login error, while activating it allowed the authenticated navigator and Profile tab to load.

**How to apply:** Treat `session_exists` as a recovery branch in ticket-based demo login; preserve the existing local-session checks so an unavailable or non-active session still fails explicitly.