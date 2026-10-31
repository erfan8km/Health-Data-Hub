const REGISTRY_KEYS = new Set(["slug", "fa", "en", "country", "province", "city", "categories", "description", "officialUrl", "targetPopulation", "center", "status", "lastReviewedAt", "startYear", "registryType", "dataSummary", "dataSummaryFa", "dataSummaryEn", "researchContact", "keyPublications"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_REGISTRIES = 5000;
const MAX_TEXT_LENGTH = 20000;

/**
 * Pure payload validation for the admin API.
 * Province IDs are checked against trusted metadata, but the active flag is
 * intentionally not enforced: inactive provinces may be prepared as metadata.
 */
export function validateRegistryPayload(registries, categories, countries, provinces) {
  const errors = [];
  if (!Array.isArray(registries)) return { ok: false, errors: ["payload must be an array"] };
  if (!Array.isArray(categories) || !Array.isArray(countries) || !Array.isArray(provinces)) {
    return { ok: false, errors: ["trusted categories, countries, and provinces must be arrays"] };
  }
  if (registries.length > MAX_REGISTRIES) errors.push(`payload exceeds ${MAX_REGISTRIES} registry records`);
  const categoryIds = new Set(categories.map((row) => row?.id).filter((id) => typeof id === "string"));
  const countryIds = new Set(countries.map((row) => row?.id).filter((id) => typeof id === "string"));
  const provinceIds = new Set(provinces.map((row) => row?.id).filter((id) => typeof id === "string"));
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
    for (const key of ["slug", "fa", "en", "country", "province", "city", "description", "officialUrl", "targetPopulation", "center", "status", "lastReviewedAt", "startYear", "registryType", "researchContact"]) {
      if (typeof row[key] !== "string") errors.push(`${label}.${key} must be a string`);
      else if (row[key].length > MAX_TEXT_LENGTH) errors.push(`${label}.${key} is too long`);
    }
    const legacySummary = row.dataSummary;
    const persianSummary = row.dataSummaryFa ?? legacySummary;
    if (typeof persianSummary !== "string") errors.push(`${label}.dataSummaryFa or legacy dataSummary must be a string`);
    else if (persianSummary.length > MAX_TEXT_LENGTH) errors.push(`${label}.dataSummaryFa is too long`);
    if (legacySummary !== undefined && typeof legacySummary !== "string") errors.push(`${label}.dataSummary must be a string when provided`);
    if (row.dataSummaryEn !== undefined && typeof row.dataSummaryEn !== "string") errors.push(`${label}.dataSummaryEn must be a string`);
    else if (typeof row.dataSummaryEn === "string" && row.dataSummaryEn.length > MAX_TEXT_LENGTH) errors.push(`${label}.dataSummaryEn is too long`);
    if (typeof row.slug === "string") {
      if (!SLUG.test(row.slug)) errors.push(`${label}.slug must use lowercase kebab-case`);
      if (slugs.has(row.slug)) errors.push(`duplicate slug "${row.slug}"`);
      slugs.add(row.slug);
    }
    for (const key of ["fa", "en", "country", "province", "city"]) {
      if (typeof row[key] === "string" && !row[key].trim()) errors.push(`${label}.${key} is required`);
    }
    if (typeof row.country === "string" && !countryIds.has(row.country)) {
      errors.push(`${label} references unknown country "${row.country}"`);
    }
    if (typeof row.province === "string" && row.province && !provinceIds.has(row.province)) {
      errors.push(`${label} references unknown province "${row.province}"`);
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
      errors.push(`${label}.keyPublications must be an array`);
    } else {
      const publicationCodes = new Set();
      const publicationDois = new Set();
      row.keyPublications.forEach((publication, publicationIndex) => {
        const publicationLabel = label + ".keyPublications[" + publicationIndex + "]";
        if (!publication || typeof publication !== "object" || Array.isArray(publication)) {
          errors.push(publicationLabel + " must be an object");
          return;
        }
        const allowedKeys = new Set(["code", "title", "journal", "authors", "year", "doi", "url", "abstract", "publicationType"]);
        for (const key of Object.keys(publication)) {
          if (!allowedKeys.has(key)) errors.push(publicationLabel + " has unsupported field \"" + key + "\"");
        }
        for (const key of ["code", "title", "journal", "year", "doi", "url", "abstract", "publicationType"]) {
          if (publication[key] !== undefined && typeof publication[key] !== "string") errors.push(publicationLabel + "." + key + " must be a string");
          if (typeof publication[key] === "string" && publication[key].length > MAX_TEXT_LENGTH) errors.push(publicationLabel + "." + key + " is too long");
        }
        const structured = Boolean(
          publication.code || publication.journal || publication.year || publication.doi ||
          publication.abstract || publication.publicationType ||
          (Array.isArray(publication.authors) && publication.authors.length)
        );
        if (!structured) {
          if (typeof publication.title !== "string" || !publication.title.trim() ||
              typeof publication.url !== "string" || !publication.url.trim()) {
            errors.push(publicationLabel + " legacy records require a title and URL");
          }
        } else {
          if (typeof publication.code !== "string" || !publication.code.trim()) errors.push(publicationLabel + ".code is required for structured articles");
          if (typeof publication.title !== "string" || !publication.title.trim()) errors.push(publicationLabel + ".title is required");
          if (typeof publication.journal !== "string" || !publication.journal.trim()) errors.push(publicationLabel + ".journal is required for structured articles");
          if (publication.year && !/^\d{4}$/.test(publication.year)) errors.push(publicationLabel + ".year must use four digits or be empty");
          if (publication.doi && !/^10\.\d{4,9}\/\S+$/i.test(publication.doi)) errors.push(publicationLabel + ".doi must be a valid DOI");
          if (publication.authors !== undefined && (!Array.isArray(publication.authors) || publication.authors.length > 100 ||
              publication.authors.some((author) => typeof author !== "string" || !author.trim() || author.length > 300))) {
            errors.push(publicationLabel + ".authors must be an array of non-empty author names");
          }
          if (publication.code && publicationCodes.has(publication.code)) errors.push(publicationLabel + " has a duplicate article code");
          if (publication.code) publicationCodes.add(publication.code);
          if (publication.doi && publicationDois.has(publication.doi.toLowerCase())) errors.push(publicationLabel + " has a duplicate DOI");
          if (publication.doi) publicationDois.add(publication.doi.toLowerCase());
        }
        if (publication.url) {
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
