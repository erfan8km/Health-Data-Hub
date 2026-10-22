import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(appRoot, "../..", "dist");
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
  console.error("SITE_URL must be a valid http(s) URL, e.g. https://example.com/ or https://username.github.io/repository/.");
  process.exit(1);
}

const htmlPath = resolve(outputDir, "index.html");
let html = await readFile(htmlPath, "utf8");
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function updateMeta(attribute, key, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp("<meta\\s+" + attribute + "=\"" + key + "\"[^>]*>", "i");
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
const canonicalTag = "<link rel=\"canonical\" href=\"" + escapeHtml(siteUrl) + "\" />";
const canonicalPattern = /<link\s+rel=["']canonical["'][^>]*>/i;
if (canonicalPattern.test(html)) html = html.replace(canonicalPattern, canonicalTag);
else html = html.replace("</head>", "  " + canonicalTag + "\n  </head>");
await writeFile(htmlPath, html);

const sitemap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url><loc>" + escapeHtml(siteUrl) + "</loc></url>\n</urlset>\n";
await writeFile(resolve(outputDir, "sitemap.xml"), sitemap);
await writeFile(resolve(outputDir, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: " + siteUrl + "sitemap.xml\n");
console.log("SEO metadata and sitemap generated for " + siteUrl + ".");
