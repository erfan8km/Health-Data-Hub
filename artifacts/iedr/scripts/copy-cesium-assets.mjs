import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(appRoot, "package.json"));
const packageRoot = path.dirname(require.resolve("cesium/package.json"));

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

// Cesium's distributable runtime is under Build/Cesium in current npm releases.
const candidates = [
  path.join(packageRoot, "Build", "Cesium"),
  path.join(packageRoot, "Build"),
  packageRoot,
];
let cesiumBuildDir;
for (const candidate of candidates) {
  if (await exists(path.join(candidate, "Cesium.js")) &&
      await exists(path.join(candidate, "Widgets"))) {
    cesiumBuildDir = candidate;
    break;
  }
}
if (!cesiumBuildDir) {
  throw new Error("Could not locate Cesium runtime (expected Cesium.js and Widgets under the cesium package).");
}

const outputDir = path.resolve(appRoot, "../..", "dist", "cesium");
await mkdir(outputDir, { recursive: true });
for (const name of ["Assets", "ThirdParty", "Workers", "Widgets"]) {
  const source = path.join(cesiumBuildDir, name);
  if (await exists(source)) {
    await cp(source, path.join(outputDir, name), { recursive: true, force: true });
  }
}
await cp(path.join(cesiumBuildDir, "Cesium.js"), path.join(outputDir, "Cesium.js"), { force: true });
console.log("Copied Cesium runtime assets from", cesiumBuildDir, "to", outputDir);
