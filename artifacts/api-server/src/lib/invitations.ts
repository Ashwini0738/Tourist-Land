import { clerkClient } from "@clerk/express";
import type { PrimaryRole } from "./roles";

export async function sendClerkInvitation(emailAddress: string, role: PrimaryRole): Promise<string> {
  const invitation = await clerkClient.invitations.createInvitation({
    emailAddress,
    notify: true,
    expiresInDays: 30,
    publicMetadata: { travelLandRole: role },
  });
  return invitation.id;
}

export async function revokeClerkInvitation(invitationId: string): Promise<void> {
  await clerkClient.invitations.revokeInvitation(invitationId);
}
