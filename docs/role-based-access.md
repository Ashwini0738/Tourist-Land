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

A visitor submits a pre-account application through `POST /api/v1/vendor/applications`. It remains `pending` until an administrator reviews it in the protected admin dashboard. Approval changes it to `invited` only after the server sends a Clerk invitation. The recipient creates their own Clerk account, completes email verification, and then the first authenticated API request claims the approved application into an approved local vendor profile. Rejected or revoked applications can never claim vendor access.

Applicants can check a safe status message with the application reference and original email through `GET /api/v1/vendor/applications/status`. The status endpoint never returns business details or invitation secrets.

## Protected API boundaries

- `GET /api/v1/me` returns safe local user, role, status, and vendor-profile data.
- Vendor dashboard and vendor-listing viewing are available to `vendor` accounts with an `approved` vendor profile and to `admin` accounts. Admins see all vendor listings in a read-only vendor workspace.
- Vendor listing creation and ownership actions remain vendor-only; platform-wide listing review is available through the admin listings module.
- Admin dashboard, user-role, vendor application review, admin invitation, and vendor suspension endpoints require `admin`.
- Vendor-owned resource routes should use the shared owner-or-admin middleware when those modules are added.

## Administrator onboarding

The first administrator is assigned only from `TRAVEL_LAND_ADMIN_CLERK_USER_IDS`. An existing administrator can use `POST /api/v1/admin/invitations/admin` to send a Clerk invitation to another email address. The invited person creates and owns their credentials; no password is created, stored, or displayed by Travel & Land.