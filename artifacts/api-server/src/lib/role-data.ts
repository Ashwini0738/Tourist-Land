import { db, userRoles, vendorProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { LocalUser } from "../middlewares/authorization";
import type { PrimaryRole } from "./roles";

export type VendorProfileRecord = typeof vendorProfiles.$inferSelect;

export async function findVendorProfile(userId: string): Promise<VendorProfileRecord | null> {
  return (await db.query.vendorProfiles.findFirst({
    where: eq(vendorProfiles.userId, userId),
  })) ?? null;
}

export function serializeVendorProfile(profile: VendorProfileRecord) {
  return {
    id: profile.id,
    userId: profile.userId,
    businessName: profile.businessName,
    businessType: profile.businessType,
    contactName: profile.contactName,
    phone: profile.phone,
    email: profile.email,
    description: profile.description,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    status: profile.status as "pending" | "approved" | "rejected" | "suspended",
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeCurrentUser(user: LocalUser, vendorProfile: VendorProfileRecord | null) {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    vendorProfile: vendorProfile ? serializeVendorProfile(vendorProfile) : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function replacePrimaryRole(userId: string, role: PrimaryRole): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    await tx.insert(userRoles).values({ userId, role });
  });
}
