export const AUTH_PROVIDERS = ["clerk"] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export type VerifiedExternalIdentity = {
  provider: AuthProvider;
  externalUserId: string;
  email?: string;
  sessionId?: string;
};

export type AuthenticatedIdentity = VerifiedExternalIdentity & {
  localUserId: string;
};

export class AuthenticationRejectedError extends Error {
  constructor() {
    super("Authentication was rejected.");
    this.name = "AuthenticationRejectedError";
  }
}

export function attachLocalIdentity(
  identity: VerifiedExternalIdentity,
  localUserId: string,
): AuthenticatedIdentity {
  return { ...identity, localUserId };
}