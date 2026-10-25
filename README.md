# Iran Epidemiology Data Repository (IEDR)

IEDR is a static, bilingual Persian/English catalogue of Iranian medical and clinical registry metadata. The prototype introduces an interactive CesiumJS globe, an Iran-focused fly-in, clinical categories, registry lists, and individual registry profiles. It does not host individual-level health data and has no API server or database.

## Run locally

Requirements: Node.js 20.19+ and pnpm 10.26.1.

```sh
pnpm install --no-frozen-lockfile
pnpm dev
```

Check data and build the static site:

```sh
pnpm validate
pnpm typecheck
pnpm test
SITE_URL=https://example.com/ pnpm run build
```

The production output is written to the repository-root `dist/` directory. The `SITE_URL` build variable is used only for canonical metadata and the sitemap; it is not a secret.

## Data files

All prototype data is in `artifacts/iedr/public/data/`:

- `categories.json` — the 11 clinical categories in the prototype.
- `registries.json` — registry metadata, including country, province, city, and category IDs.
- `countries.json` — active countries and camera coordinates.
- `provinces.json` — bilingual province directory; only Razavi Khorasan is currently active.
- `borders.geojson` — the initial Iran boundary subset, used for the glowing interactive outline.

After Iran is selected, the interface shows an Iran province map before clinical categories. Only active provinces can be selected. Province boundaries are loaded from an OpenStreetMap-derived GeoJSON dataset; an attributed Wikimedia Commons map is used as a visual fallback if the GeoJSON cannot be fetched. Credits and license links are displayed in the province selector.

Adding a registry means assigning an existing country ID, province ID, and one or more existing category IDs. A registry may belong to multiple categories. To enable a province, update its `active` flag in `provinces.json` and ensure the catalogue data is valid. Unknown descriptions and official URLs are intentionally empty; the UI hides the official university-link button until an HTTPS URL is supplied. The initial boundary file contains Iran only; adding another active country later also requires adding its boundary geometry.

## Satellite imagery / Cesium ion

The Cesium ion token is optional. When configured, the viewer requests ion imagery asset 2. Without a token, the viewer attempts public Esri World Imagery tiles. Public tile services may be blocked, rate-limited, or unavailable in some networks; the rest of the catalogue is designed to remain accessible if imagery fails.

For a local token, copy `artifacts/iedr/.env.example` to `artifacts/iedr/.env.local` and set `VITE_CESIUM_ION_TOKEN`. The `VITE_` prefix means the token is delivered to the browser: it is not a secret. Create/restrict it in Cesium ion to the exact website domains that should use it. Do not commit a personal token.

## Deploy

### Cloudflare Workers (current project configuration)

The repository has a root `wrangler.jsonc` that serves the root `dist/` folder as static assets.

- Build command: `pnpm install --no-frozen-lockfile && pnpm run build`
- Deploy command: `npx wrangler deploy`
- Set `SITE_URL` in the **build** variables to the actual production origin, for example `https://health-data-hub.erfan8km.workers.dev/`.
- Optionally set `VITE_CESIUM_ION_TOKEN` as a build variable (public in the browser; domain-restrict it in ion).

### Cloudflare Pages

- Project root: `/` (repository root).
- Build command: `pnpm install --no-frozen-lockfile && pnpm run build`.
- Output directory: `dist`.
- Set `SITE_URL` to the actual Pages/custom domain URL in the build environment.

### GitHub Pages

The workflow at `.github/workflows/deploy-github-pages.yml` publishes the `dist/` folder on pushes to `main`. Enable GitHub Pages for the repository with **GitHub Actions** as the publishing source. The workflow sets the site base to `https://erfan8km.github.io/Health-Data-Hub/`; adjust it if the repository owner or name changes. Optionally add the `CESIUM_ION_TOKEN` repository secret. The no-token Esri fallback is attempted when that secret is not provided.

Hash routes (`#/categories`, `#/category/gyn`, `#/registry/endometriosis`) are used so category and registry navigation works on static hosting and beneath a GitHub Pages repository path.
