import { createClerkClient } from "@clerk/express";

export const EXTERNAL_DEVELOPMENT_AUTH_TARGET = "external-development" as const;
export const REPLIT_MANAGED_AUTH_TARGET = "replit-managed" as const;

export type ClerkAuthTarget =
  | typeof EXTERNAL_DEVELOPMENT_AUTH_TARGET
  | typeof REPLIT_MANAGED_AUTH_TARGET;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required ${name} for ${EXTERNAL_DEVELOPMENT_AUTH_TARGET} authentication.`,
    );
  }
  return value;
}

const configuredTarget = process.env.TRAVEL_LAND_AUTH_TARGET?.trim();

if (
  configuredTarget &&
  configuredTarget !== EXTERNAL_DEVELOPMENT_AUTH_TARGET &&
  configuredTarget !== REPLIT_MANAGED_AUTH_TARGET
) {
  throw new Error(
    `Invalid TRAVEL_LAND_AUTH_TARGET "${configuredTarget}". Expected "${EXTERNAL_DEVELOPMENT_AUTH_TARGET}" or "${REPLIT_MANAGED_AUTH_TARGET}".`,
  );
}

if (process.env.NODE_ENV === "development" && !configuredTarget) {
  throw new Error(
    `TRAVEL_LAND_AUTH_TARGET must be set explicitly in development; refusing to fall back to ${REPLIT_MANAGED_AUTH_TARGET}.`,
  );
}

export const clerkAuthTarget: ClerkAuthTarget =
  configuredTarget === EXTERNAL_DEVELOPMENT_AUTH_TARGET
    ? EXTERNAL_DEVELOPMENT_AUTH_TARGET
    : REPLIT_MANAGED_AUTH_TARGET;

const isExternalDevelopment =
  clerkAuthTarget === EXTERNAL_DEVELOPMENT_AUTH_TARGET;

console.info(`[auth] Clerk target: ${clerkAuthTarget}`);

if (isExternalDevelopment && process.env.NODE_ENV !== "development") {
  throw new Error(
    `${EXTERNAL_DEVELOPMENT_AUTH_TARGET} authentication is only allowed when NODE_ENV=development.`,
  );
}

export const clerkPublishableKey = isExternalDevelopment
  ? requiredEnvironmentVariable("TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY")
  : process.env.CLERK_PUBLISHABLE_KEY?.trim() ?? "";

const clerkSecretKey = isExternalDevelopment
  ? requiredEnvironmentVariable("TRAVEL_LAND_DEV_CLERK_SECRET_KEY")
  : process.env.CLERK_SECRET_KEY?.trim() ?? "";

if (isExternalDevelopment) {
  requiredEnvironmentVariable("TRAVEL_LAND_DEV_ADMIN_CLERK_USER_IDS");
}

export const clerkClient = createClerkClient({
  ...(clerkPublishableKey ? { publishableKey: clerkPublishableKey } : {}),
  ...(clerkSecretKey ? { secretKey: clerkSecretKey } : {}),
});