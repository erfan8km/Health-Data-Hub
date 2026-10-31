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


test("separate Persian and English selected-variable summaries are accepted", () => {
  const candidate = structuredClone(registries);
  candidate[0].dataSummaryFa = "متغیرهای ثبت‌شده";
  candidate[0].dataSummaryEn = "Selected registry variables";
  assert.deepEqual(validateRegistryPayload(candidate, categories, countries, provinces), { ok: true, errors: [] });
});

test("separate Persian and English registry metadata fields are accepted", () => {
  const candidate = structuredClone(registries);
  candidate[0].descriptionFa = "شرح فارسی";
  candidate[0].descriptionEn = "English description";
  candidate[0].targetPopulationFa = "جمعیت هدف";
  candidate[0].targetPopulationEn = "Target population";
  candidate[0].centerFa = "مرکز";
  candidate[0].centerEn = "Center";
  candidate[0].statusFa = "فعال";
  candidate[0].statusEn = "Active";
  candidate[0].registryTypeFa = "بیماری‌محور";
  candidate[0].registryTypeEn = "Disease-based";
  candidate[0].researchContactFa = "تماس پژوهشی";
  candidate[0].researchContactEn = "Research contact";
  assert.deepEqual(validateRegistryPayload(candidate, categories, countries, provinces), { ok: true, errors: [] });
});

test("legacy dataSummary remains accepted as a Persian compatibility field", () => {
  const candidate = structuredClone(registries);
  delete candidate[0].dataSummaryFa;
  delete candidate[0].dataSummaryEn;
  candidate[0].dataSummary = "Legacy Persian summary";
  assert.deepEqual(validateRegistryPayload(candidate, categories, countries, provinces), { ok: true, errors: [] });
});

test("non-string English selected-variable summaries are rejected", () => {
  const candidate = structuredClone(registries);
  candidate[0].dataSummaryEn = 42;
  const result = validateRegistryPayload(candidate, categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(".dataSummaryEn must be a string")));
});

test("structured publication records accept bibliographic metadata", () => {
  const candidate = structuredClone(registries);
  candidate[0].keyPublications = [{
    code: "4041521",
    title: "Example transplant cohort article",
    journal: "Archives of Clinical Infectious Diseases",
    authors: ["First Author", "Second Author"],
    year: "2025",
    doi: "10.1234/example.2025.1",
    url: "https://example.org/article",
    abstract: "A short abstract.",
    publicationType: "Original research",
  }];
  assert.deepEqual(validateRegistryPayload(candidate, categories, countries, provinces), { ok: true, errors: [] });
});

test("structured publications require code, title and journal", () => {
  const candidate = structuredClone(registries);
  candidate[0].keyPublications = [{ code: "", title: "Incomplete article", journal: "" , year: "2025" }];
  const result = validateRegistryPayload(candidate, categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(".code is required")));
  assert.ok(result.errors.some((error) => error.includes(".journal is required")));
});

test("invalid DOI, year, URL, and duplicate article identifiers are rejected", () => {
  const candidate = structuredClone(registries);
  candidate[0].keyPublications = [
    { code: "A1", title: "Article one", journal: "Journal", year: "25", doi: "not-a-doi", url: "http://example.org" },
    { code: "A1", title: "Article two", journal: "Journal", doi: "10.1234/valid" },
  ];
  const result = validateRegistryPayload(candidate, categories, countries, provinces);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(".year must use four digits")));
  assert.ok(result.errors.some((error) => error.includes(".doi must be a valid DOI")));
  assert.ok(result.errors.some((error) => error.includes(".url must be a valid HTTPS URL")));
  assert.ok(result.errors.some((error) => error.includes("duplicate article code")));
});

test("legacy title and HTTPS URL publication records remain compatible", () => {
  const candidate = structuredClone(registries);
  candidate[0].keyPublications = [{ title: "Legacy article", url: "https://example.org/article" }];
  assert.deepEqual(validateRegistryPayload(candidate, categories, countries, provinces), { ok: true, errors: [] });
});
