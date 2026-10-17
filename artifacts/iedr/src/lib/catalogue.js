/**
 * @typedef {Object} Registry
 * @property {string} id
 * @property {string} title_fa
 * @property {string} title_en
 * @property {string} description_fa
 * @property {string} description_en
 * @property {string} category_id
 * @property {string} field_id
 * @property {string} institution_id
 * @property {string} official_source_url
 * @property {string} status
 * @property {string} last_checked
 * @property {string} [source_text_fa]
 * @property {string} [source_text_en]
 * @property {string} [geographic_text_fa]
 * @property {string} [geographic_text_en]
 */

/** Normalize Persian/Arabic character variants and spacing for client-side search. */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, "")
    .toLocaleLowerCase();
}

/**
 * @param {Registry[]} registries
 * @param {Record<string, string>} filters
 * @param {(registry: Registry) => string} countryId
 * @param {(registry: Registry) => string} cityId
 * @param {(value: string) => string} categoryName
 * @param {(value: string) => string} fieldName
 * @param {(value: string) => string} institutionName
 * @param {(value: string) => string} cityName
 */
export function filterRegistries(
  registries,
  filters,
  countryId,
  cityId,
  categoryName,
  fieldName,
  institutionName,
  cityName,
) {
  const query = normalizeSearchText(filters.q);
  return registries.filter((registry) => {
    if (filters.country && countryId(registry) !== filters.country) return false;
    if (filters.city && cityId(registry) !== filters.city) return false;
    if (filters.institution && registry.institution_id !== filters.institution) return false;
    if (filters.category && registry.category_id !== filters.category) return false;
    if (filters.field && registry.field_id !== filters.field) return false;

    if (!query) return true;
    const searchable = [
      registry.title_fa,
      registry.title_en,
      registry.description_fa,
      registry.description_en,
      registry.source_text_fa,
      registry.source_text_en,
      registry.geographic_text_fa,
      registry.geographic_text_en,
      categoryName(registry.category_id),
      registry.field_id ? fieldName(registry.field_id) : "",
      institutionName(registry.institution_id),
      cityName(cityId(registry)),
    ].join(" ");
    return normalizeSearchText(searchable).includes(query);
  });
}
