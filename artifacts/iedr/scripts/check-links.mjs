import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registries = JSON.parse(readFileSync(resolve(root, "src/data/registries.json"), "utf8"));
const entries = registries.filter((registry) => registry.official_source_url);

if (!entries.length) {
  console.log("No official source URLs are recorded; nothing to check.");
  process.exit(0);
}

const results = await Promise.all(entries.map(async (registry) => {
  try {
    const response = await fetch(registry.official_source_url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    return { registry, status: response.status, ok: response.ok };
  } catch (error) {
    return { registry, status: error instanceof Error ? error.message : String(error), ok: false };
  }
}));

const broken = results.filter((result) => !result.ok);
for (const result of broken) {
  console.error(`${result.registry.id}: ${result.registry.official_source_url} — ${result.status}`);
}
console.log(`Checked ${entries.length} URL${entries.length === 1 ? "" : "s"}; ${broken.length} failed.`);
if (broken.length) process.exitCode = 1;
