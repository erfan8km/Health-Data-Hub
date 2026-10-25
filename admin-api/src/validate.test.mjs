import test from "node:test";
import assert from "node:assert/strict";
import { validateRegistryPayload } from "./validate.mjs";

const categories = [{ id: "onc" }, { id: "sleep" }];
const countries = [{ id: "IR" }];
const registry = {
  slug: "sleep-disorders",
  fa: "اختلالات خواب",
  en: "Sleep Disorders",
  country: "IR",
  city: "mashhad",
  categories: ["sleep"],
  description: "",
  officialUrl: "",
};

test("accepts current schema including blank optional metadata", () => {
  assert.deepEqual(validateRegistryPayload([registry], categories, countries), { ok: true, errors: [] });
});

test("rejects duplicate and malformed slugs", () => {
  const result = validateRegistryPayload([{ ...registry, slug: "Not A Slug" }, registry, registry], categories, countries);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("lowercase kebab-case")));
  assert.ok(result.errors.some((e) => e.includes("duplicate slug")));
});

test("rejects slugs that attempt path traversal or contain path separators", () => {
  for (const slug of ["../secret", "a/../b", "a\\b", "%2e%2e", "."]) {
    const result = validateRegistryPayload([{ ...registry, slug }], categories, countries);
    assert.equal(result.ok, false, "should reject slug: " + slug);
    assert.ok(result.errors.some((error) => error.includes("lowercase kebab-case")));
  }
});

test("rejects unknown country and category references", () => {
  const result = validateRegistryPayload([{ ...registry, country: "XX", categories: ["missing"] }], categories, countries);
  assert.ok(result.errors.some((e) => e.includes("unknown country")));
  assert.ok(result.errors.some((e) => e.includes("unknown category")));
});

test("rejects non-HTTPS and malformed official URLs but permits empty values", () => {
  assert.equal(validateRegistryPayload([{ ...registry, officialUrl: "" }], categories, countries).ok, true);
  assert.equal(validateRegistryPayload([{ ...registry, officialUrl: "http://example.org" }], categories, countries).ok, false);
  assert.equal(validateRegistryPayload([{ ...registry, officialUrl: "not a url" }], categories, countries).ok, false);
});

test("rejects unexpected fields, missing category references, and non-object records", () => {
  const result = validateRegistryPayload([null, { ...registry, surprise: true }, { ...registry, categories: [] }], categories, countries);
  assert.ok(result.errors.some((e) => e.includes("must be an object")));
  assert.ok(result.errors.some((e) => e.includes("unsupported field")));
  assert.ok(result.errors.some((e) => e.includes("at least one category")));
});

test("does not mutate input data", () => {
  const input = [{ ...registry, categories: [...registry.categories] }];
  const before = JSON.stringify(input);
  validateRegistryPayload(input, categories, countries);
  assert.equal(JSON.stringify(input), before);
});
