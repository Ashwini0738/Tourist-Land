import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, isDate, parseInteger, parseNumber, parseString, parseStringArray } from "./vendor-portal-logic.ts";

test("vendor input parsers reject malformed values instead of coercing them silently", () => {
  assert.equal(parseString("  hotel  ", 20), "hotel");
  assert.equal(parseString(" ", 20), undefined);
  assert.equal(parseString(null, 20), undefined);
  assert.equal(parseString(null, 20, true), null);
  assert.equal(parseNumber("7800", 0, 10000), 7800);
  assert.equal(parseNumber("not-a-number", 0, 10000), undefined);
  assert.equal(parseInteger("2.5", 1, 10), undefined);
  assert.equal(parseInteger("2", 1, 10), 2);
});

test("vendor array and calendar validation stays bounded and exact", () => {
  assert.deepEqual(parseStringArray([" Wi-Fi ", "Breakfast"]), ["Wi-Fi", "Breakfast"]);
  assert.equal(parseStringArray(["ok", 4]), undefined);
  assert.equal(parseStringArray(Array.from({ length: 31 }, () => "amenity")), undefined);
  assert.equal(isDate("2026-02-28"), true);
  assert.equal(isDate("2026-02-29"), false);
  assert.deepEqual(dateRange("2026-09-01", "2026-09-04"), ["2026-09-01", "2026-09-02", "2026-09-03"]);
  assert.equal(dateRange("2026-09-01", "2026-12-31").length, 91);
});