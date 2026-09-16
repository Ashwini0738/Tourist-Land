---
name: Supabase email verification
description: Native confirmation links are the fallback when the active Supabase project cannot customize the signup email template for OTP delivery.
---

Use the native Supabase confirmation-link flow when the active project cannot replace `{{ .ConfirmationURL }}` with `{{ .Token }}`. The app must pass its native callback URI as the signup and resend redirect.

**Why:** The active free Supabase setup did not allow editing the Confirm signup template, and Replit-managed Clerk does not provide a drop-in email OTP signup flow for this app.

**How to apply:** Preserve Supabase email/password ownership and verify the native callback redirect is allowlisted in Supabase Authentication URL Configuration before building a release.