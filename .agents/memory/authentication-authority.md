---
name: Authentication authority
description: Why Clerk remains the sole session authority while PIN and biometrics provide local app unlock.
---

Clerk is the only account and session authority. The app-specific PIN is verified server-side against a salted memory-hard hash, while device biometrics only unlock an already-restored Clerk session. Never create parallel application refresh tokens or store PINs, passwords, or biometric data on-device.

**Why:** Keeping one session authority avoids conflicting expiry, revocation, and logout behavior. PIN and biometric convenience still work without weakening managed identity verification.

**How to apply:** New protected mobile flows must require a valid Clerk session plus the app-unlocked state. New protected API routes must use Clerk middleware and local-user provisioning; they must not accept PIN verification as a replacement for a Clerk session.