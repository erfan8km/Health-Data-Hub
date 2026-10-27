import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRegistryPayload } from "./validate.mjs";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../artifacts/iedr/public/data");
const read = (name) => readFile(resolve(dataDir, name), "utf8").then(JSON.parse);
const [registries, categories, countries, provinces] = await Promise.all([
  read("registries.json"),
  read("categories.json"),
  read("countries.json"),
  read("provinces.json"),
]);

test("current catalogue validates with trusted province metadata", () => {
  assert.deepEqual(validateRegistryPayload(registries, categories, countries, provinces), { ok: true, errors: [] });
});

test("province IDs from trusted metadata remain valid even when the province is inactive", () => {
  const inactive = provinces.find((province) => !province.active);
  assert.ok(inactive, "test fixture must include an inactive province");
  const candidate = structuredClone(registries);
  candidate[0].province = inactive.id;
  assert.deepEqual(validateRegistryPayload(candidate, categories, countries, provinces), { ok: true, errors: [] });
});

test("unknown province IDs are rejected", () => {
  const candidate = structuredClone(registries);
  candidate[0].province = "province-does-not-exist";
  const result = validateRegistryPayload(candidate, categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('references unknown province "province-does-not-exist"')));
});

test("a missing province is rejected", () => {
  const candidate = structuredClone(registries);
  delete candidate[0].province;
  const result = validateRegistryPayload(candidate, categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error === "registry[0].province must be a string"));
});
