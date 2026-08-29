import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldClaimInvitedAccess,
  vendorApprovalAction,
  vendorRejectionStatus,
} from "./onboarding-state.ts";

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
