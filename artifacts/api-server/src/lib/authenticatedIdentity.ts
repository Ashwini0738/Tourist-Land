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

export const SUPABASE_AUTH_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SupabaseIdentityLinkErrorCode =
  | "SUPABASE_IDENTITY_ALREADY_LINKED"
  | "LOCAL_USER_ALREADY_LINKED";

export class SupabaseIdentityLinkRejectedError extends Error {
  public readonly code: SupabaseIdentityLinkErrorCode;

  constructor(code: SupabaseIdentityLinkErrorCode) {
    super(code === "LOCAL_USER_ALREADY_LINKED"
      ? "The local user already has a Supabase identity."
      : "The Supabase identity is already linked.");
    this.name = "SupabaseIdentityLinkRejectedError";
    this.code = code;
  }
}

export type LinkableLocalUser = {
  id: string;
  authUserId?: string | null;
};

export function assertSupabaseIdentityLinkAvailable(
  localUser: LinkableLocalUser,
  existingIdentityOwner: LinkableLocalUser | null | undefined,
): void {
  if (localUser.authUserId) {
    throw new SupabaseIdentityLinkRejectedError("LOCAL_USER_ALREADY_LINKED");
  }
  if (existingIdentityOwner) {
    throw new SupabaseIdentityLinkRejectedError("SUPABASE_IDENTITY_ALREADY_LINKED");
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