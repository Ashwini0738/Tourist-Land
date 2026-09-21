---
name: Clerk signup recovery
description: Recovery behavior after Clerk rejects account creation on mobile.
---

When Clerk returns an account-creation error, reset the signup attempt before showing the recovery message so a later submission starts a fresh attempt.

**Why:** Clerk can retain the rejected attempt state even though the UI submission lock is cleared; retrying without resetting can leave the signup flow blocked or stale.

**How to apply:** Keep the email in the controlled form, avoid sending a verification code after the rejected create response, and verify that a later submit can call create and then begin code delivery.