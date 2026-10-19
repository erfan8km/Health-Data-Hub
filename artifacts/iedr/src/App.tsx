import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, Baby, Brain, ChevronLeft,
  CircleDot, ExternalLink, Eye, Globe2, HeartPulse, MapPin, Menu, Moon,
  Search, ShieldCheck, Sparkles, Stethoscope, X, Ear,
} from "lucide-react";
import GlobeScene from "./components/GlobeScene";

type Category = { id: string; fa: string; en: string };
type Country = { id: string; iso3: string; fa: string; en: string; coordinates: { longitude: number; latitude: number; height: number } };
type Registry = { slug: string; fa: string; en: string; country: string; city: string; categories: string[]; description: string; officialUrl: string };
type View = "globe" | "categories" | "category" | "registry";
type Route = { view: View; slug?: string };
const BASE = import.meta.env.BASE_URL || "./";
const icons: Record<string, typeof Activity> = {
  gyn: HeartPulse, onc: Activity, peds: Baby, endo: Activity, ent: Ear, eye: Eye,
  sleep: Moon, gi: Stethoscope, immun: ShieldCheck, "neuro-icu": Brain, oral: Sparkles,
};
const englishBlurbs: Record<string, string> = {
  gyn: "Women's health, obstetrics and reproductive medicine",
  onc: "Cancer registries and oncology research",
  peds: "Paediatric registries and child health",
  endo: "Endocrine, metabolic and obesity-related registries",
  ent: "Otolaryngology and hearing-related registries",
  eye: "Ophthalmology and vision research",
  sleep: "Sleep medicine and sleep-disorder registries",
  gi: "Gastroenterology, hepatology and transplantation",
  immun: "Immunology and infectious-disease registries",
  "neuro-icu": "Neurology, brain health and critical care",
  oral: "Oral medicine and dental research",
};
const persianBlurbs: Record<string, string> = {
  gyn: "سلامت زنان، مامایی و پزشکی باروری", onc: "ریجستری‌های سرطان و پژوهش‌های انکولوژی",
  peds: "ریجستری‌های کودکان و سلامت اطفال", endo: "غدد درون‌ریز، متابولیسم و چاقی",
  ent: "گوش، حلق و بینی و شنوایی", eye: "چشم‌پزشکی و پژوهش‌های بینایی",
  sleep: "پزشکی خواب و اختلالات خواب", gi: "گوارش، کبد و پیوند",
  immun: "ایمنی‌شناسی و بیماری‌های عفونی", "neuro-icu": "مغز و اعصاب و مراقبت‌های ویژه",
  oral: "پزشکی دهان و پژوهش‌های دندان‌پزشکی",
};

function parseRoute(): Route {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return { view: "globe" };
  if (parts[0] === "categories") return { view: "categories" };
  if (parts[0] === "category" && parts[1]) return { view: "category", slug: decodeURIComponent(parts[1]) };
  if (parts[0] === "registry" && parts[1]) return { view: "registry", slug: decodeURIComponent(parts[1]) };
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
    let active = true;
    Promise.all([
      fetch(BASE + "data/categories.json").then((r) => { if (!r.ok) throw new Error("categories"); return r.json(); }),
      fetch(BASE + "data/countries.json").then((r) => { if (!r.ok) throw new Error("countries"); return r.json(); }),
      fetch(BASE + "data/registries.json").then((r) => { if (!r.ok) throw new Error("registries"); return r.json(); }),
    ]).then(([categoryRows, countryRows, registryRows]) => {
      if (!active) return;
      setCategories(categoryRows as Category[]);
      setCountries(countryRows as Country[]);
      setRegistries(registryRows as Registry[]);
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
  const categoryRows = useMemo(() => categories.map((category) => ({
    ...category,
    count: registries.filter((registry) => registry.categories.includes(category.id)).length,
  })), [categories, registries]);
  const listRows = useMemo(() => registries.filter((registry) => {
    if (route.view === "category" && !registry.categories.includes(route.slug || "")) return false;
    const text = query.trim().toLocaleLowerCase();
    return !text || [registry.fa, registry.en, registry.slug].some((value) => value.toLocaleLowerCase().includes(text));
  }), [registries, query, route.view, route.slug]);
  const activeCountryCount = new Set(registries.map((registry) => registry.country)).size;
  const categoryBlurb = (id: string) => (english ? englishBlurbs[id] : persianBlurbs[id]) || "";

  return (
    <main className={"app-root" + ((route.view === "category" || route.view === "registry") ? " app-root-paper" : " app-root-space")}>
      <GlobeScene view={route.view} onArrival={() => setCategoriesReady(true)} onSelectIran={() => { setCategoriesReady(false); navigate("categories"); }} />

      {(route.view === "globe" || route.view === "categories") && <header className="space-header">
        <a href="#/" className="brand-lockup" aria-label="IEDR Home">
          <span className="brand-symbol"><Globe2 size={19} /></span>
          <span className="brand-words"><strong>IEDR</strong><small>IRAN EPIDEMIOLOGY DATA REPOSITORY</small></span>
        </a>
        <div className="header-center"><span className="header-live-dot" /> {english ? "IRAN HEALTH REGISTRY ATLAS" : "اطلس ریجستری‌های سلامت ایران"}</div>
        <div className="header-actions">
          <button className="subtle-button language-button" type="button" onClick={() => setEnglish((value) => !value)}>{english ? "فارسی" : "EN"}</button>
          <button className="icon-button menu-button" type="button" aria-label="منو" onClick={() => setMobileMenu((value) => !value)}>{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {mobileMenu && <nav className="mobile-menu">
          <button type="button" onClick={() => navigate("")}>{english ? "Back to globe" : "بازگشت به کره"}</button>
          <button type="button" onClick={() => navigate("categories")}>{english ? "Clinical categories" : "دسته‌های بالینی"}</button>
          <button type="button" onClick={() => setEnglish((value) => !value)}>{english ? "فارسی" : "English"}</button>
        </nav>}
      </header>}

      {route.view === "categories" && <section className={"category-overlay" + (categoriesReady ? " category-overlay-visible" : "")} aria-label={english ? "Clinical categories" : "دسته‌های بالینی"}>
        <div className="categories-panel">
          <div className="panel-topline"><span className="panel-index">01 / 11</span><span className="panel-line" /><span className="panel-state"><span className="header-live-dot" /> {english ? "IRAN SELECTED" : "ایران انتخاب شد"}</span></div>
          <div className="panel-heading">
            <div><p className="eyebrow">{english ? "CLINICAL LANDSCAPE" : "حوزه‌های تخصصی"}</p><h1>{english ? "Explore by clinical field" : "یک حوزه‌ی بالینی انتخاب کنید"}</h1><p>{english ? "Browse the initial registry catalogue by specialty." : "ریجستری‌های اولیه را بر اساس دسته‌ی تخصصی مرور کنید."}</p></div>
            <button type="button" className="back-to-globe" onClick={() => navigate("")}><Globe2 size={16} /> {english ? "Back to globe" : "بازگشت به کره"}</button>
          </div>
          {!dataReady && <div className="data-loading"><span className="spinner" /> {english ? "Loading catalogue…" : "در حال بارگذاری کاتالوگ…"}</div>}
          {dataError && <div className="data-error">{english ? "The catalogue data could not be loaded. Please refresh." : "داده‌های کاتالوگ بارگذاری نشد. صفحه را تازه‌سازی کنید."}</div>}
          {dataReady && !dataError && <div className="category-card-grid">
            {categoryRows.map((category, index) => {
              const Icon = icons[category.id] || Activity;
              return <button type="button" className="atlas-category-card" key={category.id} onClick={() => navigate("category/" + category.id)}>
                <span className="atlas-category-icon"><Icon size={20} strokeWidth={1.6} /></span>
                <span className="atlas-category-text"><strong>{getText(category, english)}</strong><small>{categoryBlurb(category.id)}</small></span>
                <span className="atlas-category-meta"><strong>{String(category.count).padStart(2, "0")}</strong><ChevronLeft size={16} /></span>
                <span className="category-index-watermark">{String(index + 1).padStart(2, "0")}</span>
              </button>;
            })}
          </div>}
          <div className="panel-footer"><span>{english ? "IRAN / NATIONAL REGISTRY LANDSCAPE" : "ایران / نمای کلی ریجستری‌های ملی"}</span><span>{registries.length} {english ? "initial records" : "مدخل اولیه"}</span></div>
        </div>
      </section>}

      {(route.view === "category" || route.view === "registry") && <div className="paper-shell" dir={english ? "ltr" : "rtl"}>
        <header className="paper-header">
          <a href="#/" className="paper-brand"><span className="paper-brand-mark"><Globe2 size={19} /></span><span><strong>IEDR</strong><small>IRAN EPIDEMIOLOGY DATA REPOSITORY</small></span></a>
          <div className="paper-header-actions"><button type="button" className="subtle-button" onClick={() => setEnglish((value) => !value)}>{english ? "فارسی" : "EN"}</button><button type="button" className="paper-back" onClick={() => navigate("categories")}><ArrowRight size={16} /> {english ? "Clinical categories" : "دسته‌های بالینی"}</button></div>
        </header>
        {route.view === "category" && <section className="catalogue-page">
          <div className="breadcrumb"><button type="button" onClick={() => navigate("categories")}>{english ? "Clinical categories" : "دسته‌های بالینی"}</button><ChevronLeft size={14} /><span>{getText(selectedCategory, english)}</span></div>
          {!selectedCategory ? <div className="empty-state"><h1>{english ? "Category not found" : "دسته پیدا نشد"}</h1><button type="button" className="text-back" onClick={() => navigate("categories")}>{english ? "Return to categories" : "بازگشت به دسته‌ها"} <ArrowLeft size={15} /></button></div> : <>
            <div className="catalogue-heading">
              <div><p className="section-kicker">{english ? "CLINICAL CATEGORY" : "دسته‌ی بالینی"} / {selectedCategory.id.toUpperCase()}</p><h1>{getText(selectedCategory, english)}</h1><p>{categoryBlurb(selectedCategory.id)}</p></div>
              <span className="catalogue-total">{String(listRows.length).padStart(2, "0")} <small>{english ? "registries" : "ریجستری"}</small></span>
            </div>
            <div className="catalogue-toolbar"><label className="catalogue-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={english ? "Search registries…" : "جست‌وجوی ریجستری‌ها…"} /></label><span>{english ? "INITIAL CATALOGUE" : "کاتالوگ اولیه"} <i /> {listRows.length} {english ? "items" : "مدخل"}</span></div>
            {!dataReady && <div className="empty-state"><span className="spinner" /> {english ? "Loading…" : "در حال بارگذاری…"}</div>}
            {dataReady && !listRows.length && <div className="empty-state"><Search size={23} /><h2>{english ? "No registries found" : "ریجستری‌ای پیدا نشد"}</h2><p>{english ? "Try a different search phrase." : "عبارت دیگری را جست‌وجو کنید."}</p></div>}
            <div className="registry-list">{listRows.map((registry, index) => <RegistryCard key={registry.slug} registry={registry} categories={categories} english={english} index={index} onClick={() => navigate("registry/" + registry.slug)} />)}</div>
          </>}
        </section>}
        {route.view === "registry" && <section className="registry-detail-page">
          <div className="breadcrumb"><button type="button" onClick={() => navigate("categories")}>{english ? "Clinical categories" : "دسته‌های بالینی"}</button><ChevronLeft size={14} /><button type="button" onClick={() => navigate("category/" + (selectedRegistry?.categories[0] || "gyn"))}>{getText(categories.find((item) => item.id === selectedRegistry?.categories[0]), english)}</button><ChevronLeft size={14} /><span>{selectedRegistry ? (english ? selectedRegistry.en : selectedRegistry.fa) : (english ? "Registry" : "ریجستری")}</span></div>
          {!selectedRegistry ? <div className="empty-state"><h1>{english ? "Registry not found" : "ریجستری پیدا نشد"}</h1><button type="button" className="text-back" onClick={() => navigate("categories")}>{english ? "Return to categories" : "بازگشت به دسته‌ها"} <ArrowLeft size={15} /></button></div> : <>
            <div className="detail-kicker"><span className="detail-kicker-icon"><Activity size={18} /></span><span>{english ? "REGISTRY PROFILE" : "شناسنامه‌ی ریجستری"}</span><span className="detail-id">IEDR / {selectedRegistry.slug.toUpperCase()}</span></div>
            <div className="registry-detail-heading"><p className="section-kicker">{english ? "IRAN · MASHHAD" : "ایران · مشهد"}</p><h1>{english ? selectedRegistry.en : selectedRegistry.fa}</h1><p className="detail-english-title">{english ? selectedRegistry.fa : selectedRegistry.en}</p></div>
            <div className="detail-content-grid">
              <article className="detail-main-card">
                <h2>{english ? "Registry overview" : "معرفی ریجستری"}</h2>
                {selectedRegistry.description.trim() ? <p>{selectedRegistry.description}</p> : null}
                <div className="detail-separator" />
                <h3>{english ? "Clinical categories" : "دسته‌های بالینی"}</h3>
                <div className="detail-tags">{selectedRegistry.categories.map((id) => {
                  const category = categories.find((item) => item.id === id);
                  return <button key={id} type="button" className="detail-tag" onClick={() => navigate("category/" + id)}>{getText(category, english)} <ArrowDownLeft size={13} /></button>;
                })}</div>
                {selectedRegistry.officialUrl.trim() && <a className="official-link-button" href={selectedRegistry.officialUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} />{english ? "Official university link" : "لینک رسمی دانشگاه"}<ArrowLeft size={15} /></a>}
              </article>
              <aside className="detail-side-card">
                <div className="side-card-header"><MapPin size={17} /><strong>{english ? "Geographic information" : "اطلاعات جغرافیایی"}</strong></div>
                <div className="side-info"><small>{english ? "COUNTRY" : "کشور"}</small><strong>{selectedCountry ? (english ? selectedCountry.en : selectedCountry.fa) : (english ? "Iran" : "ایران")}</strong></div>
                <div className="side-info"><small>{english ? "CITY" : "شهر"}</small><strong>{english ? "Mashhad" : "مشهد"}</strong></div>
                <div className="side-info"><small>{english ? "REGISTRY ID" : "شناسه‌ی ریجستری"}</small><strong className="side-id">{selectedRegistry.slug}</strong></div>
                <div className="side-note"><CircleDot size={14} /><span>{english ? "Initial catalogue entry" : "مدخل کاتالوگ اولیه"}</span></div>
              </aside>
            </div>
            <button type="button" className="bottom-back-link" onClick={() => navigate("category/" + (selectedRegistry.categories[0] || "gyn"))}><ArrowRight size={16} /> {english ? "Back to category" : "بازگشت به دسته‌ی مربوطه"}</button>
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
