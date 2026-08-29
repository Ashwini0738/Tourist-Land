import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldClaimInvitedAccess,
  vendorApprovalAction,
  vendorRejectionStatus,
} from "./onboarding-state.ts";
import { validateVendorApplicationInput } from "./onboarding-validation.ts";

test("only pending applications can send the first invitation", () => {
  assert.equal(vendorApprovalAction("pending", false), "send-invitation");
  assert.equal(vendorApprovalAction("approved", false), null);
  assert.equal(vendorApprovalAction("accepted", false), null);
});

test("repeated approval is idempotent once an invitation exists", () => {
  assert.equal(vendorApprovalAction("invited", true), "already-invited");
  assert.equal(vendorApprovalAction("invited", false), null);
});

test("rejection protects both uninvited and invited applications", () => {
  assert.equal(vendorRejectionStatus("pending", false), "rejected");
  assert.equal(vendorRejectionStatus("invited", true), "revoked");
  assert.equal(vendorRejectionStatus("accepted", true), null);
});

test("only an invited application can claim vendor access after signup", () => {
  assert.equal(shouldClaimInvitedAccess("pending"), false);
  assert.equal(shouldClaimInvitedAccess("rejected"), false);
  assert.equal(shouldClaimInvitedAccess("invited"), true);
});

test("vendor application validation reports every invalid field", () => {
  const result = validateVendorApplicationInput({ email: "not-an-email", businessName: " " });
  assert.equal(result.input, null);
  assert.equal(result.fieldErrors.businessName, "Business name is required.");
  assert.equal(result.fieldErrors.email, "Enter a valid email address, such as you@business.com.");
  assert.equal(result.fieldErrors.businessType, "Business type is required.");
});

test("vendor application validation trims values and normalizes email", () => {
  const result = validateVendorApplicationInput({
    businessName: "  Trail Co. ",
    businessType: "Tours",
    contactName: "  Asha ",
    phone: "+91 123",
    email: "  ASHA@TRAIL.CO ",
    description: "Guided journeys",
    address: "1 Road",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
  });
  assert.deepEqual(result.fieldErrors, {});
  assert.equal(result.input?.businessName, "Trail Co.");
  assert.equal(result.input?.email, "asha@trail.co");
});
