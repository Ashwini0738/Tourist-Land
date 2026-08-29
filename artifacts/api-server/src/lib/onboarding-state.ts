export function vendorApprovalAction(status: string, hasInvitation: boolean): "send-invitation" | "already-invited" | null {
  if (status === "pending") return "send-invitation";
  if (status === "invited" && hasInvitation) return "already-invited";
  return null;
}

export function vendorRejectionStatus(status: string, hasInvitation: boolean): "rejected" | "revoked" | null {
  if (["accepted", "rejected", "revoked"].includes(status)) return null;
  return hasInvitation ? "revoked" : "rejected";
}

export function shouldClaimInvitedAccess(status: string): boolean {
  return status === "invited";
}
