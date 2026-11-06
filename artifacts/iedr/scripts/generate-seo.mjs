import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(appRoot, "../..", "dist");
const dataDir = resolve(appRoot, "public", "data");
const rawSiteUrl = process.env.SITE_URL;
if (!rawSiteUrl) {
  console.error("SITE_URL is required at build time so canonical metadata and sitemap use the correct public URL.");
  process.exit(1);
}

let siteUrl;
try {
  const parsed = new URL(rawSiteUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  siteUrl = parsed.href.endsWith("/") ? parsed.href : parsed.href + "/";
} catch {
  console.error("SITE_URL must be a valid http(s) URL, e.g. https://example.com/.");
  process.exit(1);
}

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const escapeXml = (value) => escapeHtml(value);
const readJson = async (name) => JSON.parse(await readFile(resolve(dataDir, name), "utf8"));

const htmlPath = resolve(outputDir, "index.html");
let html = await readFile(htmlPath, "utf8");

function updateMeta(attribute, key, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp("<meta\\s+" + attribute + "=\\\"" + key + "\\\"[^>]*>", "i");
  const tag = "<meta " + attribute + "=\"" + key + "\" content=\"" + escapedContent + "\" />";
  if (pattern.test(html)) html = html.replace(pattern, tag);
  else html = html.replace("</head>", "  " + tag + "\n  </head>");
}

const title = "RegistryHub | کاتالوگ ریجستری‌های سلامت";
const description = "RegistryHub is a bilingual catalogue of health and medical registries. کاتالوگ دوزبانه ریجستری‌های سلامت و پزشکی.";
html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(title) + "</title>");
updateMeta("name", "description", description);
updateMeta("property", "og:title", title);
updateMeta("property", "og:description", description);
updateMeta("name", "twitter:title", title);
updateMeta("name", "twitter:description", description);
const canonicalTag = "<link rel=\\"canonical\\" href=\\"" + escapeHtml(siteUrl) + "\\" />";
const canonicalPattern = /<link\s+rel=["']canonical["'][^>]*>/i;
if (canonicalPattern.test(html)) html = html.replace(canonicalPattern, canonicalTag);
else html = html.replace("</head>", "  " + canonicalTag + "\n  </head>");
await writeFile(htmlPath, html);

const registries = await readJson("registries.json");
const categories = await readJson("categories.json");
const categoryById = new Map(categories.map((category) => [category.id, category]));
const urls = [siteUrl];

for (const registry of registries) {
  if (!registry || typeof registry.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(registry.slug)) {
    throw new Error("Cannot generate SEO page: registry slug is missing or invalid.");
  }

  const pageUrl = new URL("registry/" + encodeURIComponent(registry.slug) + "/", siteUrl).href;
  urls.push(pageUrl);

  const titleEn = registry.en?.trim() || registry.fa?.trim() || registry.slug;
  const titleFa = registry.fa?.trim() || titleEn;
  const descriptionEn = registry.descriptionEn?.trim() || registry.description?.trim() || "";
  const descriptionFa = registry.descriptionFa?.trim() || "";
  const targetEn = registry.targetPopulationEn?.trim() || registry.targetPopulation?.trim() || "";
  const targetFa = registry.targetPopulationFa?.trim() || "";
  const centerEn = registry.centerEn?.trim() || registry.center?.trim() || "";
  const centerFa = registry.centerFa?.trim() || "";
  const dataEn = registry.dataSummaryEn?.trim() || "";
  const dataFa = registry.dataSummaryFa?.trim() || "";
  const statusEn = registry.statusEn?.trim() || registry.status?.trim() || "";
  const statusFa = registry.statusFa?.trim() || "";
  const typeEn = registry.registryTypeEn?.trim() || registry.registryType?.trim() || "";
  const typeFa = registry.registryTypeFa?.trim() || "";
  const categoriesForRegistry = (registry.categories || [])
    .map((id) => categoryById.get(id))
    .filter(Boolean);
  const categoryText = categoriesForRegistry.map((category) =>
    '<li><span lang="fa" dir="rtl">' + escapeHtml(category.fa) + '</span> — ' + escapeHtml(category.en) + "</li>"
  ).join("");
  const publications = (Array.isArray(registry.keyPublications) ? registry.keyPublications : [])
    .map((publication) => {
      const href = publication.doi
        ? "https://doi.org/" + encodeURIComponent(publication.doi).replaceAll("%2F", "/")
        : publication.url;
      const safeHref = typeof href === "string" && /^https:\/\//i.test(href) ? href : "";
      const label = [publication.title, publication.journal, publication.year].filter(Boolean).join(" — ");
      return safeHref
        ? '<li><a href="' + escapeHtml(safeHref) + '" rel="noopener noreferrer">' + escapeHtml(label || "Publication") + "</a></li>"
        : "";
    }).filter(Boolean).join("");
  const detailRows = [
    ["Target population", "جمعیت هدف", targetEn, targetFa],
    ["Registry center", "مرکز ریجستری", centerEn, centerFa],
    ["Status", "وضعیت", statusEn, statusFa],
    ["Registry type", "نوع ریجستری", typeEn, typeFa],
    ["Data collected", "داده‌های گردآوری‌شده", dataEn, dataFa],
  ].filter((row) => row[2] || row[3]).map((row) =>
    '<section><h2>' + escapeHtml(row[0]) + ' <span lang="fa" dir="rtl">' + escapeHtml(row[1]) + '</span></h2>' +
    (row[2] ? '<p>' + escapeHtml(row[2]) + "</p>" : "") +
    (row[3] ? '<p lang="fa" dir="rtl">' + escapeHtml(row[3]) + "</p>" : "") +
    "</section>"
  ).join("");
  const descriptionBlock = (descriptionEn || descriptionFa)
    ? '<section><h2>About this registry | <span lang="fa" dir="rtl">درباره ریجستری</span></h2>' +
      (descriptionEn ? "<p>" + escapeHtml(descriptionEn) + "</p>" : "") +
      (descriptionFa ? '<p lang="fa" dir="rtl">' + escapeHtml(descriptionFa) + "</p>" : "") +
      "</section>"
    : "";
  const publicationsBlock = publications
    ? '<section><h2>Selected publications | <span lang="fa" dir="rtl">مقالات منتخب</span></h2><ul>' + publications + "</ul></section>"
    : "";
  const pageTitle = titleEn + " | RegistryHub";
  const pageDescription = descriptionEn || descriptionFa || ("Registry information for " + titleEn + " in the RegistryHub health registry catalogue.");
  const registryHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="RegistryHub">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:card" content="summary">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  <style>
    body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.8;max-width:860px;margin:40px auto;padding:0 20px;color:#182230}
    h1{line-height:1.4}h2{font-size:1.15rem;margin-bottom:.3rem}section{border-top:1px solid #ddd;padding:12px 0}
    [dir=rtl]{text-align:right}a{color:#1769aa}header p{color:#526070}
  </style>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "RegistryHub", url: siteUrl },
  }).replaceAll("<", "\\u003c")}</script>
</head>
<body>
  <header>
    <p><a href="${escapeHtml(siteUrl)}">RegistryHub | Health Registry Catalogue</a></p>
    <h1>${escapeHtml(titleEn)}</h1>
    <h2 lang="fa" dir="rtl">${escapeHtml(titleFa)}</h2>
    <p>Health registry profile · ${escapeHtml(registry.city || "")}</p>
  </header>
  ${descriptionBlock}
  ${detailRows}
  ${categoryText ? '<section><h2>Research category | <span lang="fa" dir="rtl">حوزه پژوهش</span></h2><ul>' + categoryText + "</ul></section>" : ""}
  ${publicationsBlock}
  <footer><p><a href="${escapeHtml(siteUrl + "#/registry/" + encodeURIComponent(registry.slug))}">View this registry in the RegistryHub catalogue</a></p></footer>
</body>
</html>
`;
  const pageDir = resolve(outputDir, "registry", registry.slug);
  await mkdir(pageDir, { recursive: true });
  await writeFile(resolve(pageDir, "index.html"), registryHtml, "utf8");
}

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((url) => "  <url><loc>" + escapeXml(url) + "</loc></url>").join("\n") +
  "\n</urlset>\n";
await writeFile(resolve(outputDir, "sitemap.xml"), sitemap, "utf8");
await writeFile(resolve(outputDir, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: " + siteUrl + "sitemap.xml\n", "utf8");
console.log("SEO metadata, " + (urls.length - 1) + " registry pages, and sitemap generated for " + siteUrl + ".");
