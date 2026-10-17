import React from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { categories, cities, countries, fields, institutions, registries } from "@/lib/catalogue-data";
import { useLanguage } from "@/lib/language";
import { usePageMeta } from "@/lib/use-page-meta";

export default function RegistryDetail() {
  const [, params] = useRoute("/registries/:id");
  const registry = registries.find((item) => item.id === params?.id);
  const { t, isRtl } = useLanguage();

  usePageMeta(
    registry ? `${registry.title_fa} | ${registry.title_en} — IEDR` : t("Registry not found | IEDR", "ثبت پیدا نشد | IEDR"),
    registry
      ? t(`Registry listing for ${registry.title_en}.`, `اطلاعات ثبت‌شده برای ${registry.title_fa}.`)
      : t("The requested registry listing could not be found.", "ثبت درخواستی پیدا نشد."),
  );

  if (!registry) {
    return (
      <section className="page-section narrow-page">
        <Link href="/registries" className="back-link"><ArrowLeft size={16} />{t("Back to registries", "بازگشت به فهرست")}</Link>
        <div className="empty-state">
          <h1>{t("Registry not found", "ثبت پیدا نشد")}</h1>
          <p>{t("The requested registry listing could not be found.", "ثبت درخواستی پیدا نشد.")}</p>
        </div>
      </section>
    );
  }

  const category = categories.find((item) => item.id === registry.category_id);
  const field = fields.find((item) => item.id === registry.field_id);
  const institution = institutions.find((item) => item.id === registry.institution_id);
  const city = cities.find((item) => item.id === institution?.city_id);
  const country = countries.find((item) => item.id === city?.country_id);

  return (
    <section className="page-section narrow-page">
      <Link href="/registries" className="back-link"><ArrowLeft size={16} />{t("Back to registries", "بازگشت به فهرست")}</Link>
      <article className="detail-panel">
        <div className="detail-heading">
          {category && <span className="registry-category">{t(category.name_en, category.name_fa)}</span>}
          <h1 lang="fa" dir="rtl">{registry.title_fa}</h1>
          <p className="detail-title-en" lang="en" dir="ltr">{registry.title_en}</p>
          <p className="detail-place"><MapPin size={17} aria-hidden="true" />{[country && t(country.name_en, country.name_fa), city && t(city.name_en, city.name_fa)].filter(Boolean).join(" · ")}</p>
        </div>

        <dl className="detail-grid">
          <DetailItem label={t("Category", "دسته‌بندی")} value={category ? t(category.name_en, category.name_fa) : ""} />
          <DetailItem label={t("Field", "حوزه")} value={field ? t(field.name_en, field.name_fa) : t("Not provided", "ثبت نشده")} />
          <DetailItem label={t("Institution", "مؤسسه")} value={institution ? t(institution.name_en, institution.name_fa) : ""} />
          <DetailItem label={t("City", "شهر")} value={city ? t(city.name_en, city.name_fa) : ""} />
          {registry.source_text_en && <DetailItem label={t("Recorded source/site", "منبع یا محل ثبت‌شده")} value={t(registry.source_text_en, registry.source_text_fa)} />}
          {(registry.description_en || registry.description_fa) && <DetailItem label={t("Description", "توضیحات")} value={t(registry.description_en, registry.description_fa)} />}
        </dl>

        <div className="detail-link-area">
          {registry.official_source_url ? (
            <a className="button button-primary" href={registry.official_source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={17} aria-hidden="true" />{t("View on official site", "مشاهده در وب‌سایت رسمی")}
            </a>
          ) : (
            <button className="button button-disabled" type="button" disabled aria-disabled="true">
              <ExternalLink size={17} aria-hidden="true" />{t("Link not available yet", "لینک هنوز ثبت نشده")}
            </button>
          )}
          <p>{t(
            "IEDR is a metadata catalogue. Registry content is not hosted or copied here; use the official source for information about the original registry.",
            "IEDR کاتالوگی برای فراداده است. محتوای ثبت در اینجا میزبانی یا کپی نمی‌شود؛ برای اطلاعات درباره ثبت اصلی به منبع رسمی مراجعه کنید."
          )}</p>
        </div>
      </article>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value || "—"}</dd></div>;
}
