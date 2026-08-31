---
name: Public hotel review identifiers
description: The identifier contract shared by hotel routes, bookings, seeded reviews, and public review queries.
---

Public hotel review `entityId` values must use the hotel catalog ID exposed by hotel routes and stored on bookings, rather than the database hotel row UUID.

**Why:** The public hotel detail and review URLs are addressed by catalog IDs, and mixing in internal UUIDs makes an otherwise published seeded review unreachable.

**How to apply:** When adding hotel review fixtures or persistence paths, use the same catalog identifier accepted by `/v1/hotels/:id` and `bookings.hotelCatalogId`.