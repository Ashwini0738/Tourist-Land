export const AUTH_PROVIDERS = ["clerk", "supabase"] as const;

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

export async function resolveMappedSupabaseUser<T extends { id: string }>(
  identity: VerifiedExternalIdentity,
  findByAuthUserId: (authUserId: string) => Promise<T | null | undefined>,
): Promise<T> {
  if (identity.provider !== "supabase") {
    throw new Error("Supabase identity resolution requires a Supabase identity.");
  }
  const localUser = await findByAuthUserId(identity.externalUserId);
  if (!localUser) throw new AuthenticationRejectedError();
  return localUser;
}