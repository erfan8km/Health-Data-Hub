import test from "node:test";
import assert from "node:assert/strict";
import { validateRegistryPayload } from "./validate.mjs";

const categories = [{ id: "sleep" }, { id: "ent" }];
const countries = [{ id: "IR" }];
const provinces = [{ id: "razavi-khorasan", active: true }, { id: "tehran", active: false }];

function registry(overrides = {}) {
  return {
    slug: "sleep-disorders",
    fa: "اختلالات خواب",
    en: "Sleep Disorders",
    country: "IR",
    province: "razavi-khorasan",
    city: "mashhad",
    categories: ["sleep"],
    description: "",
    officialUrl: "",
    ...overrides,
  };
}

test("accepts a known province whether active or inactive", () => {
  const result = validateRegistryPayload(
    [registry(), registry({ slug: "tehran-sleep", province: "tehran", city: "tehran" })],
    categories, countries, provinces,
  );
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects a province ID absent from trusted metadata", () => {
  const result = validateRegistryPayload([registry({ province: "made-up-province" })], categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('references unknown province "made-up-province"')));
});

test("requires province to be a non-empty string", () => {
  const result = validateRegistryPayload([registry({ province: "" })], categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error === "registry[0].province is required"));
});

test("continues to reject unsupported registry fields", () => {
  const result = validateRegistryPayload([registry({ injected: true })], categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error === 'registry[0] has unsupported field "injected"'));
});

test("continues to validate country and category identifiers", () => {
  const result = validateRegistryPayload([registry({ country: "XX", categories: ["unknown"] })], categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('references unknown country "XX"')));
  assert.ok(result.errors.some((error) => error.includes('references unknown category "unknown"')));
});

test("rejects missing trusted province metadata rather than silently accepting it", () => {
  const result = validateRegistryPayload([registry()], categories, countries, null);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("trusted categories, countries, and provinces")));
});
