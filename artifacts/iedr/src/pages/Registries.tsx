import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { categories, cities, countries, fields, institutions, registries } from "@/lib/catalogue-data";
import { filterRegistries } from "@/lib/catalogue.js";
import { useLanguage } from "@/lib/language";
import { usePageMeta } from "@/lib/use-page-meta";

type Filters = { q: string; country: string; city: string; institution: string; category: string; field: string };

function readFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") ?? "",
    country: params.get("country") ?? "",
    city: params.get("city") ?? "",
    institution: params.get("institution") ?? "",
    category: params.get("category") ?? "",
    field: params.get("field") ?? "",
  };
}

export default function Registries() {
  const { language, t } = useLanguage();
  const [filters, setFilters] = useState(() => readFilters(window.location.search));
  const title = t("Registry Catalogue | IEDR", "فهرست ثبت‌ها | IEDR");
  usePageMeta(title, t("Search and filter medical registry listings by place and category.", "جستجو و فیلتر ثبت‌های پزشکی بر اساس مکان و دسته‌بندی."));

  useEffect(() => {
    const syncFilters = () => setFilters(readFilters(window.location.search));
    window.addEventListener("popstate", syncFilters);
    return () => window.removeEventListener("popstate", syncFilters);
  }, []);

  const countryById = useMemo(() => new Map(countries.map((entry) => [entry.id, entry])), []);
  const cityById = useMemo(() => new Map(cities.map((entry) => [entry.id, entry])), []);
  const institutionById = useMemo(() => new Map(institutions.map((entry) => [entry.id, entry])), []);
  const categoryById = useMemo(() => new Map(categories.map((entry) => [entry.id, entry])), []);
  const fieldById = useMemo(() => new Map(fields.map((entry) => [entry.id, entry])), []);

  const countryIdForRegistry = (institutionId: string) => {
    const city = cityById.get(institutionById.get(institutionId)?.city_id ?? "");
    return countryById.get(city?.country_id ?? "")?.id ?? "";
  };
  const cityIdForRegistry = (institutionId: string) => institutionById.get(institutionId)?.city_id ?? "";
  const locationMatches = (registry: (typeof registries)[number]) =>
    (!filters.country || countryIdForRegistry(registry.institution_id) === filters.country) &&
    (!filters.city || cityIdForRegistry(registry.institution_id) === filters.city) &&
    (!filters.institution || registry.institution_id === filters.institution);
  const locationRegistries = registries.filter(locationMatches);
  const availableCountries = countries;
  const availableCities = cities.filter((city) => !filters.country || city.country_id === filters.country);
  const availableInstitutions = institutions.filter((institution) =>
    (!filters.city || institution.city_id === filters.city) &&
    (!filters.country || cityById.get(institution.city_id)?.country_id === filters.country)
  );
  const availableCategories = categories.filter((category) =>
    locationRegistries.some((registry) => registry.category_id === category.id) ||
    !registries.some((registry) => registry.category_id === category.id)
  );
  const availableFields = fields.filter((field) =>
    (!filters.category || field.category_id === filters.category) &&
    locationRegistries.some((registry) => registry.category_id === field.category_id)
  );

  const filtered = filterRegistries(
    registries,
    filters,
    (registry) => countryIdForRegistry(registry.institution_id),
    (registry) => cityIdForRegistry(registry.institution_id),
    (id) => `${categoryById.get(id)?.name_en ?? ""} ${categoryById.get(id)?.name_fa ?? ""}`,
    (id) => `${fieldById.get(id)?.name_en ?? ""} ${fieldById.get(id)?.name_fa ?? ""}`,
    (id) => `${institutionById.get(id)?.name_en ?? ""} ${institutionById.get(id)?.name_fa ?? ""}`,
    (id) => cityById.get(id)?.name_en ?? "",
  );

  function updateFilter(key: keyof Filters, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    const descendants: Record<string, string[]> = {
      country: ["city", "institution", "category", "field"],
      city: ["institution", "category", "field"],
      institution: ["category", "field"],
      category: ["field"],
    };
    descendants[key]?.forEach((name) => next.delete(name));
    const nextUrl = `/registries${next.size ? `?${next.toString()}` : ""}`;
    if (key === "q") window.history.replaceState(null, "", nextUrl);
    else window.history.pushState(null, "", nextUrl);
    setFilters(readFilters(window.location.search));
  }

  function clearFilters() {
    window.history.pushState(null, "", "/registries");
    setFilters(readFilters(""));
  }

  const formattedCount = filtered.length.toLocaleString(language === "fa" ? "fa-IR" : "en-US");
  const currentPlaces = Array.from(new Set(registries.map((registry) => {
    const country = countryById.get(countryIdForRegistry(registry.institution_id));
    const city = cityById.get(cityIdForRegistry(registry.institution_id));
    return [country && t(country.name_en, country.name_fa), city && t(city.name_en, city.name_fa)].filter(Boolean).join(" · ");
  }).filter(Boolean)));
  const locationLabel = filters.city
    ? [countryById.get(filters.country), cityById.get(filters.city)].filter(Boolean).map((item) => t(item!.name_en, item!.name_fa)).join(" · ")
    : filters.country
      ? t(countryById.get(filters.country)?.name_en, countryById.get(filters.country)?.name_fa)
      : currentPlaces.length === 1
        ? currentPlaces[0]
        : t("All locations", "همه مکان‌ها");

  return (
    <section className="page-section">
      <div className="page-heading">
        <span className="section-kicker">{t("DIRECTORY", "فهرست")}</span>
        <h1>{t("Registry catalogue", "فهرست ثبت‌ها")}</h1>
        <p>{t("Search and narrow the listings by location and category. Filters are saved in the page URL.", "ثبت‌ها را بر اساس مکان و دسته‌بندی جستجو و محدود کنید. فیلترها در نشانی صفحه ذخیره می‌شوند.")}</p>
      </div>
      <div className="catalogue-layout">
        <aside className="filter-panel" aria-label={t("Catalogue filters", "فیلترهای کاتالوگ")}>
          <div className="filter-title"><SlidersHorizontal size={17} aria-hidden="true" /><h2>{t("Search & filters", "جستجو و فیلترها")}</h2></div>
          <label className="filter-control">
            <span>{t("Search", "جستجو")}</span>
            <span className="input-with-icon"><Search size={17} aria-hidden="true" /><input type="search" value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} placeholder={t("Persian or English title", "عنوان فارسی یا انگلیسی")} /></span>
          </label>
          <FilterSelect label={t("Country", "کشور")} value={filters.country} onChange={(value) => updateFilter("country", value)} options={availableCountries.map((item) => [item.id, t(item.name_en, item.name_fa)])} empty={t("All countries", "همه کشورها")} />
          <FilterSelect label={t("City", "شهر")} value={filters.city} onChange={(value) => updateFilter("city", value)} options={availableCities.map((item) => [item.id, t(item.name_en, item.name_fa)])} empty={t("All cities", "همه شهرها")} disabled={!availableCities.length} />
          <FilterSelect label={t("Institution", "مؤسسه")} value={filters.institution} onChange={(value) => updateFilter("institution", value)} options={availableInstitutions.map((item) => [item.id, t(item.name_en, item.name_fa)])} empty={t("All institutions", "همه مؤسسه‌ها")} disabled={!availableInstitutions.length} />
          <FilterSelect label={t("Category", "دسته‌بندی")} value={filters.category} onChange={(value) => updateFilter("category", value)} options={availableCategories.map((item) => [item.id, t(item.name_en, item.name_fa)])} empty={t("All categories", "همه دسته‌بندی‌ها")} disabled={!availableCategories.length} />
          <FilterSelect label={t("Field", "حوزه")} value={filters.field} onChange={(value) => updateFilter("field", value)} options={availableFields.map((item) => [item.id, t(item.name_en, item.name_fa)])} empty={fields.length ? t("All fields", "همه حوزه‌ها") : t("No fields recorded", "حوزه‌ای ثبت نشده")} disabled={!availableFields.length} />
          <button type="button" className="clear-filters" onClick={clearFilters}>{t("Clear all filters", "پاک‌کردن همه فیلترها")}</button>
        </aside>

        <div className="results-area">
          <div className="results-summary">
            <strong>{formattedCount} {t("registries", "ثبت")}</strong>
            <span><MapPin size={15} aria-hidden="true" />{locationLabel}</span>
          </div>
          {filtered.length ? (
            <div className="registry-grid">
              {filtered.map((registry) => {
                const category = categoryById.get(registry.category_id);
                const institution = institutionById.get(registry.institution_id);
                const city = cityById.get(institution?.city_id ?? "");
                const field = fieldById.get(registry.field_id);
                return (
                  <Link key={registry.id} href={`/registries/${registry.id}`} className="registry-card">
                    <div className="registry-card-top">
                      <span className="registry-category">{category ? t(category.name_en, category.name_fa) : t("Uncategorized", "بدون دسته‌بندی")}</span>
                      <span className="registry-arrow" aria-hidden="true">↗</span>
                    </div>
                    <h2 lang="fa" dir="rtl">{registry.title_fa}</h2>
                    <p className="registry-title-en" lang="en" dir="ltr">{registry.title_en}</p>
                    <dl className="registry-meta">
                      <div><dt>{t("Field", "حوزه")}</dt><dd>{field ? t(field.name_en, field.name_fa) : t("Not provided", "ثبت نشده")}</dd></div>
                      <div><dt>{t("Institution", "مؤسسه")}</dt><dd>{institution ? t(institution.name_en, institution.name_fa) : t("Not provided", "ثبت نشده")}</dd></div>
                      <div><dt>{t("City", "شهر")}</dt><dd>{city ? t(city.name_en, city.name_fa) : t("Not provided", "ثبت نشده")}</dd></div>
                    </dl>
                    <span className="card-read-more">{t("Registry details", "جزئیات ثبت")}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={26} aria-hidden="true" />
              <h2>{t("No registries found", "ثبت موردنظر پیدا نشد")}</h2>
              <p>{t("Try another search term or remove one of the filters.", "عبارت دیگری جستجو کنید یا برخی فیلترها را بردارید.")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ label, value, onChange, options, empty, disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  empty: string;
  disabled?: boolean;
}) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-label={label}>
        <option value="">{empty}</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}
