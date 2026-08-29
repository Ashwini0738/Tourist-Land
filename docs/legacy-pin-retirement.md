# Legacy app-PIN data retirement

## Scope and approval

This change retires only the former `public.user_pin_credentials` table. It does
not remove Clerk users, Clerk sessions, native device-authentication settings,
or any other application data.

The owner-approved decision is to remove the obsolete PIN records rather than
retain copies of PIN hashes. The current Drizzle schema is the source of truth:
`lib/db/src/schema/platform.ts` no longer declares `user_pin_credentials`, and
`artifacts/api-server/src/routes/auth.ts` has no PIN setup, verification, or
change route.

## Applying the change

This repository uses Drizzle schema push rather than checked-in SQL migration
files. The normal development command is:

```bash
pnpm --filter @workspace/db run push
```

The post-merge setup runs the same development-only schema push automatically.
Before accepting the change, review Drizzle's proposed diff and confirm that
the only destructive operation is removal of `public.user_pin_credentials`.
Do not use `push-force` to bypass a review of an unexpected diff.

Production schema changes are applied by Replit's Publish flow. There is
currently no production database for this project. After a production database
exists, publish the schema change and confirm the table-drop warning in the
Publish UI; do not run production DDL or add a deploy/startup migration script.

## Backup and rollback decision

No standalone export of the PIN table is retained. Its values are authentication
hashes for a feature that no longer exists, so preserving another copy would
retain sensitive authentication material without a supported consumer.

For development, create or use the Agent checkpoint associated with the schema
change and select the database when rolling back. For production, use Replit's
database point-in-time restore if recovery is required, then align the app code
with the restored database state. A rollback restores the obsolete table only
as a recovery action; the application must not reintroduce PIN reads or writes.

## Verification

After the development push, verify that:

1. `information_schema.tables` no longer lists
   `public.user_pin_credentials`.
2. The API typecheck and full workspace typecheck pass.
3. The API auth routes still require Clerk and return the normal session
   response without any PIN fields.
4. A production publish is deferred until a production database exists and the
   owner confirms the destructive table-drop prompt.