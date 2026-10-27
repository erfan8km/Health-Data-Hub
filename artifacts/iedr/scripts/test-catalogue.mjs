import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFile(resolve(root, "public/data", name), "utf8").then(JSON.parse);
const [registries, categories, countries, borders, provinces] = await Promise.all([
  read("registries.json"), read("categories.json"), read("countries.json"), read("borders.geojson"), read("provinces.json"),
]);

const expectedCategoryBySlug = {
  "obstructive-sleep-apnea": "sleep",
  "sleep-disorders": "sleep",
  "trophoblastic-disease": "gyn",
  "ovarian-cancer": "onc",
  "recurrent-miscarriage": "gyn",
  "oral-lichen-planus": "oral",
  "infertility": "gyn",
  "malignant-otitis-externa": "ent",
  "obesity": "endo",
  "chronic-rhinosinusitis": "sleep",
  "esophageal-atresia": "peds",
  "childhood-obesity": "endo",
  "type1-diabetes-children": "endo",
  "childhood-cancer": "onc",
  "omid-hospital-cancer": "onc",
  "cystic-fibrosis": "sleep",
  "inborn-metabolic-disorders": "endo",
  "primary-immunodeficiency": "immun",
  "invasive-fungal-mucormycosis": "immun",
  "colorectal-cancer": "onc",
  "ssnhl": "ent",
  "rop-screening": "eye",
  "opportunistic-pathogens": "immun",
  "endometriosis": "gyn",
  "cornea-rna-biobank": "eye",
  "liver-transplantation": "gi",
  "endometrial-cancer": "onc",
  "hepatic-hydatid-cyst": "gi",
  "granulomatous-mastitis": "gyn",
  "brain-death": "neuro-icu",
};

test("contains the 30 existing registry rows and 11 bilingual clinical categories", () => {
  assert.equal(registries.length, 30);
  assert.equal(categories.length, 11);
  assert.deepEqual(categories.map((category) => category.id), [
    "gyn", "onc", "peds", "endo", "sleep", "immun", "gi", "ent", "eye", "oral", "neuro-icu",
  ]);
  for (const category of categories) {
    assert.ok(category.fa.trim().length > 0);
    assert.ok(category.en.trim().length > 0);
  }
});

test("registry slugs remain unique and all records retain their existing geography and bilingual names", () => {
  const slugs = registries.map((registry) => registry.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(Object.keys(expectedCategoryBySlug).length, registries.length);
  for (const registry of registries) {
    assert.equal(registry.country, "IR");
    assert.equal(registry.city, "mashhad");
    assert.equal(registry.province, "razavi-khorasan");
    assert.ok(registry.fa.length > 0 && registry.en.length > 0);
    assert.ok(Object.hasOwn(expectedCategoryBySlug, registry.slug), `unexpected registry: ${registry.slug}`);
  }
});

test("each existing registry belongs to exactly one correct clinical category with no overlap", () => {
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const registry of registries) {
    assert.equal(registry.categories.length, 1, `${registry.slug} must have exactly one category`);
    assert.ok(categoryIds.has(registry.categories[0]), `${registry.slug}: unknown category ${registry.categories[0]}`);
    assert.equal(registry.categories[0], expectedCategoryBySlug[registry.slug], `${registry.slug}: wrong category`);
  }
  const totalCategoryAssignments = registries.reduce((sum, registry) => sum + registry.categories.length, 0);
  assert.equal(totalCategoryAssignments, registries.length);
  for (const id of categoryIds) assert.ok(registries.some((registry) => registry.categories[0] === id), `unused category: ${id}`);
});

test("the SSNHL and ROP identifiers remain unchanged and are in their intended categories", () => {
  assert.equal(registries.find((registry) => registry.slug === "ssnhl")?.en, "Sudden Sensorineural Hearing Loss (SSNHL)");
  assert.equal(registries.find((registry) => registry.slug === "ssnhl")?.categories[0], "ent");
  assert.equal(registries.find((registry) => registry.slug === "rop-screening")?.en, "Eye Examination of Premature Infants (ROP)");
  assert.equal(registries.find((registry) => registry.slug === "rop-screening")?.categories[0], "eye");
});

test("all registry metadata fields exist with empty placeholders until entered in the admin panel", () => {
  const textFields = ["description", "targetPopulation", "center", "status", "lastReviewedAt", "startYear", "registryType", "dataSummary", "researchContact"];
  for (const registry of registries) {
    for (const field of textFields) {
      assert.equal(typeof registry[field], "string", registry.slug + ": " + field + " should be a string");
      assert.equal(registry[field], "", registry.slug + ": " + field + " should remain blank until verified");
    }
    assert.ok(Array.isArray(registry.keyPublications), registry.slug + ": keyPublications should be an array");
    assert.deepEqual(registry.keyPublications, []);
    assert.equal(registry.officialUrl, "");
  }
});

test("the active Iran country has a boundary and geographic coordinates", () => {
  const iran = countries.find((country) => country.id === "IR");
  assert.ok(iran);
  assert.equal(iran.iso3, "IRN");
  assert.ok(Number.isFinite(iran.coordinates.latitude));
  assert.ok(Number.isFinite(iran.coordinates.longitude));
  assert.ok(borders.features.some((feature) => feature.properties.iso2 === "IR"));
});

test("province directory includes all 31 provinces but enables only Razavi Khorasan", () => {
  assert.equal(provinces.length, 31);
  assert.equal(provinces.filter((province) => province.active).length, 1);
  assert.equal(provinces.find((province) => province.active)?.id, "razavi-khorasan");
  const provinceIds = new Set(provinces.map((province) => province.id));
  for (const registry of registries) assert.ok(provinceIds.has(registry.province));
});
