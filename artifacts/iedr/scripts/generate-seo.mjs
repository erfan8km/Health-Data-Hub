import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(appRoot, "../..", "dist");
const CANONICAL_ORIGIN = "https://registryhub.ir";
const CANONICAL_SITE_URL = CANONICAL_ORIGIN + "/";
const rawSiteUrl = process.env.SITE_URL;

// SEO URLs must always identify the public production site, including preview builds.
// Cloudflare Workers Builds can retain a legacy SITE_URL for branch previews, so treat
// that setting as diagnostic only instead of failing an otherwise valid build.
if (rawSiteUrl) {
  let configuredSiteUrl;
  try {
    configuredSiteUrl = new URL(rawSiteUrl);
  } catch {
    configuredSiteUrl = null;
  }

  if (!configuredSiteUrl || configuredSiteUrl.origin !== CANONICAL_ORIGIN || configuredSiteUrl.protocol !== "https:") {
    console.warn(
      "Ignoring non-canonical SITE_URL setting; SEO metadata will use " + CANONICAL_SITE_URL + "."
    );
  }
} else {
  console.warn("SITE_URL is not set; SEO metadata will use " + CANONICAL_SITE_URL + ".");
}

const siteUrl = CANONICAL_SITE_URL;
const htmlPath = resolve(outputDir, "index.html");
let html = await readFile(htmlPath, "utf8");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function updateMeta(attribute, key, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp("<meta\\s+" + attribute + "=\"" + key + "\"[^>]*>", "i");
  const tag = "<meta " + attribute + "=\"" + key + "\" content=\"" + escapedContent + "\" />";
  if (pattern.test(html)) html = html.replace(pattern, tag);
  else html = html.replace("</head>", "  " + tag + "\n  </head>");
}

const title = "RegistryHub | کاتالوگ دوزبانه ریجستری‌های سلامت";
const description = "RegistryHub is a bilingual catalogue of health and medical registries in Iran. کاتالوگ دوزبانه ریجستری‌های سلامت و پزشکی در ایران.";

html = html.replace(/<html\b[^>]*>/i, '<html lang="fa" dir="rtl">');
html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(title) + "</title>");
updateMeta("name", "description", description);
updateMeta("property", "og:title", title);
updateMeta("property", "og:description", description);
updateMeta("property", "og:site_name", "RegistryHub");
updateMeta("property", "og:url", siteUrl);
updateMeta("name", "twitter:card", "summary");
updateMeta("name", "twitter:title", title);
updateMeta("name", "twitter:description", description);
updateMeta("name", "twitter:url", siteUrl);

const canonicalTag = '<link rel="canonical" href="' + escapeHtml(siteUrl) + '" />';
const canonicalPattern = /<link\s+rel=["']canonical["'][^>]*>/i;
if (canonicalPattern.test(html)) html = html.replace(canonicalPattern, canonicalTag);
else html = html.replace("</head>", "  " + canonicalTag + "\n  </head>");

await writeFile(htmlPath, html);

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + "  <url><loc>" + siteUrl + "</loc></url>\n"
  + "</urlset>\n";
await writeFile(resolve(outputDir, "sitemap.xml"), sitemap);
await writeFile(
  resolve(outputDir, "robots.txt"),
  "User-agent: *\nAllow: /\nSitemap: " + siteUrl + "sitemap.xml\n"
);

console.log("SEO metadata, canonical URL, sitemap, and robots.txt generated for " + siteUrl + ".");
