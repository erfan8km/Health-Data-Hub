import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, Baby, Brain, ChevronLeft,
  CircleDot, ExternalLink, Eye, Globe2, HeartPulse, MapPin, Menu, Moon,
  Search, ShieldCheck, Sparkles, Stethoscope, X, Ear,
} from "lucide-react";
import GlobeScene from "./components/GlobeScene";
import ProvinceMap from "./components/ProvinceMap";

type Category = { id: string; fa: string; en: string };
type Country = { id: string; iso3: string; fa: string; en: string; coordinates: { longitude: number; latitude: number; height: number } };
type Province = { id: string; fa: string; en: string; active: boolean };
type Registry = { slug: string; fa: string; en: string; country: string; province: string; city: string; categories: string[]; description: string; officialUrl: string; targetPopulation: string; center: string; status: string; lastReviewedAt: string; startYear: string; registryType: string; dataSummary: string; researchContact: string; keyPublications: { title: string; url: string }[] };
type View = "globe" | "provinces" | "categories" | "category" | "registry";
type Route = { view: View; slug?: string; provinceId?: string };
const ACTIVE_PROVINCE_ID = "razavi-khorasan";
const BASE = import.meta.env.BASE_URL || "./";
const icons: Record<string, typeof Activity> = {
  gyn: HeartPulse, onc: Activity, peds: Baby, endo: Activity, ent: Ear, eye: Eye,
  sleep: Moon, gi: Stethoscope, immun: ShieldCheck, "neuro-icu": Brain, oral: Sparkles,
};
const englishBlurbs: Record<string, string> = {
  gyn: "Women's health and obstetrics",
  onc: "Cancer registries and oncology research",
  peds: "Paediatric diseases and child-health registries",
  endo: "Endocrine and metabolic disorders",
  ent: "Otolaryngology and audiology",
  eye: "Ophthalmology and vision sciences",
  sleep: "Respiratory medicine and sleep disorders",
  gi: "Gastroenterology, hepatology and transplantation",
  immun: "Infectious diseases and immunology",
  "neuro-icu": "Neurology and brain-death care",
  oral: "Dermatology and oral mucosal disease",
};
const persianBlurbs: Record<string, string> = {
  gyn: "سلامت زنان و مامایی", onc: "ریجستری‌های سرطان و پژوهش‌های سرطان‌شناسی",
  peds: "بیماری‌های کودکان و سلامت اطفال", endo: "غدد درون‌ریز و اختلالات متابولیک",
  ent: "گوش، حلق و بینی و شنوایی‌شناسی", eye: "چشم‌پزشکی و علوم بینایی",
  sleep: "بیماری‌های تنفسی و اختلالات خواب", gi: "گوارش، کبد و پیوند",
  immun: "بیماری‌های عفونی و ایمنی‌شناسی", "neuro-icu": "مغز و اعصاب و مراقبت‌های مرتبط با مرگ مغزی",
  oral: "پوست و بیماری‌های مخاطی دهان",
};

function parseRoute(): Route {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return { view: "globe" };
  if (parts[0] === "provinces") return { view: "provinces" };
  if (parts[0] === "categories") {
    return parts[1]
      ? { view: "categories", provinceId: decodeURIComponent(parts[1]) }
      : { view: "provinces" };
  }
  if (parts[0] === "category" && parts[1]) return { view: "category", slug: decodeURIComponent(parts[1]), provinceId: parts[2] ? decodeURIComponent(parts[2]) : ACTIVE_PROVINCE_ID };
  if (parts[0] === "registry" && parts[1]) return { view: "registry", slug: decodeURIComponent(parts[1]), provinceId: parts[2] ? decodeURIComponent(parts[2]) : ACTIVE_PROVINCE_ID };
  return { view: "globe" };
}
function navigate(path: string) {
  const hash = path ? "#/" + path : "#/";
  if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = hash;
}
function getText(category: Category | undefined, english: boolean) {
  return category ? (english ? category.en : category.fa) : "";
}
function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [english, setEnglish] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const update = () => { setRoute(parseRoute()); setQuery(""); setMobileMenu(false); };
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  useEffect(() => {
    if (!dataReady) return;
    if (["categories", "category", "registry"].includes(route.view)) {
      const province = provinces.find((item) => item.id === (route.provinceId || ACTIVE_PROVINCE_ID));
      if (!province?.active) navigate("provinces");
    }
  }, [dataReady, route.view, route.provinceId, provinces]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(BASE + "data/categories.json").then((r) => { if (!r.ok) throw new Error("categories"); return r.json(); }),
      fetch(BASE + "data/countries.json").then((r) => { if (!r.ok) throw new Error("countries"); return r.json(); }),
      fetch(BASE + "data/registries.json").then((r) => { if (!r.ok) throw new Error("registries"); return r.json(); }),
      fetch(BASE + "data/provinces.json").then((r) => { if (!r.ok) throw new Error("provinces"); return r.json(); }),
    ]).then(([categoryRows, countryRows, registryRows, provinceRows]) => {
      if (!active) return;
      setCategories(categoryRows as Category[]);
      setCountries(countryRows as Country[]);
      setRegistries(registryRows as Registry[]);
      setProvinces(provinceRows as Province[]);
      setDataReady(true);
    }).catch(() => {
      if (!active) return;
      setDataError(true);
      setDataReady(true);
    });
    return () => { active = false; };
  }, []);

  const selectedCategory = useMemo(() => categories.find((item) => item.id === route.slug), [categories, route.slug]);
  const selectedRegistry = useMemo(() => registries.find((item) => item.slug === route.slug), [registries, route.slug]);
  const selectedCountry = countries.find((item) => item.id === selectedRegistry?.country) || countries[0];
  const selectedProvince = provinces.find((item) => item.id === (route.provinceId || ACTIVE_PROVINCE_ID));
  const visibleRegistries = useMemo(() => registries.filter((registry) =>
    registry.province === (route.provinceId || ACTIVE_PROVINCE_ID)
  ), [registries, route.provinceId]);
  const categoryRows = useMemo(() => categories.map((category) => ({
    ...category,
    count: visibleRegistries.filter((registry) => registry.categories.includes(category.id)).length,
  })), [categories, visibleRegistries]);
  const listRows = useMemo(() => visibleRegistries.filter((registry) => {
    if (route.view === "category" && !registry.categories.includes(route.slug || "")) return false;
    const text = query.trim().toLocaleLowerCase();
    return !text || [registry.fa, registry.en, registry.slug].some((value) => value.toLocaleLowerCase().includes(text));
  }), [visibleRegistries, query, route.view, route.slug]);
  const categoryBlurb = (id: string) => (english ? englishBlurbs[id] : persianBlurbs[id]) || "";
  const missingMetadataText = english ? "Not completed yet" : "هنوز تکمیل نشده";

  return (
    <main className={"app-root" + ((route.view === "category" || route.view === "registry") ? " app-root-paper" : " app-root-space")}>
      <GlobeScene view={route.view} onArrival={() => setCategoriesReady(true)} onSelectIran={() => { setCategoriesReady(false); navigate("provinces"); }} />

      {(route.view === "globe" || route.view === "provinces" || route.view === "categories") && <header className="space-header">
        <a href="#/" className="brand-lockup" aria-label="RegistryHub Home">
          <span className="brand-symbol"><Globe2 size={19} /></span>
          <span className="brand-words"><strong>RegistryHub</strong><small>HEALTH REGISTRY DIRECTORY</small></span>
        </a>
        <div className="header-actions">
          <button className="subtle-button language-button" type="button" onClick={() => setEnglish((value) => !value)}>{english ? "فارسی" : "EN"}</button>
          <button className="icon-button menu-button" type="button" aria-label="منو" onClick={() => setMobileMenu((value) => !value)}>{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {mobileMenu && <nav className="mobile-menu">
          <button type="button" onClick={() => navigate("")}>{english ? "Back to globe" : "بازگشت به کره"}</button>
          <button type="button" onClick={() => navigate("provinces")}>{english ? "Choose province" : "انتخاب استان"}</button>
          <button type="button" onClick={() => setEnglish((value) => !value)}>{english ? "فارسی" : "English"}</button>
        </nav>}
      </header>}

      {route.view === "provinces" && <section className={"province-overlay" + (categoriesReady ? " province-overlay-visible" : "")} aria-label={english ? "Choose an Iranian province" : "انتخاب استان‌های ایران"}>
        <div className="provinces-panel">
          <div className="panel-topline"><span className="panel-index">01 / 31</span><span className="panel-line" /><span className="panel-state"><span className="header-live-dot" /> {english ? "IRAN / PROVINCES" : "ایران / استان‌ها"}</span></div>
          <div className="panel-heading">
            <div><p className="eyebrow">{english ? "REGIONAL CATALOGUE" : "کاتالوگ استانی"}</p><h1>{english ? "Choose a province" : "یک استان انتخاب کنید"}</h1><p>{english ? "Only active provinces can be selected. Other provinces will be enabled later." : "در حال حاضر فقط استان خراسان رضوی فعال است؛ استان‌های دیگر بعداً فعال می‌شوند."}</p></div>
            <button type="button" className="back-to-globe" onClick={() => navigate("")}><Globe2 size={16} /> {english ? "Back to globe" : "بازگشت به کره"}</button>
          </div>
          {!dataReady && <div className="data-loading"><span className="spinner" /> {english ? "Loading province catalogue…" : "در حال بارگذاری فهرست استان‌ها…"}</div>}
          {dataError && <div className="data-error">{english ? "Catalogue data could not be loaded. Please refresh." : "داده‌های کاتالوگ بارگذاری نشد. صفحه را تازه‌سازی کنید."}</div>}
          {dataReady && !dataError && <ProvinceMap provinces={provinces} english={english} onSelectProvince={(provinceId) => {
            const province = provinces.find((item) => item.id === provinceId);
            if (province?.active) { setCategoriesReady(false); navigate("categories/" + province.id); }
          }} />}
          <div className="panel-footer"><span>{english ? "IRAN / PROVINCES" : "ایران / استان‌ها"}</span><span>{provinces.filter((province) => province.active).length} {english ? "active province" : "استان فعال"}</span></div>
        </div>
      </section>}

      {route.view === "categories" && <section className={"category-overlay" + (categoriesReady ? " category-overlay-visible" : "")} aria-label={english ? "Clinical categories" : "دسته‌های بالینی"}>
        <div className="categories-panel">
          <div className="panel-topline"><span className="panel-index">01 / 11</span><span className="panel-line" /><span className="panel-state"><span className="header-live-dot" /> {english ? "PROVINCE SELECTED" : "استان انتخاب شد"}</span></div>
          <div className="panel-heading">
            <div><p className="eyebrow">{english ? "CLINICAL LANDSCAPE" : "حوزه‌های تخصصی"}</p><h1>{english ? "Explore by clinical field" : "یک حوزه‌ی بالینی انتخاب کنید"}</h1><p>{english ? `Browse registries in ${selectedProvince?.en || "the selected province"}.` : `ریجستری‌های استان ${selectedProvince?.fa || "انتخاب‌شده"} را بر اساس حوزه‌ی تخصصی مرور کنید.`}</p></div>
            <button type="button" className="back-to-globe" onClick={() => { setCategoriesReady(false); navigate("provinces"); }}><MapPin size={16} /> {english ? "Back to provinces" : "بازگشت به استان‌ها"}</button>
          </div>
          {!dataReady && <div className="data-loading"><span className="spinner" /> {english ? "Loading catalogue…" : "در حال بارگذاری کاتالوگ…"}</div>}
          {dataError && <div className="data-error">{english ? "The catalogue data could not be loaded. Please refresh." : "داده‌های کاتالوگ بارگذاری نشد. صفحه را تازه‌سازی کنید."}</div>}
          {dataReady && !dataError && <div className="category-card-grid">
            {categoryRows.map((category, index) => {
              const Icon = icons[category.id] || Activity;
              return <button type="button" className="atlas-category-card" key={category.id} onClick={() => navigate("category/" + category.id + "/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>
                <span className="atlas-category-icon"><Icon size={20} strokeWidth={1.6} /></span>
                <span className="atlas-category-text"><strong>{getText(category, english)}</strong><small>{categoryBlurb(category.id)}</small></span>
                <span className="atlas-category-meta"><strong>{String(category.count).padStart(2, "0")}</strong><ChevronLeft size={16} /></span>
                <span className="category-index-watermark">{String(index + 1).padStart(2, "0")}</span>
              </button>;
            })}
          </div>}
          <div className="panel-footer"><span>{english ? `${selectedProvince?.en || "Iran"} / REGISTRY LANDSCAPE` : `${selectedProvince?.fa || "ایران"} / نمای ریجستری‌ها`}</span><span>{visibleRegistries.length} {english ? "records" : "مدخل"}</span></div>
        </div>
      </section>}

      {(route.view === "category" || route.view === "registry") && <div className="paper-shell" dir={english ? "ltr" : "rtl"}>
        <header className="paper-header">
          <a href="#/" className="paper-brand"><span className="paper-brand-mark"><Globe2 size={19} /></span><span><strong>RegistryHub</strong><small>HEALTH REGISTRY DIRECTORY</small></span></a>
          <div className="paper-header-actions"><button type="button" className="subtle-button" onClick={() => setEnglish((value) => !value)}>{english ? "فارسی" : "EN"}</button><button type="button" className="paper-back" onClick={() => navigate("categories/" + (route.provinceId || ACTIVE_PROVINCE_ID))}><ArrowRight size={16} /> {english ? "Clinical categories" : "دسته‌های بالینی"}</button></div>
        </header>
        {route.view === "category" && <section className="catalogue-page">
          <div className="breadcrumb"><button type="button" onClick={() => navigate("categories/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>{english ? "Clinical categories" : "دسته‌های بالینی"}</button><ChevronLeft size={14} /><span>{getText(selectedCategory, english)}</span></div>
          {!selectedCategory ? <div className="empty-state"><h1>{english ? "Category not found" : "دسته پیدا نشد"}</h1><button type="button" className="text-back" onClick={() => navigate("categories/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>{english ? "Return to categories" : "بازگشت به دسته‌ها"} <ArrowLeft size={15} /></button></div> : <>
            <div className="catalogue-heading">
              <div><p className="section-kicker">{english ? "CLINICAL CATEGORY" : "دسته‌ی بالینی"} / {selectedCategory.id.toUpperCase()}</p><h1>{getText(selectedCategory, english)}</h1><p>{categoryBlurb(selectedCategory.id)}</p></div>
              <span className="catalogue-total">{String(listRows.length).padStart(2, "0")} <small>{english ? "registries" : "ریجستری"}</small></span>
            </div>
            <div className="catalogue-toolbar"><label className="catalogue-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={english ? "Search registries…" : "جست‌وجوی ریجستری‌ها…"} /></label><span>{english ? "INITIAL CATALOGUE" : "کاتالوگ اولیه"} <i /> {listRows.length} {english ? "items" : "مدخل"}</span></div>
            {!dataReady && <div className="empty-state"><span className="spinner" /> {english ? "Loading…" : "در حال بارگذاری…"}</div>}
            {dataReady && !listRows.length && <div className="empty-state"><Search size={23} /><h2>{english ? "No registries found" : "ریجستری‌ای پیدا نشد"}</h2><p>{english ? "Try a different search phrase." : "عبارت دیگری را جست‌وجو کنید."}</p></div>}
            <div className="registry-list">{listRows.map((registry, index) => <RegistryCard key={registry.slug} registry={registry} categories={categories} english={english} index={index} onClick={() => navigate("registry/" + registry.slug + "/" + (route.provinceId || ACTIVE_PROVINCE_ID))} />)}</div>
          </>}
        </section>}
        {route.view === "registry" && <section className="registry-detail-page">
          <div className="breadcrumb"><button type="button" onClick={() => navigate("categories/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>{english ? "Clinical categories" : "دسته‌های بالینی"}</button><ChevronLeft size={14} /><button type="button" onClick={() => navigate("category/" + (selectedRegistry?.categories[0] || "gyn") + "/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>{getText(categories.find((item) => item.id === selectedRegistry?.categories[0]), english)}</button><ChevronLeft size={14} /><span>{selectedRegistry ? (english ? selectedRegistry.en : selectedRegistry.fa) : (english ? "Registry" : "ریجستری")}</span></div>
          {!selectedRegistry ? <div className="empty-state"><h1>{english ? "Registry not found" : "ریجستری پیدا نشد"}</h1><button type="button" className="text-back" onClick={() => navigate("categories/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>{english ? "Return to categories" : "بازگشت به دسته‌ها"} <ArrowLeft size={15} /></button></div> : <>
            <div className="detail-kicker"><span className="detail-kicker-icon"><Activity size={18} /></span><span>{english ? "REGISTRY PROFILE" : "شناسنامه‌ی ریجستری"}</span><span className="detail-id">RegistryHub / {selectedRegistry.slug.toUpperCase()}</span></div>
            <div className="registry-detail-heading"><p className="section-kicker">{english ? "BILINGUAL REGISTRY TITLES" : "عنوان فارسی و انگلیسی"}</p><h1>{english ? selectedRegistry.en : selectedRegistry.fa}</h1><p className="detail-english-title">{english ? selectedRegistry.fa : selectedRegistry.en}</p></div>
            <div className="detail-content-grid">
              <article className="detail-main-card">
                <h2>{english ? "Registry profile" : "مشخصات ریجستری"}</h2>
                <h3>{english ? "Short description" : "توضیح کوتاه"}</h3>
                <p>{selectedRegistry.description.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Target population" : "جمعیت هدف"}</h3>
                <p>{selectedRegistry.targetPopulation.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Center and city" : "مرکز و شهر"}</h3>
                <div className="side-info"><small>{english ? "CENTER" : "مرکز"}</small><strong>{selectedRegistry.center.trim() || missingMetadataText}</strong></div>
                <div className="side-info"><small>{english ? "CITY" : "شهر"}</small><strong>{selectedRegistry.city === "mashhad" ? (english ? "Mashhad" : "مشهد") : selectedRegistry.city || missingMetadataText}</strong></div>
                <div className="detail-separator" />
                <h3>{english ? "Status" : "وضعیت"}</h3>
                <p>{selectedRegistry.status.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Last information review" : "تاریخ آخرین بررسی اطلاعات"}</h3>
                <p>{selectedRegistry.lastReviewedAt.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Start year" : "سال شروع"}</h3>
                <p>{selectedRegistry.startYear.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Registry type" : "نوع ریجستری"}</h3>
                <p>{selectedRegistry.registryType.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Summary of collected data" : "خلاصه‌ی نوع داده‌هایی که جمع‌آوری می‌شود"}</h3>
                <p>{selectedRegistry.dataSummary.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Research contact or collaboration" : "راه ارتباط یا همکاری پژوهشی"}</h3>
                <p>{selectedRegistry.researchContact.trim() || missingMetadataText}</p>
                <div className="detail-separator" />
                <h3>{english ? "Key publications" : "مقالات اصلی با لینک"}</h3>
                {selectedRegistry.keyPublications.length ? <ul>{selectedRegistry.keyPublications.map((publication, index) => <li key={index}>{publication.url.trim() ? <a href={publication.url} target="_blank" rel="noopener noreferrer">{publication.title || publication.url}</a> : (publication.title || missingMetadataText)}</li>)}</ul> : <p>{missingMetadataText}</p>}
                <div className="detail-separator" />
                <h3>{english ? "Clinical category" : "حیطه‌ی بالینی"}</h3>
                <div className="detail-tags">{selectedRegistry.categories.map((id) => {
                  const category = categories.find((item) => item.id === id);
                  return <button key={id} type="button" className="detail-tag" onClick={() => navigate("category/" + id + "/" + (route.provinceId || ACTIVE_PROVINCE_ID))}>{getText(category, english)} <ArrowDownLeft size={13} /></button>;
                })}</div>
                {selectedRegistry.officialUrl.trim() && <a className="official-link-button" href={selectedRegistry.officialUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} />{english ? "Official university link" : "لینک رسمی دانشگاه"}<ArrowLeft size={15} /></a>}
              </article>
              <aside className="detail-side-card">
                <div className="side-card-header"><MapPin size={17} /><strong>{english ? "Geographic information" : "اطلاعات جغرافیایی"}</strong></div>
                <div className="side-info"><small>{english ? "COUNTRY" : "کشور"}</small><strong>{selectedCountry ? (english ? selectedCountry.en : selectedCountry.fa) : (english ? "Iran" : "ایران")}</strong></div>
                <div className="side-info"><small>{english ? "PROVINCE" : "استان"}</small><strong>{english ? (provinces.find((province) => province.id === selectedRegistry.province)?.en || "Razavi Khorasan") : (provinces.find((province) => province.id === selectedRegistry.province)?.fa || "خراسان رضوی")}</strong></div>
                <div className="side-info"><small>{english ? "CITY" : "شهر"}</small><strong>{english ? "Mashhad" : "مشهد"}</strong></div>
                <div className="side-info"><small>{english ? "REGISTRY ID" : "شناسه‌ی ریجستری"}</small><strong className="side-id">{selectedRegistry.slug}</strong></div>
                <div className="side-note"><CircleDot size={14} /><span>{english ? "Initial catalogue entry" : "مدخل کاتالوگ اولیه"}</span></div>
              </aside>
            </div>
            <button type="button" className="bottom-back-link" onClick={() => navigate("category/" + (selectedRegistry.categories[0] || "gyn") + "/" + (route.provinceId || ACTIVE_PROVINCE_ID))}><ArrowRight size={16} /> {english ? "Back to category" : "بازگشت به دسته‌ی مربوطه"}</button>
          </>}
        </section>}
      </div>}
    </main>
  );
}

function RegistryCard({ registry, categories, english, index, onClick }: {
  registry: Registry; categories: Category[]; english: boolean; index: number; onClick: () => void;
}) {
  const tags = registry.categories.map((id) => categories.find((category) => category.id === id)).filter(Boolean) as Category[];
  return <button type="button" className="registry-row-card" onClick={onClick}>
    <span className="registry-row-index">{String(index + 1).padStart(2, "0")}</span>
    <span className="registry-row-info"><strong>{english ? registry.en : registry.fa}</strong><small>{english ? registry.fa : registry.en}</small><span className="registry-row-tags">{tags.map((category) => <i key={category.id}>{getText(category, english)}</i>)}</span></span>
    <span className="registry-row-arrow"><ArrowLeft size={18} /></span>
  </button>;
}
export default App;
