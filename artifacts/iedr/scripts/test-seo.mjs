import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(appRoot, path), "utf8");
const [html, app, generator] = await Promise.all([
  read("index.html"),
  read("src/App.tsx"),
  read("scripts/generate-seo.mjs"),
]);

test("source HTML starts in Persian RTL and declares RegistryHub as its canonical site", () => {
  assert.match(html, /<html\s+lang="fa"\s+dir="rtl">/i);
  assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/registryhub\.ir\/"\s*\/?>/i);
  assert.match(html, /<meta\s+property="og:url"\s+content="https:\/\/registryhub\.ir\/"\s*\/?>/i);
  assert.match(html, /<meta\s+name="twitter:url"\s+content="https:\/\/registryhub\.ir\/"\s*\/?>/i);
});

test("SEO generation uses only the production canonical origin and emits sitemap and robots", () => {
  assert.match(generator, /const CANONICAL_ORIGIN = "https:\/\/registryhub\.ir"/);
  assert.match(generator, /rel="canonical"/);
  assert.match(generator, /og:url/);
  assert.match(generator, /twitter:url/);
  assert.match(generator, /sitemap\.xml/);
  assert.match(generator, /robots\.txt/);
});

test("language switching updates the document language, direction and localized metadata", () => {
  assert.match(app, /root\.lang\s*=\s*english\s*\?\s*"en"\s*:\s*"fa"/);
  assert.match(app, /root\.dir\s*=\s*english\s*\?\s*"ltr"\s*:\s*"rtl"/);
  assert.match(app, /document\.title\s*=\s*pageTitle/);
  assert.match(app, /meta\[name="description"\]/);
  assert.match(app, /meta\[property="og:title"\]/);
  assert.match(app, /meta\[property="og:description"\]/);
  assert.match(app, /meta\[name="twitter:title"\]/);
  assert.match(app, /meta\[name="twitter:description"\]/);
  assert.match(app, /\}, \[english\]\);/);
});

test("missing registry metadata is explicitly described as absent from the public catalogue", () => {
  assert.match(app, /Not provided in the public catalogue/);
  assert.match(app, /در نسخه عمومی کاتالوگ ثبت نشده/);
});
