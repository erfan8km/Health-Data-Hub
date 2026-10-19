import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import cesium from "vite-plugin-cesium";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  // Relative asset URLs work both at the domain root and under a GitHub Pages repo path.
  base: "./",
  plugins: [cesium(), react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(appRoot, "src") },
    dedupe: ["react", "react-dom"],
  },
  root: appRoot,
  build: {
    outDir: path.resolve(appRoot, "../..", "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});
