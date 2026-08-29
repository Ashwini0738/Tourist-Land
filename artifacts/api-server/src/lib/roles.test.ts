import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAccountStatus,
  ownsResourceOrIsAdmin,
  parsePrimaryRole,
  roleIsAllowed,
  resolvePrimaryRole,
} from "./roles.ts";

test("defaults accounts without a valid role to user", () => {
  assert.equal(resolvePrimaryRole([]), "user");
  assert.equal(resolvePrimaryRole(["unknown"]), "user");
  assert.equal(parsePrimaryRole("admin"), "admin");
  assert.equal(parsePrimaryRole("owner"), null);
});

test("resolves the strongest supported role deterministically", () => {
  assert.equal(resolvePrimaryRole(["user", "vendor"]), "vendor");
  assert.equal(resolvePrimaryRole(["vendor", "admin"]), "admin");
  assert.equal(resolvePrimaryRole(["user", "admin", "vendor"]), "admin");
});

test("enforces role and vendor ownership boundaries", () => {
  assert.equal(roleIsAllowed("admin", ["admin"]), true);
  assert.equal(roleIsAllowed("user", ["admin"]), false);
  assert.equal(roleIsAllowed("vendor", ["admin", "vendor"]), true);
  assert.equal(ownsResourceOrIsAdmin("admin", "admin-1", "vendor-2"), true);
  assert.equal(ownsResourceOrIsAdmin("vendor", "vendor-1", "vendor-1"), true);
  assert.equal(ownsResourceOrIsAdmin("vendor", "vendor-1", "vendor-2"), false);
  assert.equal(ownsResourceOrIsAdmin("user", "user-1", "user-1"), false);
});

test("fails closed for unknown account statuses", () => {
  assert.equal(normalizeAccountStatus("active"), "active");
  assert.equal(normalizeAccountStatus("suspended"), "suspended");
  assert.equal(normalizeAccountStatus("unexpected"), "inactive");
});