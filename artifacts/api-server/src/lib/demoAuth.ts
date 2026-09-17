import { timingSafeEqual } from "node:crypto";
import {
  DEFAULT_CLIENT_ORGANIZATION,
  ensureDefaultClientOrganizationMembership,
  type OrganizationProvisioner,
} from "./clerkOrganization.ts";

const DEMO_EXTERNAL_ID = "travel-land-development-demo";
const DEMO_DISPLAY_NAME = {
  firstName: "Travel & Land",
  lastName: "Demo",
} as const;

export class DemoAuthUnavailableError extends Error {
  constructor(message = "Demo authentication is unavailable.") {
    super(message);
    this.name = "DemoAuthUnavailableError";
  }
}

export class InvalidDemoOtpError extends Error {
  constructor() {
    super("The demo verification code is invalid.");
    this.name = "InvalidDemoOtpError";
  }
}

export function demoAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const buildEnvironment = env.TRAVEL_LAND_BUILD_ENV?.trim().toLowerCase();
  const easProfile = env.EAS_BUILD_PROFILE?.trim().toLowerCase();
  return (
    env.NODE_ENV === "development" &&
    env.TRAVEL_LAND_DEMO_AUTH_ENABLED === "true" &&
    buildEnvironment !== "production" &&
    buildEnvironment !== "release" &&
    easProfile !== "production"
  );
}

export function demoAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  if (!demoAuthEnabled(env)) throw new DemoAuthUnavailableError();
  const email = env.TRAVEL_LAND_DEMO_EMAIL?.trim().toLowerCase();
  const otp = env.TRAVEL_LAND_DEMO_OTP?.trim();
  if (!email || !otp) throw new DemoAuthUnavailableError();
  return { email, otp };
}

export function verifyDemoOtp(
  suppliedOtp: string,
  env: NodeJS.ProcessEnv = process.env,
): { email: string } {
  const config = demoAuthConfig(env);
  const supplied = Buffer.from(suppliedOtp);
  const expected = Buffer.from(config.otp);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new InvalidDemoOtpError();
  }
  return { email: config.email };
}

type DemoUser = {
  id: string;
  externalId?: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
};

export type DemoClerkClient = {
  users: {
    getUserList(params: {
      emailAddress: string[];
      limit: number;
    }): Promise<{ data: DemoUser[] }>;
    createUser(params: {
      externalId: string;
      emailAddress: string[];
      firstName: string;
      lastName: string;
      skipPasswordRequirement: boolean;
    }): Promise<DemoUser>;
  };
  organizations: OrganizationProvisioner;
  signInTokens: {
    createSignInToken(params: {
      userId: string;
      orgId: string;
      expiresInSeconds: number;
    }): Promise<{ token: string }>;
  };
};

async function getOrCreateDemoUser(
  email: string,
  client: DemoClerkClient,
): Promise<DemoUser> {
  const users = await client.users.getUserList({
    emailAddress: [email],
    limit: 10,
  });
  const existing = users.data.find((user) =>
    user.emailAddresses.some(
      (address) => address.emailAddress.trim().toLowerCase() === email,
    ),
  );
  if (existing) {
    if (existing.externalId !== DEMO_EXTERNAL_ID) {
      throw new DemoAuthUnavailableError();
    }
    return existing;
  }

  try {
    return await client.users.createUser({
      externalId: DEMO_EXTERNAL_ID,
      emailAddress: [email],
      ...DEMO_DISPLAY_NAME,
      skipPasswordRequirement: true,
    });
  } catch (error) {
    const raced = await client.users.getUserList({
      emailAddress: [email],
      limit: 10,
    });
    const racedUser = raced.data.find(
      (user) =>
        user.externalId === DEMO_EXTERNAL_ID &&
        user.emailAddresses.some(
          (address) => address.emailAddress.trim().toLowerCase() === email,
        ),
    );
    if (racedUser) return racedUser;
    throw error;
  }
}

export async function createDemoSignIn(
  suppliedOtp: string,
  client: DemoClerkClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ email: string; ticket: string; organizationId: string; userId: string }> {
  const { email } = verifyDemoOtp(suppliedOtp, env);
  const user = await getOrCreateDemoUser(email, client);
  const { organizationId } = await ensureDefaultClientOrganizationMembership(
    user.id,
    client.organizations,
  );
  const signInToken = await client.signInTokens.createSignInToken({
    userId: user.id,
    orgId: organizationId,
    expiresInSeconds: 60,
  });
  return {
    email,
    ticket: signInToken.token,
    organizationId,
    userId: user.id,
  };
}

export { DEFAULT_CLIENT_ORGANIZATION };