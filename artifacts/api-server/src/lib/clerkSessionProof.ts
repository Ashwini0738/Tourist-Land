type VerifiedSession = {
  id: string;
  userId: string;
  status: string;
};

type HeaderRequest = {
  get(name: string): string | string[] | undefined;
};

export type ClerkSessionVerifier = {
  verifySession(sessionId: string, token: string): Promise<VerifiedSession>;
};

export class InvalidClerkSessionProofError extends Error {
  constructor() {
    super("A valid Clerk session proof is required.");
    this.name = "InvalidClerkSessionProofError";
  }
}

function header(req: HeaderRequest, name: string): string {
  const value = req.get(name);
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function bearerToken(req: HeaderRequest): string | null {
  const authorization = header(req, "authorization");
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

export async function verifyClerkSessionProof(
  req: HeaderRequest,
  verifier: ClerkSessionVerifier,
): Promise<VerifiedSession> {
  const sessionId = header(req, "x-clerk-session-id");
  const token = bearerToken(req);
  if (!sessionId || !token) throw new InvalidClerkSessionProofError();

  try {
    const session = await verifier.verifySession(sessionId, token);
    if (
      session.id !== sessionId ||
      !session.userId ||
      (session.status !== "pending" && session.status !== "active")
    ) {
      throw new InvalidClerkSessionProofError();
    }
    return session;
  } catch (error) {
    if (error instanceof InvalidClerkSessionProofError) throw error;
    throw new InvalidClerkSessionProofError();
  }
}