---
name: Authentication authority
description: Why Clerk remains the sole session authority while native device authentication provides local app unlock.
---

Clerk is the only account and session authority. Native device authentication only unlocks an already-restored Clerk session. Never create parallel application refresh tokens or store app PINs, device credentials, passwords, or biometric data on-device.

**Why:** Keeping one session authority avoids conflicting expiry, revocation, and logout behavior. Native device authentication provides convenience without adding a second application credential or weakening managed identity verification.

Clerk hook functions such as token getters may change identity during auth updates. Security initialization effects must be keyed to stable auth facts such as signed-in state and user ID, while reading the current token getter through a ref. Do not use the getter function itself as an initialization-effect dependency.

**Why:** Depending on a changing token-getter identity repeatedly reset the security provider to not-ready and flooded the session endpoint, producing a continuous screen blink immediately after verification.

**How to apply:** New protected mobile flows must require a valid Clerk session plus the app-unlocked state. New protected API routes must use Clerk middleware and local-user provisioning; they must not accept app-PIN verification as a replacement for a Clerk session. Auth bootstrap effects should rerun only when the signed-in user changes.