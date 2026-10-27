const REGISTRY_KEYS = new Set(["slug", "fa", "en", "country", "city", "categories", "description", "officialUrl", "targetPopulation", "center", "status", "lastReviewedAt", "startYear", "registryType", "dataSummary", "researchContact", "keyPublications"]);
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
    for (const key of ["slug", "fa", "en", "country", "city", "description", "officialUrl", "targetPopulation", "center", "status", "lastReviewedAt", "startYear", "registryType", "dataSummary", "researchContact"]) {
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
    if (!Array.isArray(row.categories) || row.categories.length !== 1) {
      errors.push(`${label}.categories must contain exactly one category ID`);
    } else {
      const id = row.categories[0];
      if (typeof id !== "string" || !categoryIds.has(id)) {
        errors.push(`${label} references unknown category "${String(id)}"`);
      }
    }
    if (row.lastReviewedAt && typeof row.lastReviewedAt === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(row.lastReviewedAt)) {
      errors.push(label + ".lastReviewedAt must use YYYY-MM-DD or be empty");
    }
    if (row.startYear && typeof row.startYear === "string" && !/^\d{4}$/.test(row.startYear)) {
      errors.push(label + ".startYear must use four digits or be empty");
    }
    if (typeof row.officialUrl === "string" && row.officialUrl.trim()) {
      try {
        if (new URL(row.officialUrl).protocol !== "https:") throw new Error();
      } catch {
        errors.push(label + ".officialUrl must be a valid HTTPS URL when provided");
      }
    }
    if (!Array.isArray(row.keyPublications)) {
      errors.push(label + ".keyPublications must be an array");
    } else {
      row.keyPublications.forEach((publication, publicationIndex) => {
        const publicationLabel = label + ".keyPublications[" + publicationIndex + "]";
        if (!publication || typeof publication !== "object" || Array.isArray(publication)) {
          errors.push(publicationLabel + " must be an object");
          return;
        }
        for (const key of Object.keys(publication)) {
          if (key !== "title" && key !== "url") errors.push(publicationLabel + " has unsupported field \"" + key + "\"");
        }
        if (typeof publication.title !== "string" || !publication.title.trim()) {
          errors.push(publicationLabel + ".title is required");
        } else if (publication.title.length > MAX_TEXT_LENGTH) {
          errors.push(publicationLabel + ".title is too long");
        }
        if (typeof publication.url !== "string" || !publication.url.trim()) {
          errors.push(publicationLabel + ".url is required");
        } else {
          try {
            if (new URL(publication.url).protocol !== "https:") throw new Error();
          } catch {
            errors.push(publicationLabel + ".url must be a valid HTTPS URL");
          }
        }
      });
    }
  });
  return { ok: errors.length === 0, errors };
}
