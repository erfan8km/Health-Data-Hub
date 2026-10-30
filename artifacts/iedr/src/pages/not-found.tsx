import React from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language";
import { usePageMeta } from "@/lib/use-page-meta";

export default function NotFound() {
  const { t } = useLanguage();
  const title = t("Page not found | RegistryHub", "صفحه پیدا نشد | RegistryHub");
  usePageMeta(title, t("This page does not exist.", "این صفحه وجود ندارد."));
  return (
    <section className="page-section narrow-page">
      <div className="empty-state not-found-state">
        <span className="not-found-code">404</span>
        <h1>{t("Page not found", "صفحه پیدا نشد")}</h1>
        <p>{t("The address may have changed or the page may no longer exist.", "ممکن است نشانی تغییر کرده باشد یا صفحه دیگر وجود نداشته باشد.")}</p>
        <Link className="button button-primary" href="/">{t("Return home", "بازگشت به خانه")}</Link>
      </div>
    </section>
  );
}
