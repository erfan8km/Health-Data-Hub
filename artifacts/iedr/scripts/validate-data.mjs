import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => JSON.parse(readFileSync(resolve(root, "public/data", name), "utf8"));
const registries = read("registries.json");
const categories = read("categories.json");
const countries = read("countries.json");
const provinces = read("provinces.json");
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
const provinceIds = uniqueIds(provinces, "id", "provinces");
uniqueIds(registries, "slug", "registries");

for (const category of categories) {
  if (!category.fa?.trim() || !category.en?.trim()) errors.push(`category "${category.id}": fa and en titles are required`);
}
for (const province of provinces) {
  if (!province.fa?.trim() || !province.en?.trim()) errors.push(`province "${province.id}": fa and en are required`);
  if (typeof province.active !== "boolean") errors.push(`province "${province.id}": active must be boolean`);
}
if (provinces.length !== 31) errors.push(`provinces: expected 31 provinces, found ${provinces.length}`);
if (provinces.filter((province) => province.active).length !== 1 || !provinces.some((province) => province.id === "razavi-khorasan" && province.active)) {
  errors.push("provinces: Razavi Khorasan must be the only active province for this release");
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
  if (!provinceIds.has(registry.province)) errors.push(`registry "${registry.slug}": unknown province "${registry.province}"`);
  if (typeof registry.city !== "string" || !registry.city.trim()) errors.push(`registry "${registry.slug}": city must be provided`);
  if (!Array.isArray(registry.categories) || registry.categories.length !== 1) {
    errors.push(`registry "${registry.slug}": exactly one category is required`);
  } else {
    const id = registry.categories[0];
    if (!categoryIds.has(id)) errors.push(`registry "${registry.slug}": unknown category "${id}"`);
  }
  for (const key of ["description", "descriptionFa", "descriptionEn", "targetPopulation", "targetPopulationFa", "targetPopulationEn", "center", "centerFa", "centerEn", "status", "statusFa", "statusEn", "lastReviewedAt", "startYear", "registryType", "registryTypeFa", "registryTypeEn", "dataSummaryFa", "dataSummaryEn", "researchContact", "researchContactFa", "researchContactEn", "officialUrl"]) {
    if (typeof registry[key] !== "string") errors.push('registry "' + registry.slug + '": ' + key + " must be a string");
  }
  if (registry.lastReviewedAt && !/^\d{4}-\d{2}-\d{2}$/.test(registry.lastReviewedAt)) {
    errors.push('registry "' + registry.slug + '": lastReviewedAt must use YYYY-MM-DD or be empty');
  }
  if (registry.startYear && !/^\d{4}$/.test(registry.startYear)) {
    errors.push('registry "' + registry.slug + '": startYear must use four digits or be empty');
  }
  if (registry.officialUrl) {
    try { if (new URL(registry.officialUrl).protocol !== "https:") throw new Error(); }
    catch { errors.push('registry "' + registry.slug + '": officialUrl must be a valid HTTPS URL'); }
  }
  if (!Array.isArray(registry.keyPublications)) {
    errors.push('registry "' + registry.slug + '": keyPublications must be an array');
  } else {
    const publicationCodes = new Set();
    const publicationDois = new Set();
    registry.keyPublications.forEach((publication, index) => {
      const label = 'registry "' + registry.slug + '": keyPublications[' + index + ']';
      if (!publication || typeof publication !== "object" || Array.isArray(publication)) {
        errors.push(label + " must be an object");
        return;
      }
      const textKeys = ["code", "title", "journal", "year", "doi", "url", "abstract", "publicationType"];
      for (const key of textKeys) {
        if (publication[key] !== undefined && typeof publication[key] !== "string") errors.push(label + "." + key + " must be a string");
      }
      const structured = Boolean(
        publication.code || publication.journal || publication.year || publication.doi ||
        publication.abstract || publication.publicationType ||
        (Array.isArray(publication.authors) && publication.authors.length)
      );
      if (!structured) {
        if (typeof publication.title !== "string" || !publication.title.trim() ||
            typeof publication.url !== "string" || !publication.url.trim()) {
          errors.push(label + " legacy records require a title and HTTPS URL");
        }
      } else {
        if (typeof publication.code !== "string" || !publication.code.trim()) errors.push(label + ".code is required for structured articles");
        if (typeof publication.title !== "string" || !publication.title.trim()) errors.push(label + ".title is required");
        if (typeof publication.journal !== "string" || !publication.journal.trim()) errors.push(label + ".journal is required for structured articles");
        if (publication.year && !/^\d{4}$/.test(publication.year)) errors.push(label + ".year must use four digits or be empty");
        if (publication.doi && !/^10\.\d{4,9}\/\S+$/i.test(publication.doi)) errors.push(label + ".doi must be a DOI such as 10.1234/example");
        if (publication.authors !== undefined && (!Array.isArray(publication.authors) ||
            publication.authors.length > 100 || publication.authors.some((author) => typeof author !== "string" || !author.trim() || author.length > 300))) {
          errors.push(label + ".authors must be an array of non-empty author names");
        }
        if (publication.code && publicationCodes.has(publication.code)) errors.push(label + " has a duplicate article code");
        if (publication.code) publicationCodes.add(publication.code);
        if (publication.doi && publicationDois.has(publication.doi.toLowerCase())) errors.push(label + " has a duplicate DOI");
        if (publication.doi) publicationDois.add(publication.doi.toLowerCase());
      }
      if (publication.url) {
        try { if (new URL(publication.url).protocol !== "https:") throw new Error(); }
        catch { errors.push(label + ".url must be a valid HTTPS URL"); }
      }
      if (typeof publication.abstract === "string" && publication.abstract.length > 20000) errors.push(label + ".abstract is too long");
    });
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
if (provinces.length === 0) errors.push("provinces: at least one entry is required");

if (errors.length) {
  console.error(`Catalogue validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Catalogue data valid: ${registries.length} registries, ${categories.length} categories, ${countries.length} countries.`);
}
