import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, adminInvitations, hotels, userRoles, users, vendorApplications, vendorProfiles } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireAnyRole,
  requireApprovedVendor,
  requireOwnerOrAdmin,
  requireRole,
} from "../middlewares/authorization";
import {
  findVendorProfile,
  replacePrimaryRole,
  serializeCurrentUser,
  serializeVendorProfile,
} from "../lib/role-data";
import {
  isValidEmail,
  normalizeAccountStatus,
  parsePrimaryRole,
  resolvePrimaryRole,
  type PrimaryRole,
} from "../lib/roles";
import {
  normalizeEmail,
  serializeVendorApplication,
  VENDOR_ACCESS_ROLES,
  vendorApprovalAction,
  vendorRejectionStatus,
} from "../lib/onboarding";
import {
  findClerkUserByEmail,
  isClerkEmailTakenError,
  revokeClerkInvitation,
  sendClerkInvitation,
  summarizeClerkError,
} from "../lib/invitations";
import { sendVendorApprovalEmail } from "../lib/email";
import { logger } from "../lib/logger";

const roleAccessRouter: IRouter = Router();
roleAccessRouter.use(requireAuth);

function error(res: Parameters<Parameters<IRouter["get"]>[1]>[1], status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function bodyRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function pathValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

type ListingInput = {
  name: string;
  description: string | null;
  address: string;
  destinationId: string | null;
};

function parseListingInput(value: unknown, partial = false): ListingInput | Partial<ListingInput> | null {
  const body = bodyRecord(value);
  if (!body) return null;
  const parsed: Partial<ListingInput> = {};
  for (const field of ["name", "address"] as const) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || body[field].trim().length === 0 || body[field].length > (field === "name" ? 200 : 500)) return null;
      parsed[field] = body[field].trim();
    }
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.length > 4000)) return null;
    parsed.description = body.description === null ? null : body.description.trim();
  }
  if (body.destinationId !== undefined) {
    if (body.destinationId !== null && (typeof body.destinationId !== "string" || body.destinationId.length > 100)) return null;
    parsed.destinationId = body.destinationId;
  }
  if (!partial && (!parsed.name || !parsed.address || !("description" in parsed) || !("destinationId" in parsed))) return null;
  if (partial && Object.keys(parsed).length === 0) return null;
  return partial ? parsed : parsed as ListingInput;
}

function serializeListing(listing: typeof hotels.$inferSelect) {
  return {
    id: listing.id,
    ownerId: listing.ownerId,
    name: listing.name,
    description: listing.description,
    address: listing.address,
    destinationId: listing.destinationId,
    status: listing.status as "draft" | "published" | "archived" | "pending",
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

async function resolveListingOwnerId(req: Request): Promise<string | null> {
  const listing = await db.query.hotels.findFirst({
    where: eq(hotels.id, pathValue(req.params.id)),
  });
  return listing?.ownerId ?? null;
}

async function serializeUserById(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;
  const roles = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id));
  return serializeCurrentUser(
    {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: normalizeAccountStatus(user.status),
      role: resolvePrimaryRole(roles.map((row) => row.role)),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    await findVendorProfile(user.id),
  );
}

roleAccessRouter.get("/v1/vendor/dashboard", requireRole("vendor", "admin"), async (req, res) => {
  if (!(await requireApprovedVendor(req, res))) return;
  res.json({
    role: "vendor",
    status: req.localUser!.status,
    title: "Vendor dashboard",
    message: "Your approved vendor workspace is ready for listings, bookings, enquiries, and reviews.",
  });
});

roleAccessRouter.get("/v1/vendor/profile", requireAnyRole("vendor", "admin"), async (req, res) => {
  const profile = await findVendorProfile(req.localUser!.id);
  if (!profile) {
    error(res, 404, "VENDOR_PROFILE_NOT_FOUND", "A vendor profile has not been submitted.");
    return;
  }
  res.json(serializeVendorProfile(profile));
});

roleAccessRouter.get("/v1/vendor/listings", requireRole("vendor", "admin"), async (req, res) => {
  if (!(await requireApprovedVendor(req, res))) return;
  const listings = req.localUser!.role === "admin"
    ? await db.select().from(hotels).orderBy(desc(hotels.updatedAt))
    : await db.select().from(hotels).where(eq(hotels.ownerId, req.localUser!.id)).orderBy(desc(hotels.updatedAt));
  res.json({ items: listings.map(serializeListing) });
});

roleAccessRouter.post("/v1/vendor/listings", requireRole("vendor"), async (req, res) => {
  if (!(await requireApprovedVendor(req, res))) return;
  const input = parseListingInput(req.body);
  if (!input || !("name" in input) || !("address" in input) || !("description" in input) || !("destinationId" in input)) {
    error(res, 400, "INVALID_LISTING", "Name, description, address, and destination are required.");
    return;
  }
  const listingInput = input as ListingInput;
  const listing = (await db.insert(hotels).values({
    ownerId: req.localUser!.id,
    name: listingInput.name,
    description: listingInput.description,
    address: listingInput.address,
    destinationId: listingInput.destinationId,
    status: "draft",
  }).returning())[0];
  res.status(201).json(serializeListing(listing));
});

async function updateListingStatus(
  req: Parameters<Parameters<IRouter["post"]>[1]>[0],
  res: Parameters<Parameters<IRouter["post"]>[1]>[1],
  status: "published" | "archived",
): Promise<void> {
  if (!(await requireApprovedVendor(req, res))) return;
  const listingId = pathValue(req.params.id);
  const listing = await db.query.hotels.findFirst({
    where: and(eq(hotels.id, listingId), eq(hotels.ownerId, req.localUser!.id)),
  });
  if (!listing) {
    error(res, 404, "LISTING_NOT_FOUND", "Listing not found.");
    return;
  }
  if (status === "published" && !["draft", "pending"].includes(listing.status)) {
    error(res, 409, "LISTING_STATE_INVALID", "Only draft listings can be published.");
    return;
  }
  if (status === "archived" && listing.status === "archived") {
    error(res, 409, "LISTING_STATE_INVALID", "This listing is already archived.");
    return;
  }
  const updated = (await db.update(hotels)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(hotels.id, listing.id), eq(hotels.ownerId, req.localUser!.id)))
    .returning())[0];
  res.json(serializeListing(updated));
}

roleAccessRouter.patch("/v1/vendor/listings/:id", requireRole("vendor"), requireOwnerOrAdmin(resolveListingOwnerId), async (req, res) => {
  if (!(await requireApprovedVendor(req, res))) return;
  const listingId = pathValue(req.params.id);
  const input = parseListingInput(req.body, true);
  if (!input) {
    error(res, 400, "INVALID_LISTING", "Provide at least one valid listing field.");
    return;
  }
  const listing = await db.query.hotels.findFirst({
    where: and(eq(hotels.id, listingId), eq(hotels.ownerId, req.localUser!.id)),
  });
  if (!listing) {
    error(res, 404, "LISTING_NOT_FOUND", "Listing not found.");
    return;
  }
  if (listing.status === "archived") {
    error(res, 409, "LISTING_STATE_INVALID", "Archived listings cannot be edited.");
    return;
  }
  const updated = (await db.update(hotels)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(hotels.id, listing.id), eq(hotels.ownerId, req.localUser!.id)))
    .returning())[0];
  res.json(serializeListing(updated));
});

roleAccessRouter.post("/v1/vendor/listings/:id/publish", requireRole("vendor"), requireOwnerOrAdmin(resolveListingOwnerId), (req, res) => updateListingStatus(req, res, "published"));
roleAccessRouter.post("/v1/vendor/listings/:id/archive", requireRole("vendor"), requireOwnerOrAdmin(resolveListingOwnerId), (req, res) => updateListingStatus(req, res, "archived"));

roleAccessRouter.get("/v1/admin/dashboard", requireRole("admin"), (_req, res) => {
  res.json({
    role: "admin",
    status: "active",
    title: "Admin dashboard",
    message: "Platform administration is ready for users, vendors, content, and settings modules.",
  });
});

roleAccessRouter.get("/v1/admin/users", requireRole("admin"), async (_req, res) => {
  const localUsers = await db.select().from(users);
  const items = await Promise.all(localUsers.map((user) => serializeUserById(user.id)));
  res.json({ items: items.filter((item): item is NonNullable<typeof item> => item !== null) });
});

roleAccessRouter.get("/v1/admin/vendor-listings", requireRole("admin"), async (_req, res) => {
  const listings = await db
    .select({
      listing: hotels,
      ownerName: users.displayName,
      ownerEmail: users.email,
    })
    .from(hotels)
    .leftJoin(users, eq(hotels.ownerId, users.id))
    .where(inArray(hotels.ownerId, db.select({ id: vendorProfiles.userId }).from(vendorProfiles)))
    .orderBy(desc(hotels.updatedAt));
  res.json({
    items: listings.map(({ listing, ownerName, ownerEmail }) => ({
      ...serializeListing(listing),
      ownerName,
      ownerEmail: ownerEmail ?? "",
    })),
  });
});

roleAccessRouter.get("/v1/admin/vendor-applications", requireRole("admin"), async (_req, res) => {
  const applications = await db
    .select()
    .from(vendorApplications)
    .where(eq(vendorApplications.status, "pending"));
  res.json({ items: applications.map((application) => serializeVendorApplication(application)) });
});

function parseEmailBody(value: unknown): string | null {
  const body = bodyRecord(value);
  const email = body?.email;
  if (typeof email !== "string") return null;
  const normalized = normalizeEmail(email);
  return isValidEmail(normalized) ? normalized : null;
}

roleAccessRouter.post("/v1/admin/invitations/admin", requireRole("admin"), async (req, res) => {
  const email = parseEmailBody(req.body);
  if (!email) {
    error(res, 400, "INVALID_EMAIL", "Enter a valid email address for the administrator invitation.");
    return;
  }
  const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existingUser) {
    error(res, 409, "ACCOUNT_ALREADY_EXISTS", "This email already has an account. Invite a new email address.");
    return;
  }
  const existingInvite = (await db
    .select()
    .from(adminInvitations)
    .where(eq(adminInvitations.email, email)))
    .find((invite) => invite.status === "pending" || invite.status === "sent");
  if (existingInvite) {
    error(res, 409, "INVITATION_ALREADY_EXISTS", "An active administrator invitation already exists for this email.");
    return;
  }
  const record = (await db.insert(adminInvitations).values({
    email,
    invitedBy: req.localUser!.id,
    status: "pending",
  }).returning())[0];
  let clerkInvitationId: string;
  try {
    clerkInvitationId = await sendClerkInvitation(email, "admin");
  } catch {
    await db.update(adminInvitations).set({ status: "revoked", updatedAt: new Date() }).where(eq(adminInvitations.id, record.id));
    error(res, 503, "INVITATION_UNAVAILABLE", "The invitation could not be sent. Please try again.");
    return;
  }
  const sent = (await db.update(adminInvitations)
    .set({ status: "sent", clerkInvitationId, invitedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(adminInvitations.id, record.id), eq(adminInvitations.status, "pending")))
    .returning())[0];
  res.status(201).json({
    id: sent.id,
    email: sent.email,
    role: "admin",
    status: sent.status,
    message: "Invitation sent. The recipient must create their own Clerk credentials.",
  });
});

roleAccessRouter.get("/v1/admin/invitations", requireRole("admin"), async (_req, res) => {
  const invitations = await db.select().from(adminInvitations);
  res.json({
    items: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: "admin" as const,
      status: invitation.status as "pending" | "sent" | "accepted" | "revoked",
      invitedAt: invitation.invitedAt?.toISOString() ?? null,
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    })),
  });
});

async function completeExistingVendorApproval(
  application: typeof vendorApplications.$inferSelect,
  identity: {
    clerkUserId: string;
    localUserId?: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
  },
  reviewedBy: string,
): Promise<typeof vendorApplications.$inferSelect> {
  const expectedStatus = application.status === "approved" ? "approved" : "pending";
  return db.transaction(async (tx) => {
    const localById = identity.localUserId
      ? (await tx.select().from(users).where(eq(users.id, identity.localUserId)))[0]
      : undefined;
    const localByClerkId = localById ?? (await tx
      .select()
      .from(users)
      .where(eq(users.clerkUserId, identity.clerkUserId)))[0];
    const localByEmail = localById ?? (await tx
      .select()
      .from(users)
      .where(eq(users.email, application.email)))[0];

    if (localByEmail && localByEmail.clerkUserId !== identity.clerkUserId) {
      throw new Error("A different local account already owns the vendor application email.");
    }

    const local = localByClerkId ?? localByEmail ?? (await tx.insert(users).values({
      clerkUserId: identity.clerkUserId,
      email: application.email,
      displayName: [identity.firstName, identity.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: identity.imageUrl || null,
    }).returning())[0];

    if (!local) throw new Error("Local user provisioning did not complete.");

    await tx.insert(userRoles)
      .values(VENDOR_ACCESS_ROLES.map((role) => ({ userId: local.id, role })))
      .onConflictDoNothing();
    await tx.insert(vendorProfiles)
      .values({
        userId: local.id,
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
        status: "approved",
      })
      .onConflictDoUpdate({
        target: vendorProfiles.userId,
        set: {
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
          status: "approved",
          updatedAt: new Date(),
        },
      });

    const accepted = (await tx.update(vendorApplications)
      .set({
        status: "accepted",
        userId: local.id,
        reviewedBy,
        reviewedAt: new Date(),
        invitedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(vendorApplications.id, application.id), eq(vendorApplications.status, expectedStatus)))
      .returning())[0];

    if (!accepted) throw new Error("This application was already reviewed.");
    return accepted;
  });
}

async function notifyVendorApproval(
  application: typeof vendorApplications.$inferSelect,
  hasClerkInvitation: boolean,
): Promise<"sent" | "failed"> {
  try {
    await sendVendorApprovalEmail({
      to: application.email,
      businessName: application.businessName,
      hasClerkInvitation,
    });
    logger.info({ applicationId: application.id }, "Vendor approval email sent");
    return "sent";
  } catch (emailError) {
    logger.error({ applicationId: application.id, emailError }, "Vendor approval completed but email delivery failed");
    return "failed";
  }
}

roleAccessRouter.post("/v1/admin/vendor-applications/:id/approve", requireRole("admin"), async (req, res) => {
  const applicationId = pathValue(req.params.id);
  const application = await db.query.vendorApplications.findFirst({ where: eq(vendorApplications.id, applicationId) });
  if (!application) {
    error(res, 404, "APPLICATION_NOT_FOUND", "Vendor application not found.");
    return;
  }
  const approvalAction = vendorApprovalAction(application.status, Boolean(application.clerkInvitationId));
  if (approvalAction === "already-invited") {
    res.json(serializeVendorApplication(application));
    return;
  }
  if (approvalAction !== "send-invitation") {
    error(res, 409, "APPLICATION_STATE_INVALID", "Only pending vendor applications can be approved.");
    return;
  }
  const existingLocalUser = await db.query.users.findFirst({
    where: eq(users.email, application.email),
  });
  if (existingLocalUser) {
    try {
      const accepted = await completeExistingVendorApproval(application, {
        clerkUserId: existingLocalUser.clerkUserId,
        localUserId: existingLocalUser.id,
      }, req.localUser!.id);
      const approvalEmailStatus = await notifyVendorApproval(accepted, false);
      res.json(serializeVendorApplication(accepted, approvalEmailStatus));
    } catch (approvalError) {
      logger.error(
        { applicationId, localUserId: existingLocalUser.id, approvalError },
        "Unable to grant vendor access to an existing local account",
      );
      error(res, 503, "VENDOR_APPROVAL_UNAVAILABLE", "The vendor account could not be activated. Please try again.");
    }
    return;
  }
  let existingClerkUser;
  try {
    existingClerkUser = await findClerkUserByEmail(application.email);
  } catch (clerkError) {
    logger.error(
      { applicationId, clerkError: summarizeClerkError(clerkError) },
      "Unable to check whether a vendor applicant already has a Clerk account",
    );
    error(res, 503, "CLERK_UNAVAILABLE", "Clerk is temporarily unavailable. Please try again.");
    return;
  }
  if (existingClerkUser) {
    try {
      const accepted = await completeExistingVendorApproval(application, {
        clerkUserId: existingClerkUser.id,
        firstName: existingClerkUser.firstName,
        lastName: existingClerkUser.lastName,
        imageUrl: existingClerkUser.imageUrl,
      }, req.localUser!.id);
      const approvalEmailStatus = await notifyVendorApproval(accepted, false);
      res.json(serializeVendorApplication(accepted, approvalEmailStatus));
    } catch (approvalError) {
      logger.error(
        { applicationId, clerkUserId: existingClerkUser.id, approvalError },
        "Unable to attach an existing Clerk account to a vendor application",
      );
      error(res, 503, "VENDOR_APPROVAL_UNAVAILABLE", "The vendor account could not be activated. Please try again.");
    }
    return;
  }
  const approved = (await db.update(vendorApplications)
    .set({ status: "approved", reviewedBy: req.localUser!.id, reviewedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vendorApplications.id, application.id), eq(vendorApplications.status, "pending")))
    .returning())[0];
  if (!approved) {
    error(res, 409, "APPLICATION_STATE_INVALID", "This application was already reviewed.");
    return;
  }
  let clerkInvitationId: string;
  try {
    clerkInvitationId = await sendClerkInvitation(approved.email, "vendor");
  } catch (clerkError) {
    logger.error(
      { applicationId, clerkError: summarizeClerkError(clerkError) },
      "Unable to send Clerk invitation for vendor application",
    );
    if (isClerkEmailTakenError(clerkError)) {
      try {
        const existingUser = await findClerkUserByEmail(approved.email);
        if (existingUser) {
          const accepted = await completeExistingVendorApproval(approved, {
            clerkUserId: existingUser.id,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            imageUrl: existingUser.imageUrl,
          }, req.localUser!.id);
          const approvalEmailStatus = await notifyVendorApproval(accepted, false);
          res.json(serializeVendorApplication(accepted, approvalEmailStatus));
          return;
        }
      } catch (lookupError) {
        logger.error(
          { applicationId, clerkError: summarizeClerkError(lookupError) },
          "Unable to resolve the existing Clerk account for a vendor application",
        );
      }
      await db.update(vendorApplications)
        .set({ status: "pending", reviewedBy: null, reviewedAt: null, updatedAt: new Date() })
        .where(eq(vendorApplications.id, approved.id));
      error(res, 409, "ACCOUNT_ALREADY_EXISTS", "This applicant already has a Clerk account. Ask them to sign in and try again.");
      return;
    }
    await db.update(vendorApplications)
      .set({ status: "pending", reviewedBy: null, reviewedAt: null, updatedAt: new Date() })
      .where(eq(vendorApplications.id, approved.id));
    error(res, 503, "INVITATION_UNAVAILABLE", "The application could not be approved because its invitation could not be sent. Please try again.");
    return;
  }
  const invited = (await db.update(vendorApplications)
    .set({ status: "invited", clerkInvitationId, invitedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vendorApplications.id, approved.id), eq(vendorApplications.status, "approved")))
    .returning())[0];
  const approvalEmailStatus = await notifyVendorApproval(invited, true);
  res.json(serializeVendorApplication(invited, approvalEmailStatus));
});

roleAccessRouter.post("/v1/admin/vendor-applications/:id/reject", requireRole("admin"), async (req, res) => {
  const applicationId = pathValue(req.params.id);
  const application = await db.query.vendorApplications.findFirst({ where: eq(vendorApplications.id, applicationId) });
  if (!application) {
    error(res, 404, "APPLICATION_NOT_FOUND", "Vendor application not found.");
    return;
  }
  const nextStatus = vendorRejectionStatus(application.status, Boolean(application.clerkInvitationId));
  if (!nextStatus) {
    error(res, 409, "APPLICATION_STATE_INVALID", "This application cannot be rejected in its current state.");
    return;
  }
  const updated = (await db.update(vendorApplications)
    .set({ status: nextStatus, reviewedBy: req.localUser!.id, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(vendorApplications.id, application.id))
    .returning())[0];
  if (application.clerkInvitationId) {
    try {
      await revokeClerkInvitation(application.clerkInvitationId);
    } catch {
      // The local revoked state remains authoritative, so the invitation cannot grant application access.
    }
  }
  res.json(serializeVendorApplication(updated));
});

roleAccessRouter.put("/v1/admin/users/:id/role", requireRole("admin"), async (req, res) => {
  const role = parsePrimaryRole(bodyRecord(req.body)?.role);
  if (!role) {
    error(res, 400, "INVALID_ROLE", "Role must be one of user, vendor, or admin.");
    return;
  }
  const targetId = pathValue(req.params.id);
  if (targetId === req.localUser!.id && role !== "admin") {
    error(res, 409, "SELF_ROLE_CHANGE_FORBIDDEN", "An administrator cannot remove their own admin access.");
    return;
  }
  const target = await db.query.users.findFirst({ where: eq(users.id, targetId) });
  if (!target) {
    error(res, 404, "USER_NOT_FOUND", "User not found.");
    return;
  }
  const profile = await findVendorProfile(target.id);
  if (role === "vendor" && profile?.status !== "approved") {
    error(res, 409, "VENDOR_APPROVAL_REQUIRED", "Only an approved vendor profile can receive vendor access.");
    return;
  }
  await replacePrimaryRole(target.id, role);
  const safeUser = await serializeUserById(target.id);
  res.json(safeUser);
});

async function updateVendorStatus(req: Parameters<Parameters<IRouter["post"]>[1]>[0], res: Parameters<Parameters<IRouter["post"]>[1]>[1], status: "approved" | "suspended"): Promise<void> {
  const targetUserId = pathValue(req.params.userId);
  const profile = await db.query.vendorProfiles.findFirst({
    where: eq(vendorProfiles.userId, targetUserId),
  });
  if (!profile) {
    error(res, 404, "VENDOR_PROFILE_NOT_FOUND", "Vendor profile not found.");
    return;
  }
  if (status === "approved" && profile.status !== "pending") {
    error(res, 409, "VENDOR_PROFILE_STATE_INVALID", "Only pending vendor profiles can be approved.");
    return;
  }
  if (status === "suspended" && profile.status !== "approved") {
    error(res, 409, "VENDOR_PROFILE_STATE_INVALID", "Only approved vendor profiles can be suspended.");
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const result = (await tx.update(vendorProfiles)
      .set({ status, updatedAt: new Date() })
      .where(eq(vendorProfiles.id, profile.id))
      .returning())[0];
    await tx.delete(userRoles).where(eq(userRoles.userId, profile.userId));
    await tx.insert(userRoles).values({ userId: profile.userId, role: status === "approved" ? "vendor" : "user" });
    return result;
  });
  res.json(serializeVendorProfile(updated));
}

roleAccessRouter.post("/v1/admin/vendors/:userId/suspend", requireRole("admin"), (req, res) => updateVendorStatus(req, res, "suspended"));

export default roleAccessRouter;