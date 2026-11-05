import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(appRoot, "../..", "dist");
const [html, sitemap, robots] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "sitemap.xml"), "utf8"),
  readFile(resolve(dist, "robots.txt"), "utf8"),
]);

const canonicalUrl = "https://registryhub.ir/";
const canonicalTags = [...html.matchAll(/<link\s+rel=["']canonical["'][^>]*>/gi)].map((match) => match[0]);
assert.equal(canonicalTags.length, 1, "built HTML must contain exactly one canonical link");
assert.match(canonicalTags[0], /href=["']https:\/\/registryhub\.ir\/["']/i, "canonical must use registryhub.ir");
assert.match(html, /<html\s+lang="fa"\s+dir="rtl">/i, "built HTML must default to Persian RTL");
assert.match(html, /<title>[^<]+<\/title>/i, "built HTML must contain a page title");

for (const [attribute, name] of [
  ["name", "description"],
  ["property", "og:title"],
  ["property", "og:description"],
  ["property", "og:site_name"],
  ["property", "og:url"],
  ["name", "twitter:card"],
  ["name", "twitter:title"],
  ["name", "twitter:description"],
  ["name", "twitter:url"],
]) {
  const escaped = name.replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("<meta\\s+" + attribute + "=[\\"']" + escaped + "[\\"'][^>]*>", "i");
  assert.match(html, pattern, "built HTML must include " + attribute + "=" + name);
}

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
assert.deepEqual(sitemapUrls, [canonicalUrl], "sitemap must contain the production canonical URL only");
assert.match(robots, /^User-agent: \*\s*$/m);
assert.match(robots, /^Allow: \/\s*$/m);
assert.match(robots, /^Sitemap: https:\/\/registryhub\.ir\/sitemap\.xml\s*$/m);
assert.equal(/workers\.dev|example\.invalid/i.test(html + sitemap + robots), false,
  "generated SEO files must not expose preview or placeholder origins");

console.log("Built SEO output valid: canonical, metadata, sitemap.xml, and robots.txt.");
