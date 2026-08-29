import { clerkClient } from "@clerk/express";
import type { PrimaryRole } from "./roles";

export type ExistingClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
};

export async function sendClerkInvitation(emailAddress: string, role: PrimaryRole): Promise<string> {
  const invitation = await clerkClient.invitations.createInvitation({
    emailAddress,
    notify: true,
    expiresInDays: 30,
    publicMetadata: { travelLandRole: role },
  });
  return invitation.id;
}

export async function findClerkUserByEmail(emailAddress: string): Promise<ExistingClerkUser | null> {
  const users = await clerkClient.users.getUserList({
    emailAddress: [emailAddress],
    limit: 1,
  });
  const user = users.data[0];
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  };
}

export function isClerkEmailTakenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const errors = (error as { errors?: unknown }).errors;
  return Array.isArray(errors) && errors.some((entry) => (
    entry
    && typeof entry === "object"
    && (entry as { code?: unknown }).code === "form_identifier_exists"
    && (entry as { meta?: { paramName?: unknown } }).meta?.paramName === "email_address"
  ));
}

export function summarizeClerkError(error: unknown): {
  name?: string;
  status?: number;
  clerkTraceId?: string;
  codes: string[];
} {
  if (!error || typeof error !== "object") return { codes: [] };
  const candidate = error as {
    name?: unknown;
    status?: unknown;
    clerkTraceId?: unknown;
    errors?: unknown;
  };
  const codes = Array.isArray(candidate.errors)
    ? candidate.errors
      .filter((entry): entry is { code?: unknown } => Boolean(entry) && typeof entry === "object")
      .map((entry) => entry.code)
      .filter((code): code is string => typeof code === "string")
    : [];
  return {
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    clerkTraceId: typeof candidate.clerkTraceId === "string" ? candidate.clerkTraceId : undefined,
    codes,
  };
}

export async function revokeClerkInvitation(invitationId: string): Promise<void> {
  await clerkClient.invitations.revokeInvitation(invitationId);
}
