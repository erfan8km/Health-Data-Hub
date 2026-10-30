import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpLeft, Search, ShieldCheck } from "lucide-react";
import { categories, registries } from "@/lib/catalogue-data";
import { useLanguage } from "@/lib/language";
import { usePageMeta } from "@/lib/use-page-meta";

export default function Home() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const title = t("Iran Medical Registry Catalogue | RegistryHub", "کاتالوگ ثبت‌های پزشکی ایران | RegistryHub");
  const description = t(
    "Browse a bilingual metadata catalogue of medical registries in Iran.",
    "کاتالوگی دوزبانه برای مرور فراداده ثبت‌های پزشکی ایران."
  );
  usePageMeta(title, description);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    setLocation(`/registries${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" />{t("BILINGUAL · METADATA ONLY", "دوزبانه · فقط فراداده")}</span>
            <h1>{t("A clearer way to find medical registries.", "راهی روشن‌تر برای یافتن ثبت‌های پزشکی.")}</h1>
            <p>{t(
              "Browse registry information from Iran in Persian or English. This catalogue links to original sources; it does not host registry records.",
              "اطلاعات ثبت‌های پزشکی ایران را به فارسی یا انگلیسی مرور کنید. این کاتالوگ به منابع اصلی پیوند می‌دهد و داده‌های ثبت را میزبانی نمی‌کند."
            )}</p>
            <form className="hero-search" onSubmit={submitSearch} role="search">
              <label className="sr-only" htmlFor="home-search">{t("Search registries", "جستجوی ثبت‌ها")}</label>
              <Search size={19} aria-hidden="true" />
              <input
                id="home-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Search titles in Persian or English", "جستجو به فارسی یا انگلیسی")}
                type="search"
              />
              <button className="button button-primary" type="submit">{t("Search", "جستجو")}</button>
            </form>
            <div className="hero-note">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{t("Metadata only — no patient records are stored here.", "فقط فراداده — هیچ پرونده بیمار در اینجا نگهداری نمی‌شود.")}</span>
            </div>
          </div>
          <div className="hero-aside" aria-label={t("Catalogue overview", "نمای کلی کاتالوگ")}>
            <div className="overview-label">{t("CATALOGUE OVERVIEW", "نمای کلی کاتالوگ")}</div>
            <div className="overview-number">{registries.length.toLocaleString(language === "fa" ? "fa-IR" : "en-US")}</div>
            <div className="overview-caption">{t("registry listings", "مورد ثبت‌شده")}</div>
            <div className="overview-divider" />
            <div className="overview-bottom">
              <div><strong>{categories.length.toLocaleString(language === "fa" ? "fa-IR" : "en-US")}</strong><span>{t("categories", "دسته‌بندی")}</span></div>
              <div><strong>{t("FA", "فا")} / {t("EN", "EN")}</strong><span>{t("languages", "زبان")}</span></div>
            </div>
            <span className="overview-ring ring-one" />
            <span className="overview-ring ring-two" />
          </div>
        </div>
      </section>

      <section className="section-block category-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("EXPLORE", "مرور")}</span>
            <h2>{t("Browse by category", "مرور بر اساس دسته‌بندی")}</h2>
            <p>{t("Choose a topic to see its registry listings.", "یک موضوع را برای دیدن ثبت‌های مرتبط انتخاب کنید.")}</p>
          </div>
          <Link href="/registries" className="text-link">
            {t("All registries", "همه ثبت‌ها")} <ArrowUpLeft size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => {
            const count = registries.filter((registry) => registry.category_id === category.id).length;
            const params = new URLSearchParams({ category: category.id });
            return (
              <Link key={category.id} href={`/registries?${params.toString()}`} className="category-card">
                <span className={`category-index category-index-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{t(category.name_en, category.name_fa)}</h3>
                  <p>{t(category.description_en, category.description_fa)}</p>
                </div>
                <span className="category-count">{count.toLocaleString(language === "fa" ? "fa-IR" : "en-US")}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="location-strip">
        <div className="location-strip-inner">
          <div><span className="section-kicker">{t("CURRENT COVERAGE", "پوشش فعلی")}</span><strong>{t("Iran", "ایران")} <span>·</span> {t("Mashhad", "مشهد")}</strong></div>
          <p>{t("The catalogue starts with registry listings associated with Mashhad University of Medical Sciences.", "این کاتالوگ با ثبت‌های مرتبط با دانشگاه علوم پزشکی مشهد آغاز می‌شود.")}</p>
          <Link href="/registries" className="button button-outline">{t("Explore the catalogue", "مشاهده کاتالوگ")} <ArrowUpLeft size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
