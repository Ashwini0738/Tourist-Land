import { and, eq } from "drizzle-orm";
import { db, adminInvitations, userRoles, vendorApplications, vendorProfiles } from "@workspace/db";
import type { PrimaryRole } from "./roles";
export {
  normalizeEmail,
  parseVendorApplicationInput,
  validateVendorApplicationInput,
  type VendorApplicationField,
  type VendorApplicationFieldErrors,
  type VendorApplicationInput,
} from "./onboarding-validation.ts";
export {
  shouldClaimInvitedAccess,
  vendorApprovalAction,
  vendorRejectionStatus,
} from "./onboarding-state.ts";

type LocalUserForClaim = {
  id: string;
  email: string;
};

export type VendorApplicationRecord = typeof vendorApplications.$inferSelect;

export function serializeVendorApplication(application: VendorApplicationRecord) {
  return {
    id: application.id,
    userId: application.userId,
    businessName: application.businessName,
    businessType: application.businessType,
    contactName: application.contactName,
    phone: application.phone,
    email: application.email,
    description: application.description,
    address: application.address,
    city: application.city,
    state: application.state,
    country: application.country,
    status: application.status as "pending" | "approved" | "invited" | "accepted" | "rejected" | "revoked",
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    invitedAt: application.invitedAt?.toISOString() ?? null,
  };
}


export async function claimInvitedAccess(user: LocalUserForClaim): Promise<PrimaryRole[]> {
  const claimedRoles: PrimaryRole[] = [];
  const email = user.email.trim().toLowerCase();

  await db.transaction(async (tx) => {
    const vendorApplication = (await tx
      .select()
      .from(vendorApplications)
      .where(and(eq(vendorApplications.email, email), eq(vendorApplications.status, "invited"))))[0];

    if (vendorApplication) {
      const claimedAt = new Date();
      const claimed = await tx
        .update(vendorApplications)
        .set({ userId: user.id, status: "accepted", updatedAt: claimedAt })
        .where(and(eq(vendorApplications.id, vendorApplication.id), eq(vendorApplications.status, "invited")))
        .returning();
      if (claimed.length > 0) {
        await tx.insert(vendorProfiles).values({
          userId: user.id,
          businessName: vendorApplication.businessName,
          businessType: vendorApplication.businessType,
          contactName: vendorApplication.contactName,
          phone: vendorApplication.phone,
          email,
          description: vendorApplication.description,
          address: vendorApplication.address,
          city: vendorApplication.city,
          state: vendorApplication.state,
          country: vendorApplication.country,
          status: "approved",
        }).onConflictDoNothing();
        await tx.insert(userRoles).values({ userId: user.id, role: "vendor" }).onConflictDoNothing();
        claimedRoles.push("vendor");
      }
    }

    const adminInvitation = (await tx
      .select()
      .from(adminInvitations)
      .where(and(eq(adminInvitations.email, email), eq(adminInvitations.status, "sent"))))[0];

    if (adminInvitation) {
      const acceptedAt = new Date();
      const accepted = await tx
        .update(adminInvitations)
        .set({ acceptedUserId: user.id, status: "accepted", acceptedAt, updatedAt: acceptedAt })
        .where(and(eq(adminInvitations.id, adminInvitation.id), eq(adminInvitations.status, "sent")))
        .returning();
      if (accepted.length > 0) {
        await tx.insert(userRoles).values({ userId: user.id, role: "admin" }).onConflictDoNothing();
        claimedRoles.push("admin");
      }
    }
  });

  return claimedRoles;
}
