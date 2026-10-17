import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { filterRegistries, normalizeSearchText } from "../src/lib/catalogue.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registries = JSON.parse(await readFile(resolve(root, "src/data/registries.json"), "utf8"));
const categories = JSON.parse(await readFile(resolve(root, "src/data/categories.json"), "utf8"));
const originalExport = JSON.parse(await readFile(resolve(root, "../../data/registries.json"), "utf8"));
const categoryName = (id) => categories.find((category) => category.id === id)?.name_en ?? "";
const emptyName = () => "";
const countryId = () => "iran";
const cityId = () => "mashhad";
const categoryIdByLegacyId = {
  1: "chronic-diseases",
  2: "infectious-diseases",
  3: "cancer-registry",
  4: "maternal-child-health",
  5: "mental-health",
};

test("preserves all 21 registry records and 5 categories", () => {
  assert.equal(registries.length, 21);
  assert.equal(categories.length, 5);
  assert.equal(originalExport.length, 21);
});

test("preserves every original title, category, source, and geographic value", () => {
  for (const original of originalExport) {
    const registry = registries.find((entry) => entry.title_en === original.title_en && entry.title_fa === original.title_fa);
    assert.ok(registry, `Missing preserved registry: ${original.title_en}`);
    assert.equal(registry.category_id, categoryIdByLegacyId[original.category_legacy_id]);
    assert.equal(registry.description_en, original.description_en);
    assert.equal(registry.description_fa, original.description_fa);
    assert.equal(registry.source_text_en, original.source_text_en);
    assert.equal(registry.source_text_fa, original.source_text_fa);
    assert.equal(registry.geographic_text_en, original.geographic_text_en);
    assert.equal(registry.geographic_text_fa, original.geographic_text_fa);
    assert.equal(registry.official_source_url, original.official_source_url);
  }
});

test("search normalization unifies Persian/Arabic yeh and kaf and removes ZWNJ", () => {
  assert.equal(normalizeSearchText("كيستيك‌فايبروسيس"), normalizeSearchText("کیستیکفایبروسیس"));
});

test("English title search ignores case", () => {
  assert.deepEqual(filterRegistries(registries, { q: "pEdIaTrIc CaNcEr" }, countryId, cityId, categoryName, emptyName, emptyName, emptyName).map((entry) => entry.id), ["pediatric-cancer"]);
});

test("Persian search finds the expected registry after normalization", () => {
  const results = filterRegistries(registries, { q: "کاهش شنوایی سادن" }, countryId, cityId, categoryName, emptyName, emptyName, emptyName);
  assert.deepEqual(results.map((entry) => entry.id), ["sudden-hearing-loss"]);
});

test("country, city, institution, category, and field filters combine", () => {
  assert.equal(filterRegistries(registries, {
    country: "iran",
    city: "mashhad",
    institution: "mashhad-university-of-medical-sciences",
    category: "cancer-registry",
    field: "",
  }, countryId, cityId, categoryName, emptyName, emptyName, emptyName).length, 5);
  assert.equal(filterRegistries(registries, { country: "unknown" }, countryId, cityId, categoryName, emptyName, emptyName, emptyName).length, 0);
});
