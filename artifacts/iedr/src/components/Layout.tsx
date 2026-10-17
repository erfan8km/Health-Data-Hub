import React from "react";
import { Link, useRoute } from "wouter";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/language";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const navLinks = [
    { href: "/", labelEn: "Home", labelFa: "خانه" },
    { href: "/registries", labelEn: "Registries", labelFa: "ثبت‌ها" },
    { href: "/about", labelEn: "About", labelFa: "درباره" },
  ];

  return (
    <div className={`app-shell ${isRtl ? "rtl" : "ltr"}`}>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="IEDR home">
            <span className="brand-mark">I</span>
            <span>IEDR</span>
          </Link>
          <nav className="site-nav" aria-label={t("Main navigation", "ناوبری اصلی")}>
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {t(link.labelEn, link.labelFa)}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "fa" : "en")}
            className="language-toggle"
            aria-label={t("Switch to Persian", "تغییر به انگلیسی")}
          >
            <Globe size={17} aria-hidden="true" />
            <span>{language === "en" ? "فا" : "EN"}</span>
          </button>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <p>{t("A metadata catalogue of medical registries in Iran.", "کاتالوگ فراداده ثبت‌های پزشکی در ایران.")}</p>
          <div className="footer-links">
            <Link href="/about">{t("About", "درباره")}</Link>
            <Link href="/registries">{t("Browse registries", "مرور ثبت‌ها")}</Link>
          </div>
          <span>IEDR</span>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [isActive] = useRoute(href);
  return <Link href={href} className={`nav-link${isActive ? " active" : ""}`}>{children}</Link>;
}
