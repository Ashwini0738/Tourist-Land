---
name: Demo data fixtures
description: Durable rules for keeping the local Travel & Land demo dataset safe and deterministic.
---

Demo booking fixtures should contain exactly one payment row per booking.

**Why:** Booking reads join payments directly and multiple fixture payments for one booking make the exposed payment state ambiguous.

**How to apply:** When expanding seeded booking lifecycles, add a distinct booking or update its single payment state instead of adding competing payment rows.