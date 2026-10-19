import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => JSON.parse(readFileSync(resolve(root, "public/data", name), "utf8"));
const registries = read("registries.json");
const categories = read("categories.json");
const countries = read("countries.json");
const borders = read("borders.geojson");
const errors = [];

function uniqueIds(rows, key, label) {
  const seen = new Set();
  for (const row of rows) {
    if (typeof row[key] !== "string" || !row[key].trim()) errors.push(`${label}: missing ${key}`);
    else if (seen.has(row[key])) errors.push(`${label}: duplicate ${key} "${row[key]}"`);
    seen.add(row[key]);
  }
  return seen;
}

const categoryIds = uniqueIds(categories, "id", "categories");
const countryIds = uniqueIds(countries, "id", "countries");
uniqueIds(registries, "slug", "registries");

for (const category of categories) {
  if (!category.fa?.trim() || !category.en?.trim()) errors.push(`category "${category.id}": fa and en titles are required`);
}
for (const country of countries) {
  if (!country.iso3?.trim() || !country.fa?.trim() || !country.en?.trim()) errors.push(`country "${country.id}": iso3, fa and en are required`);
  const coordinates = country.coordinates;
  if (!Number.isFinite(coordinates?.longitude) || !Number.isFinite(coordinates?.latitude) || !Number.isFinite(coordinates?.height)) {
    errors.push(`country "${country.id}": valid longitude, latitude and height are required`);
  }
}
for (const registry of registries) {
  if (!registry.fa?.trim() || !registry.en?.trim()) errors.push(`registry "${registry.slug}": fa and en titles are required`);
  if (!countryIds.has(registry.country)) errors.push(`registry "${registry.slug}": unknown country "${registry.country}"`);
  if (typeof registry.city !== "string" || !registry.city.trim()) errors.push(`registry "${registry.slug}": city must be provided`);
  if (!Array.isArray(registry.categories) || registry.categories.length === 0) {
    errors.push(`registry "${registry.slug}": at least one category is required`);
  } else {
    for (const id of registry.categories) if (!categoryIds.has(id)) errors.push(`registry "${registry.slug}": unknown category "${id}"`);
  }
  if (typeof registry.description !== "string") errors.push(`registry "${registry.slug}": description must be a string`);
  if (typeof registry.officialUrl !== "string") errors.push(`registry "${registry.slug}": officialUrl must be a string`);
  if (registry.officialUrl) {
    try {
      if (new URL(registry.officialUrl).protocol !== "https:") throw new Error();
    } catch {
      errors.push(`registry "${registry.slug}": officialUrl must be a valid HTTPS URL`);
    }
  }
}
if (!Array.isArray(borders.features)) errors.push("borders.geojson: a FeatureCollection with a features array is required");
for (const country of countries) {
  if (registries.some((registry) => registry.country === country.id)) {
    const hasBorder = borders.features?.some((feature) =>
      feature.properties?.iso2 === country.id || feature.properties?.iso3 === country.iso3
    );
    if (!hasBorder) errors.push(`borders.geojson: no boundary found for active country "${country.id}"`);
  }
}
if (registries.length === 0) errors.push("registries: at least one entry is required");
if (categories.length === 0) errors.push("categories: at least one entry is required");

if (errors.length) {
  console.error(`Catalogue validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Catalogue data valid: ${registries.length} registries, ${categories.length} categories, ${countries.length} countries.`);
}
