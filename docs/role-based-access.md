# Role-based access

Travel & Land uses Clerk for identity and local PostgreSQL records for authorization. The API is the authority for the effective role; the mobile app only uses the role returned by `GET /api/v1/me` to choose navigation.

## Roles

The supported primary roles are:

- `user` — the default role for every authenticated account
- `vendor` — activated only after an approved vendor profile
- `admin` — platform-level administration

The server never accepts a role from a normal signup request or trusts a role supplied by a client request body.

## Development admin bootstrap

To bootstrap an administrator in a development environment, set `TRAVEL_LAND_ADMIN_CLERK_USER_IDS` to a comma-separated list of Clerk user IDs through the workspace environment/secrets tooling. On the next authenticated API request, those identities receive the `admin` role in the local role table.

Do not put passwords, tokens, or public demo credentials in source control. Remove a development bootstrap ID after the administrator has been assigned through the protected admin API.

## Vendor onboarding

An authenticated user submits a vendor profile through `POST /api/v1/vendor/profile`. The profile starts as `pending` and does not grant vendor dashboard access. An administrator approves it through `POST /api/v1/admin/vendors/:userId/approve`, which assigns the `vendor` role. Suspension removes active vendor access and returns the local role to `user`.

## Protected API boundaries

- `GET /api/v1/me` returns safe local user, role, status, and vendor-profile data.
- Vendor dashboard access requires the `vendor` role and an `approved` vendor profile.
- Admin dashboard, user-role, vendor approval, and vendor suspension endpoints require `admin`.
- Vendor-owned resource routes should use the shared owner-or-admin middleware when those modules are added.