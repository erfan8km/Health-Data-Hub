# RegistryHub

RegistryHub is a static, bilingual Persian/English catalogue of Iranian medical and clinical registry metadata. It does not host individual-level health data and has no public catalogue database or API server.

## Run locally

Requirements: Node.js 20.19+ and pnpm 10.26.1.

~~~sh
pnpm install --no-frozen-lockfile
pnpm dev
~~~

Check data and build the static site:

~~~sh
pnpm validate
pnpm typecheck
pnpm test
SITE_URL=https://registryhub.erfan8km.workers.dev/ pnpm run build
~~~

The production output is written to the repository-root `dist/` directory. The SITE_URL build variable is used for canonical metadata and the sitemap; it is not a secret.

## Data files

All prototype data is in `artifacts/iedr/public/data/`:

- **categories.json** — clinical categories.
- **registries.json** — registry metadata.
- **countries.json** — active countries and camera coordinates.
- **provinces.json** — bilingual province directory; only Razavi Khorasan is currently active.
- **borders.geojson** — the initial Iran boundary subset used for the globe outline.

The province selector uses locally bundled, simplified boundary paths in `artifacts/iedr/src/data/iran-province-shapes.ts`. It no longer downloads province GeoJSON at runtime, so the map does not depend on the availability of an external GeoJSON host. Boundary data is derived from OpenStreetMap and distributed under ODbL 1.0; attribution and licence details are in `artifacts/iedr/public/data/BOUNDARY-DATA-LICENSE.md` and shown in the province selector.

Only active provinces can be selected. Adding a registry means assigning an existing country ID, province ID, and one or more existing category IDs. A registry may belong to multiple categories. To enable a province, update its active flag in `provinces.json` and ensure catalogue data is valid. Unknown descriptions and official URLs are intentionally empty; the UI hides the official university-link button until an HTTPS URL is supplied.

## Globe and imagery

The Cesium ion token is optional. When configured, the globe can request ion imagery asset 2. Without it, the viewer attempts public Esri World Imagery tiles. Public imagery services may be blocked, rate-limited, or unavailable in some networks; the catalogue and local province geometry should remain accessible if imagery fails.

For local development, a token can be placed in `artifacts/iedr/.env.local` as `VITE_CESIUM_ION_TOKEN`. The `VITE_` prefix means the token is delivered to the browser, so it is not a secret. Restrict it to the intended website domains in Cesium ion and never commit a personal token.

## Deploy — Cloudflare Workers only

The root `wrangler.jsonc` targets the production Worker named `registryhub`, which serves `dist/` as static assets.

- Build and deploy: `pnpm install --no-frozen-lockfile && pnpm run build`, then `npx --yes wrangler@4 deploy`.
- Production origin: https://registryhub.erfan8km.workers.dev/
- GitHub Actions runs `.github/workflows/deploy-cloudflare-worker.yml` on pushes to main. It now fails explicitly if required Cloudflare credentials are absent instead of reporting a successful skipped deployment.

Configure these repository secrets under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token scoped to the correct account with permission to edit Worker scripts.
- `CLOUDFLARE_ACCOUNT_ID` — account identifier for Wrangler.

`CESIUM_ION_TOKEN` is optional; it is exposed to the browser as a public client token and should be domain-restricted in Cesium ion. Its absence should not block deployment.

The GitHub Pages deployment workflow is removed by this change, because Cloudflare Workers is the only deployment target. After merging, verify **Settings → Pages** in GitHub: deleting a workflow stops future workflow deployments but does not necessarily unpublish a site already deployed. Set Pages to disabled/None if that setting is still enabled.

## Admin API

The separate `registryhub-admin-api` Worker source is versioned under `workers/registryhub-admin-api/`. Recovery steps, required bindings, and secret names are documented in `docs/REGISTRYHUB-ADMIN-API-RECOVERY.md`. Do not put Cloudflare secrets, GitHub tokens, or OAuth client secrets into the repository.

The validation workflow also runs a Wrangler dry run against the admin Worker configuration and source; this validates bundling without deploying it.
