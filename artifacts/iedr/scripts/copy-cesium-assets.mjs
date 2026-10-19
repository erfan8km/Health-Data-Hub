import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(appRoot, "package.json"));
const cesiumEntry = require.resolve("cesium");
const cesiumBuildDir = path.dirname(cesiumEntry);
const outputDir = path.resolve(appRoot, "../..", "dist", "cesium");

await mkdir(outputDir, { recursive: true });
for (const name of ["Assets", "ThirdParty", "Workers", "Widgets"]) {
  await cp(path.join(cesiumBuildDir, name), path.join(outputDir, name), { recursive: true });
}
await cp(path.join(cesiumBuildDir, "Cesium.js"), path.join(outputDir, "Cesium.js"));
console.log("Copied Cesium runtime assets to", outputDir);
