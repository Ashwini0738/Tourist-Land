# Storage and Files

## Findings

The primary application store is PostgreSQL. No object-storage upload integration was found. Image fields are URL arrays, seed image arrays are often empty, and the mobile app relies on bundled assets/fallback image keys (`artifacts/api-server/src/routes/vendor-portal.ts:153-162,221-224`, `lib/db/src/seed-data.ts:21-28`, `artifacts/travel-land-app/features/home/components/Cards.tsx`, `lib/content.ts`).

| Asset type | Current source | Access model | Status |
|---|---|---|---|
| Catalog images | Bundled app assets/fallback keys and stored URLs | Public UI | Partial |
| Vendor hotel/property images | URL fields | No upload pipeline found | Not implemented as managed storage |
| Profile images | No verified upload flow found | N/A | Not implemented/unknown |
| Documents | No verified upload flow found | N/A | Not implemented |
| Payment data | Stripe connector plus local payment rows | Server/provider controlled | Implemented provider-dependent |
| Push tokens | PostgreSQL push-token records | User-scoped server data | Implemented |

## Missing controls

No verified file size/type validation, resizing, thumbnails, signed URLs, bucket policy, deletion cleanup, or orphan-file cleanup flow was found. If uploads are added, define private/public access by asset type, MIME and size limits, malware scanning, ownership checks, deletion semantics, and cache invalidation.
