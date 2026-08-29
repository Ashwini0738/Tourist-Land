---
name: Existing Clerk onboarding
description: How reviewed vendor applicants with an existing Clerk identity should be activated.
---

An applicant may already have a Clerk account even when PostgreSQL has not yet provisioned a local user. Clerk rejects a new application invitation for that email with `form_identifier_exists`; approval should reconcile the existing Clerk identity to a local user, vendor role, and approved vendor profile instead.

**Why:** Clerk account existence and local-user provisioning are separate lifecycles. Treating this expected state as invitation infrastructure failure leaves a valid applicant stuck in a retry loop.

**How to apply:** Before sending a vendor invitation, look up the applicant by email. Activate an existing identity directly; keep the invitation flow for emails absent from Clerk, and log only structured non-sensitive provider error metadata for real failures.