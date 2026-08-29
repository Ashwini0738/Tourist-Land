import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, users, vendorApplications } from "@workspace/db";
import { normalizeEmail, validateVendorApplicationInput } from "../lib/onboarding";

const onboardingRouter: IRouter = Router();

function error(
  res: Parameters<Parameters<IRouter["post"]>[1]>[1],
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): void {
  res.status(status).json({ error: { code, message, ...(fieldErrors && { fieldErrors }) } });
}

onboardingRouter.post("/v1/vendor/applications", async (req, res) => {
  const validation = validateVendorApplicationInput(req.body);
  if (!validation.input) {
    error(res, 400, "INVALID_VENDOR_APPLICATION", "Please fix the highlighted fields before submitting.", validation.fieldErrors);
    return;
  }
  const input = validation.input;
  const existingUser = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existingUser) {
    error(res, 409, "ACCOUNT_ALREADY_EXISTS", "This email already has an account. Please sign in instead or use a different email.", {
      email: "This email already has an account. Sign in instead or use a different email.",
    });
    return;
  }
  const existing = await db.query.vendorApplications.findFirst({
    where: eq(vendorApplications.email, normalizeEmail(input.email)),
  });
  if (existing && ["pending", "approved", "invited", "accepted"].includes(existing.status)) {
    error(res, 409, "APPLICATION_ALREADY_EXISTS", "An application for this email is already being processed. Use your existing application reference to check its status.", {
      email: "An application already exists for this email. Use your existing application reference to check its status.",
    });
    return;
  }
  const application = existing
    ? (await db.update(vendorApplications)
      .set({
        ...input,
        status: "pending",
        userId: null,
        clerkInvitationId: null,
        reviewedBy: null,
        reviewedAt: null,
        invitedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(vendorApplications.id, existing.id), eq(vendorApplications.status, existing.status)))
      .returning())[0]
    : (await db.insert(vendorApplications).values({ ...input, status: "pending" }).returning())[0];
  res.status(existing ? 200 : 201).json({
    id: application.id,
    email: application.email,
    status: application.status,
    message: "Application received. An administrator will review it before account access is created.",
  });
});

onboardingRouter.get("/v1/vendor/applications/status", async (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const email = typeof req.query.email === "string" ? normalizeEmail(req.query.email) : "";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id) || !email) {
    error(res, 400, "INVALID_STATUS_LOOKUP", "Provide the application reference and the email used to apply.");
    return;
  }
  const application = await db.query.vendorApplications.findFirst({
    where: and(eq(vendorApplications.id, id), eq(vendorApplications.email, email)),
  });
  if (!application) {
    error(res, 404, "APPLICATION_NOT_FOUND", "No application matches that reference and email.");
    return;
  }
  const messages = {
    pending: "Your application is waiting for administrator review.",
    approved: "Your application was approved and your invitation is being prepared.",
    invited: "Your application was approved. Check your email for the secure Clerk invitation.",
    accepted: "Your invitation was accepted. Sign in with the Clerk account you created.",
    rejected: "This application was not approved. You may submit a new application with updated details.",
    revoked: "This invitation is no longer active. Contact the platform team if you need help.",
  } as const;
  res.json({ id: application.id, status: application.status, message: messages[application.status as keyof typeof messages] ?? messages.pending });
});

export default onboardingRouter;
