import React from "react";
import { BookOpenCheck, ExternalLink, Mail } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { usePageMeta } from "@/lib/use-page-meta";

export default function About() {
  const { t } = useLanguage();
  const title = t("About the catalogue | RegistryHub", "درباره کاتالوگ | RegistryHub");
  const description = t(
    "Learn about the purpose and scope of this medical registry metadata catalogue.",
    "درباره هدف و دامنه این کاتالوگ فراداده ثبت‌های پزشکی بخوانید."
  );
  usePageMeta(title, description);

  return (
    <section className="page-section narrow-page">
      <div className="page-heading">
        <span className="section-kicker">{t("ABOUT RegistryHub", "درباره RegistryHub")}</span>
        <h1>{t("A directory, not a data repository.", "یک فهرست، نه مخزن داده.")}</h1>
        <p>{t("A bilingual catalogue to help people find information about medical registries.", "کاتالوگی دوزبانه برای کمک به یافتن اطلاعات درباره ثبت‌های پزشکی.")}</p>
      </div>
      <div className="about-cards">
        <article className="about-card">
          <BookOpenCheck size={23} aria-hidden="true" />
          <h2>{t("What this site does", "کار این وب‌سایت")}</h2>
          <p>{t(
            "RegistryHub lists descriptive information about medical registries, including their titles, categories, and recorded institutional context. The catalogue is currently seeded with registry listings associated with Mashhad.",
            "RegistryHub اطلاعات توصیفی ثبت‌های پزشکی، از جمله عنوان، دسته‌بندی و زمینه سازمانی ثبت‌شده را فهرست می‌کند. در حال حاضر، کاتالوگ شامل ثبت‌های مرتبط با مشهد است."
          )}</p>
        </article>
        <article className="about-card">
          <ExternalLink size={23} aria-hidden="true" />
          <h2>{t("Original sources", "منابع اصلی")}</h2>
          <p>{t(
            "This site only links to original sources when an official URL has been provided. It does not host or copy registry content, patient records, or research datasets.",
            "این وب‌سایت فقط زمانی به منابع اصلی پیوند می‌دهد که نشانی رسمی ارائه شده باشد. محتوای ثبت، پرونده بیماران یا مجموعه‌داده‌های پژوهشی را میزبانی یا کپی نمی‌کند."
          )}</p>
        </article>
        <article className="about-card contact-card">
          <Mail size={23} aria-hidden="true" />
          <h2>{t("Contact", "تماس")}</h2>
          <p>{t("Contact information will be added when it is provided.", "اطلاعات تماس پس از ارائه در این بخش افزوده می‌شود.")}</p>
        </article>
      </div>
    </section>
  );
}
