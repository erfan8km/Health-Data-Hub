# RegistryHub

RegistryHub is a static, bilingual Persian/English catalogue of medical and clinical registry metadata. It does not host individual-level health data.

## Run locally

Requirements: Node.js 20.19+ and pnpm 10.26.1.

```sh
pnpm install --no-frozen-lockfile
pnpm dev
```

Check data, tests, and build:

```sh
pnpm validate
pnpm typecheck
pnpm test
pnpm test:admin-api
SITE_URL=https://example.com/ pnpm run build
```

The production output is written to the repository-root `dist/` directory. `SITE_URL` is a build variable used for canonical metadata and the sitemap; it is not a secret.

## Data files

All catalogue data is in `artifacts/iedr/public/data/`:

- `categories.json` — clinical categories.
- `registries.json` — registry metadata.
- `countries.json` — active countries and camera coordinates.
- `borders.geojson` — country boundary geometry used by the globe.

Registry rows use the current schema in `artifacts/iedr/src/App.tsx`. Keep category and country IDs consistent with their companion JSON files. Empty descriptions and official URLs are allowed where information is not verified; supplied official URLs must use HTTPS.

## Satellite imagery / Cesium ion

The Cesium ion token is optional. If used, `VITE_CESIUM_ION_TOKEN` is included in browser code and is **not a secret**. Restrict it to the intended website domains and do not commit a personal token. Public imagery services may be unavailable or rate-limited in some networks.

## Production hosting: Cloudflare only

The production catalogue is deployed to Cloudflare Workers using the root `wrangler.jsonc`, which serves the root `dist/` folder as static assets.

- Build: `pnpm install --no-frozen-lockfile && pnpm run build`
- Deploy: `npx wrangler deploy`
- Build variable `SITE_URL`: set it to the actual production origin, currently `https://health-data-hub.erfan8km.workers.dev/`.
- Optional build variable `VITE_CESIUM_ION_TOKEN`: public in the browser; domain-restrict it in Cesium ion.

GitHub is used for source control, CI, and reviewed changes; **GitHub Pages is not a production hosting target**. The GitHub Pages deployment workflow has been removed in this proposal. The Cloudflare deployment workflow runs on pushes to `main`; review and merge remain the release gate.

## Admin prototype and API

The local editor is in `admin-prototype/`; the separate Cloudflare Worker API scaffold is in `admin-api/`. The API validates submissions and opens a pull request against `main`; it does not merge or deploy.

**Do not deploy the admin API until Cloudflare Access is configured and tested** for the entire admin Worker, the single administrator identity is configured, and `GITHUB_TOKEN` is stored as a Worker secret with minimal repository permissions. See `admin-api/README.md`. No Cloudflare resources or secrets are configured by this source change.

