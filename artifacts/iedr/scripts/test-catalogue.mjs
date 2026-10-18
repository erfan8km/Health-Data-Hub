import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFile(resolve(root, "public/data", name), "utf8").then(JSON.parse);
const [registries, categories, countries, borders] = await Promise.all([
  read("registries.json"), read("categories.json"), read("countries.json"), read("borders.geojson"),
]);

test("contains the 30 initial registry rows and 11 clinical categories from the brief", () => {
  assert.equal(registries.length, 30);
  assert.equal(categories.length, 11);
});

test("registry slugs are unique and all records use the initial Iran/Mashhad geography", () => {
  const slugs = registries.map((registry) => registry.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const registry of registries) {
    assert.equal(registry.country, "IR");
    assert.equal(registry.city, "mashhad");
    assert.ok(registry.fa.length > 0 && registry.en.length > 0);
  }
});

test("all registry category references point to known categories, including multi-category records", () => {
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const registry of registries) {
    assert.ok(registry.categories.length > 0);
    for (const id of registry.categories) assert.ok(categoryIds.has(id), `${registry.slug}: unknown ${id}`);
  }
  assert.deepEqual(registries.find((registry) => registry.slug === "obstructive-sleep-apnea")?.categories, ["sleep", "ent"]);
  assert.deepEqual(registries.find((registry) => registry.slug === "endometriosis")?.categories, ["gyn"]);
});

test("unknown descriptions and official URLs are left blank instead of being invented", () => {
  for (const registry of registries) {
    assert.equal(registry.description, "");
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

test("category counts match multi-category references without mutating the data", () => {
  const count = (id) => registries.filter((registry) => registry.categories.includes(id)).length;
  assert.ok(count("gyn") > 0);
  assert.ok(count("onc") > 0);
  assert.ok(count("eye") > 0);
  assert.equal(registries.filter((registry) => registry.categories.includes("sleep")).length, 2);
});
