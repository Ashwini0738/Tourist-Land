# Expo Go onboarding test paths

These flows use the development Clerk environment and the development database. Do not paste passwords, invitation links, session tokens, or other credentials into chat or source control.

## Regular user

1. Open the Expo Go preview and choose **New here? Create an account**.
2. Complete the existing Clerk email verification screen.
3. Complete the native device-auth setup/unlock screen.
4. Confirm that the regular five-tab experience opens and no vendor/admin dashboard link is shown.

## First administrator

1. Create a normal Clerk account using the regular signup flow.
2. Use the workspace environment/secrets tooling to set that Clerk user ID in `TRAVEL_LAND_ADMIN_CLERK_USER_IDS`.
3. Return to the app and sign in again. The first authenticated API request provisions the local admin role.
4. Complete email verification and the native device-auth gate. The admin dashboard should open.
5. Remove the bootstrap ID after the local role has been assigned; do not share the account password.

## Vendor

1. From the sign-in screen choose **Apply as a vendor**.
2. Submit the business and contact form. No Clerk account or password is requested.
3. Save the returned application reference. Use the same reference and email to check status after review.
4. An admin opens **Vendors**, then chooses **Approve & invite**. Approval is not complete until the Clerk invitation is sent.
5. Open the invitation link in the recipient’s email and create the recipient-owned Clerk credentials.
6. Return to Expo Go, sign in with that account, complete email verification if prompted, and complete native device-auth setup. The vendor dashboard should open.
7. If the application is rejected or an invitation is revoked, the account must remain a regular user and must not reach the vendor dashboard.

## Invited administrator

1. While signed in as an existing admin, open **Users** and enter the new administrator’s email.
2. Choose **Send secure invite**. The recipient creates their own Clerk credentials from the invitation.
3. Return to Expo Go and sign in as the recipient. Complete email verification and the native device-auth gate.
4. Confirm that the admin dashboard opens. No administrator password is generated or shared by the app.