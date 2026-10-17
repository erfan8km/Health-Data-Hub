# Iran Epidemiology Data Repository (IEDR)

IEDR is a bilingual Persian/English catalogue of medical registry metadata. It
is a static React site: it does not run an API, connect to a database, accept
uploads, or host/copy patient or registry records.

The current catalogue preserves 21 listings and all five original categories.
Unknown descriptions, fields, geographic details, dates, and official URLs
remain empty. Each listing's `status: "active"` means it is included in this
catalogue; it does not verify that the registry is currently operating.

## Run and build

Requirements: Node.js 20.19 or newer and pnpm 10.26.1.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Commands:

```sh
pnpm validate       # Check ids, required titles, references, and HTTPS URLs
pnpm typecheck      # TypeScript check
pnpm test           # Search/filter behavior and preserved data checks
pnpm check-links    # Optional HEAD requests to recorded official URLs
SITE_URL=https://yourdomain.example pnpm build
```

The build runs validation automatically and writes the complete static site to
the repository-root `dist/` directory. No server is needed after the build.
`SITE_URL` is a public, build-time value used for canonical tags and the
sitemap; it is not a secret and is not read at runtime. For a local preview:

```sh
SITE_URL=http://localhost:4173 pnpm build
PORT=4173 pnpm --filter @workspace/iedr run preview
```

The project uses a single Vite + React + TypeScript app in the existing
`artifacts/iedr` directory, with JSON files as its only catalogue data source.

## Catalogue data

All runtime data is in `artifacts/iedr/src/data/`:

- `registries.json` — bilingual registry listings
- `countries.json` — countries
- `cities.json` — cities, each linked to a country
- `institutions.json` — institutions, each linked to a city
- `categories.json` — the five original categories
- `fields.json` — currently empty because no field dictionary was present

The initial database export is also preserved in `data/registries.json` and
`data/categories-preserved.json`.

### Add a registry

Add an object to `registries.json`, using a unique stable slug for `id` and
existing lookup ids:

```json
{
  "id": "example-registry",
  "title_fa": "عنوان فارسی",
  "title_en": "English title",
  "description_fa": "",
  "description_en": "",
  "category_id": "chronic-diseases",
  "field_id": "",
  "institution_id": "mashhad-university-of-medical-sciences",
  "official_source_url": "",
  "status": "active",
  "last_checked": "",
  "source_text_fa": "",
  "source_text_en": "",
  "geographic_text_fa": "",
  "geographic_text_en": ""
}
```

Only set `official_source_url` to the registry's authoritative HTTPS page.
Leave unavailable values as empty strings. `field_id` can remain empty until
the relevant field is represented in `fields.json`. Source/site text is
preserved separately from the institution lookup so that named hospitals or
centres are not silently treated as separate verified institutions.

### Add places and fields

For a new country, add an `id`, `name_fa`, and `name_en` to
`countries.json`. Add a city with the same name fields and its `country_id` to
`cities.json`. Add an institution with the same name fields and its `city_id`
to `institutions.json`. These lookups are data-driven; adding rows does not
require a UI code change.

To add a field, add an `id`, `name_fa`, `name_en`, and `category_id` to
`fields.json`, then assign its id to the relevant registry's `field_id`.
Example `countries.json` row:

```json
{"id":"iran","name_fa":"ایران","name_en":"Iran"}
```

Example `cities.json` row:

```json
{"id":"mashhad","name_fa":"مشهد","name_en":"Mashhad","country_id":"iran"}
```

Example `institutions.json` row:

```json
{"id":"mashhad-university-of-medical-sciences","name_fa":"دانشگاه علوم پزشکی مشهد","name_en":"Mashhad University of Medical Sciences","city_id":"mashhad"}
```

Example `fields.json` row:

```json
{"id":"example-field","name_fa":"حوزه نمونه","name_en":"Example field","category_id":"chronic-diseases"}
```

Validate every edit before building:

```sh
pnpm validate
```

## Deploy to Cloudflare Pages

1. Push this repository to GitHub and create a Cloudflare Pages project
   connected to that repository.
2. Set the project root directory to `/` (the repository root).
3. Set the build command to `pnpm run build` and the build output directory to
   `dist`.
4. Set the production build environment variable `SITE_URL` to the final
   HTTPS origin, for example `https://catalogue.yourdomain.example`.
5. Deploy. Pages serves the generated files directly; there are no Cloudflare
   Functions, Workers, runtime secrets, or database bindings.
6. In the Pages project's **Custom domains** settings, add your domain or
   subdomain and follow Cloudflare's DNS instructions. For a domain managed
   elsewhere, add the DNS record Cloudflare provides and wait for verification.
7. If you change the custom domain, update `SITE_URL` and redeploy so the
   sitemap and canonical links match.

`public/_redirects` contains the SPA fallback for direct visits to routes such
as `/registries/pediatric-cancer`. The build also writes route-specific HTML
metadata, `sitemap.xml`, and `robots.txt`.
