---
name: Clerk organization slugs
description: How to preserve the canonical client organization when the active Clerk tenant disables organization slugs.
---

Treat the exact organization name as the canonical identity when Clerk reports `organization_slugs_disabled`; request the preferred slug first, then create without one only for that explicit Clerk error.

**Why:** Some Clerk tenants allow organizations but reject all slug parameters. Requiring the slug makes otherwise valid, server-owned provisioning fail.

**How to apply:** Keep organization name and role server-owned. Match the exact canonical name and accept only either the canonical slug or no slug; never accept organization identifiers or roles from clients.