import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(appRoot, "../..", "dist");
const siteUrlValue = process.env.SITE_URL;
if (!siteUrlValue) {
  console.error("SITE_URL is required at build time so the sitemap and canonical URLs use your real domain.");
  process.exit(1);
}

let siteUrl;
try {
  siteUrl = new URL(siteUrlValue).origin;
  if (!["http:", "https:"].includes(new URL(siteUrlValue).protocol)) throw new Error();
} catch {
  console.error("SITE_URL must be a valid http(s) URL, such as https://yourdomain.example.");
  process.exit(1);
}

const registries = JSON.parse(await readFile(resolve(appRoot, "src/data/registries.json"), "utf8"));
const categories = JSON.parse(await readFile(resolve(appRoot, "src/data/categories.json"), "utf8"));
const baseHtml = await readFile(resolve(outputDir, "index.html"), "utf8");
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function updateMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*"\\s*\\/?>`);
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `  ${tag}\n  </head>`);
}

function routeHtml(path, title, description) {
  const canonical = `${siteUrl}${path}`;
  let html = baseHtml.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = updateMeta(html, "name", "description", description);
  html = updateMeta(html, "property", "og:title", title);
  html = updateMeta(html, "property", "og:description", description);
  html = updateMeta(html, "name", "twitter:title", title);
  html = updateMeta(html, "name", "twitter:description", description);
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  html = html.replace("</head>", `  ${canonicalTag}\n  </head>`);
  return html;
}

const routes = [
  { path: "/", title: "مخزن داده‌های اپیدمیولوژی ایران | Iran Epidemiology Data Repository", description: "کاتالوگ دوزبانه فراداده ثبت‌های پزشکی ایران. Bilingual metadata catalogue of medical registries in Iran." },
  { path: "/registries", title: "فهرست ثبت‌ها | Registry Catalogue — IEDR", description: "جستجو و مرور ثبت‌های پزشکی ایران. Search and browse medical registries in Iran." },
  { path: "/about", title: "درباره | About — IEDR", description: "درباره کاتالوگ فراداده ثبت‌های پزشکی ایران. About the Iran medical registry metadata catalogue." },
  ...registries.map((registry) => ({
    path: `/registries/${encodeURIComponent(registry.id)}`,
    title: `${registry.title_fa} | ${registry.title_en} — IEDR`,
    description: `${registry.title_fa} (${registry.title_en}) — ${categories.find((category) => category.id === registry.category_id)?.name_fa ?? "ثبت پزشکی"}.`,
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(({ path }) => `  <url><loc>${escapeHtml(`${siteUrl}${path}`)}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(resolve(outputDir, "sitemap.xml"), sitemap);
await writeFile(resolve(outputDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(resolve(outputDir, "index.html"), routeHtml(baseHtml, routes[0].title, routes[0].description));

for (const route of routes.slice(1)) {
  const routeDirectory = resolve(outputDir, route.path.replace(/^\//, ""));
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(resolve(routeDirectory, "index.html"), routeHtml(baseHtml, route.title, route.description));
}

console.log(`SEO files generated for ${routes.length} routes at ${siteUrl}.`);
