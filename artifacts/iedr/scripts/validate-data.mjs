import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => JSON.parse(readFileSync(resolve(root, "src/data", name), "utf8"));
const registries = read("registries.json");
const countries = read("countries.json");
const cities = read("cities.json");
const institutions = read("institutions.json");
const categories = read("categories.json");
const fields = read("fields.json");
const failures = [];

function uniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (!item.id) failures.push(`${label}: missing id`);
    else if (ids.has(item.id)) failures.push(`${label}: duplicate id "${item.id}"`);
    ids.add(item.id);
  }
  return ids;
}

const countryIds = uniqueIds(countries, "countries");
const cityIds = uniqueIds(cities, "cities");
const institutionIds = uniqueIds(institutions, "institutions");
const categoryIds = uniqueIds(categories, "categories");
const fieldIds = uniqueIds(fields, "fields");
const registryIds = uniqueIds(registries, "registries");

for (const city of cities) {
  if (!countryIds.has(city.country_id)) failures.push(`city "${city.id}": unknown country_id "${city.country_id}"`);
}
for (const institution of institutions) {
  if (!cityIds.has(institution.city_id)) failures.push(`institution "${institution.id}": unknown city_id "${institution.city_id}"`);
}
for (const field of fields) {
  if (!categoryIds.has(field.category_id)) failures.push(`field "${field.id}": unknown category_id "${field.category_id}"`);
}
for (const registry of registries) {
  if (!registry.title_fa?.trim()) failures.push(`registry "${registry.id}": missing title_fa`);
  if (!registry.title_en?.trim()) failures.push(`registry "${registry.id}": missing title_en`);
  if (!categoryIds.has(registry.category_id)) failures.push(`registry "${registry.id}": unknown category_id "${registry.category_id}"`);
  if (registry.field_id && !fieldIds.has(registry.field_id)) failures.push(`registry "${registry.id}": unknown field_id "${registry.field_id}"`);
  if (registry.institution_id && !institutionIds.has(registry.institution_id)) failures.push(`registry "${registry.id}": unknown institution_id "${registry.institution_id}"`);
  if (!["active", "inactive"].includes(registry.status)) failures.push(`registry "${registry.id}": status must be active or inactive`);
  if (registry.official_source_url) {
    try {
      if (new URL(registry.official_source_url).protocol !== "https:") throw new Error();
    } catch {
      failures.push(`registry "${registry.id}": official_source_url must be a valid https URL`);
    }
  }
}

if (!registryIds.size) failures.push("registries: no entries found");
if (failures.length) {
  console.error(`Catalogue data validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Catalogue data valid: ${registries.length} registries, ${categories.length} categories, ${fields.length} fields.`);
}
