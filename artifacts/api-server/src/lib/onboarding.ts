import { and, eq } from "drizzle-orm";
import { db, adminInvitations, userRoles, vendorApplications, vendorProfiles } from "@workspace/db";
import { isValidEmail, type PrimaryRole } from "./roles";
export {
  shouldClaimInvitedAccess,
  vendorApprovalAction,
  vendorRejectionStatus,
} from "./onboarding-state";

type LocalUserForClaim = {
  id: string;
  email: string;
};

export type VendorApplicationInput = {
  businessName: string;
  businessType: string;
  contactName: string;
  phone: string;
  email: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function requiredString(body: Record<string, unknown>, key: keyof VendorApplicationInput, maxLength: number): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export function parseVendorApplicationInput(value: unknown): VendorApplicationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const input = {
    businessName: requiredString(body, "businessName", 200),
    businessType: requiredString(body, "businessType", 100),
    contactName: requiredString(body, "contactName", 200),
    phone: requiredString(body, "phone", 40),
    email: requiredString(body, "email", 320),
    description: requiredString(body, "description", 4000),
    address: requiredString(body, "address", 500),
    city: requiredString(body, "city", 100),
    state: requiredString(body, "state", 100),
    country: requiredString(body, "country", 100),
  };
  if (Object.values(input).some((item) => item === null) || !isValidEmail(input.email!)) return null;
  return { ...input, email: normalizeEmail(input.email!) } as VendorApplicationInput;
}

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
