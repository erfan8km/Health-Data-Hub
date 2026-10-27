const REGISTRY_KEYS = new Set(["slug", "fa", "en", "country", "city", "categories", "description", "officialUrl"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_REGISTRIES = 5000;
const MAX_TEXT_LENGTH = 20000;

/**
 * Pure payload validation for the future server-side admin API.
 * Returns { ok, errors }; does not mutate inputs or perform network/file access.
 */
export function validateRegistryPayload(registries, categories, countries) {
  const errors = [];
  if (!Array.isArray(registries)) return { ok: false, errors: ["payload must be an array"] };
  if (!Array.isArray(categories) || !Array.isArray(countries)) {
    return { ok: false, errors: ["trusted categories and countries must be arrays"] };
  }
  if (registries.length > MAX_REGISTRIES) errors.push(`payload exceeds ${MAX_REGISTRIES} registry records`);
  const categoryIds = new Set(categories.map((row) => row?.id).filter((id) => typeof id === "string"));
  const countryIds = new Set(countries.map((row) => row?.id).filter((id) => typeof id === "string"));
  const slugs = new Set();

  registries.forEach((row, index) => {
    const label = `registry[${index}]`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`${label} must be an object`);
      return;
    }
    for (const key of Object.keys(row)) {
      if (!REGISTRY_KEYS.has(key)) errors.push(`${label} has unsupported field "${key}"`);
    }
    for (const key of ["slug", "fa", "en", "country", "city", "description", "officialUrl"]) {
      if (typeof row[key] !== "string") errors.push(`${label}.${key} must be a string`);
      else if (row[key].length > MAX_TEXT_LENGTH) errors.push(`${label}.${key} is too long`);
    }
    if (typeof row.slug === "string") {
      if (!SLUG.test(row.slug)) errors.push(`${label}.slug must use lowercase kebab-case`);
      if (slugs.has(row.slug)) errors.push(`duplicate slug "${row.slug}"`);
      slugs.add(row.slug);
    }
    for (const key of ["fa", "en", "country", "city"]) {
      if (typeof row[key] === "string" && !row[key].trim()) errors.push(`${label}.${key} is required`);
    }
    if (typeof row.country === "string" && !countryIds.has(row.country)) {
      errors.push(`${label} references unknown country "${row.country}"`);
    }
    if (!Array.isArray(row.categories) || row.categories.length === 0) {
      errors.push(`${label}.categories must contain at least one category ID`);
    } else {
      const seenCategories = new Set();
      for (const id of row.categories) {
        if (typeof id !== "string" || !categoryIds.has(id)) errors.push(`${label} references unknown category "${String(id)}"`);
        if (seenCategories.has(id)) errors.push(`${label} has duplicate category "${String(id)}"`);
        seenCategories.add(id);
      }
    }
    if (typeof row.officialUrl === "string" && row.officialUrl.trim()) {
      try {
        if (new URL(row.officialUrl).protocol !== "https:") throw new Error();
      } catch {
        errors.push(`${label}.officialUrl must be a valid HTTPS URL when provided`);
      }
    }
  });
  return { ok: errors.length === 0, errors };
}
