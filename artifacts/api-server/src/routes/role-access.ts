import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, userRoles, users, vendorProfiles } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireAnyRole,
  requireApprovedVendor,
  requireRole,
} from "../middlewares/authorization";
import {
  findVendorProfile,
  replacePrimaryRole,
  serializeCurrentUser,
  serializeVendorProfile,
} from "../lib/role-data";
import {
  isPrimaryRole,
  isValidEmail,
  normalizeAccountStatus,
  parsePrimaryRole,
  resolvePrimaryRole,
  type PrimaryRole,
} from "../lib/roles";

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

function requiredBodyString(body: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function parseVendorProfileInput(value: unknown) {
  const body = bodyRecord(value);
  if (!body) return null;
  const input = {
    businessName: requiredBodyString(body, "businessName", 200),
    businessType: requiredBodyString(body, "businessType", 100),
    contactName: requiredBodyString(body, "contactName", 200),
    phone: requiredBodyString(body, "phone", 40),
    email: requiredBodyString(body, "email", 320),
    description: requiredBodyString(body, "description", 4000),
    address: requiredBodyString(body, "address", 500),
    city: requiredBodyString(body, "city", 100),
    state: requiredBodyString(body, "state", 100),
    country: requiredBodyString(body, "country", 100),
  };
  return Object.values(input).some((item) => item === null) || !isValidEmail(input.email!)
    ? null
    : input as {
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

roleAccessRouter.get("/v1/vendor/dashboard", requireRole("vendor"), async (req, res) => {
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

roleAccessRouter.post("/v1/vendor/profile", requireAnyRole("user", "vendor"), async (req, res) => {
  const input = parseVendorProfileInput(req.body);
  if (!input) {
    error(res, 400, "INVALID_VENDOR_PROFILE", "Complete every vendor profile field with valid values.");
    return;
  }
  const existing = await findVendorProfile(req.localUser!.id);
  if (existing?.status === "approved" || existing?.status === "suspended") {
    error(res, 409, "VENDOR_PROFILE_LOCKED", "An approved or suspended vendor profile must be managed by an administrator.");
    return;
  }
  const profile = existing
    ? (await db.update(vendorProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(vendorProfiles.id, existing.id))
      .returning())[0]
    : (await db.insert(vendorProfiles)
      .values({ ...input, userId: req.localUser!.id, status: "pending" })
      .returning())[0];
  res.status(existing ? 200 : 201).json(serializeVendorProfile(profile));
});

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

roleAccessRouter.post("/v1/admin/vendors/:userId/approve", requireRole("admin"), (req, res) => updateVendorStatus(req, res, "approved"));
roleAccessRouter.post("/v1/admin/vendors/:userId/suspend", requireRole("admin"), (req, res) => updateVendorStatus(req, res, "suspended"));

export default roleAccessRouter;