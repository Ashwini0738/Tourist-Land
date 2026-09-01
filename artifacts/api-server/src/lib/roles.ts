export const PRIMARY_ROLES = ["user", "vendor", "admin"] as const;
export type PrimaryRole = (typeof PRIMARY_ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "inactive", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

const ROLE_PRIORITY: Record<PrimaryRole, number> = {
  user: 1,
  vendor: 2,
  admin: 3,
};

export function isPrimaryRole(value: unknown): value is PrimaryRole {
  return typeof value === "string" && PRIMARY_ROLES.includes(value as PrimaryRole);
}

export function parsePrimaryRole(value: unknown): PrimaryRole | null {
  return isPrimaryRole(value) ? value : null;
}

export function roleIsAllowed(role: PrimaryRole, allowedRoles: readonly PrimaryRole[]): boolean {
  return allowedRoles.includes(role);
}

export function ownsResourceOrIsAdmin(
  role: PrimaryRole,
  localUserId: string,
  ownerId: string | null,
): boolean {
  return role === "admin" || (role === "vendor" && ownerId === localUserId);
}

export function resolvePrimaryRole(roles: readonly string[]): PrimaryRole {
  return roles
    .filter(isPrimaryRole)
    .sort((left, right) => ROLE_PRIORITY[right] - ROLE_PRIORITY[left])[0] ?? "user";
}

export function normalizeAccountStatus(value: string): AccountStatus {
  return ACCOUNT_STATUSES.includes(value as AccountStatus) ? (value as AccountStatus) : "inactive";
}

export function configuredAdminClerkUserIds(): Set<string> {
  const variableName =
    process.env.TRAVEL_LAND_AUTH_TARGET === "external-development"
      ? "TRAVEL_LAND_DEV_ADMIN_CLERK_USER_IDS"
      : "TRAVEL_LAND_ADMIN_CLERK_USER_IDS";
  return new Set(
    (process.env[variableName] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
