# Iran Epidemiology Data Repository (IEDR)

IEDR is a static bilingual Persian/English catalogue of medical registry
metadata. It has no runtime API, database, admin login, visitor accounts, file
uploads, or patient-record storage. Keep unknown registry metadata empty; do
not invent official URLs, descriptions, fields, or geographic information.

## Commands

- `pnpm dev` — run the Vite development preview
- `pnpm validate` — validate local JSON data and references
- `pnpm typecheck` — check TypeScript
- `pnpm test` — test catalogue search/filter helpers and preserved record count
- `SITE_URL=https://yourdomain.example pnpm build` — validate and create the
  static site in the repository-root `dist/` directory
- `pnpm check-links` — optional HEAD check for non-empty official URLs

The only app is `artifacts/iedr`. Catalogue data lives in
`artifacts/iedr/src/data/`; country → city → institution and category → field
relationships are defined by JSON ids. New locations are added as JSON rows,
not UI code.

Use Cloudflare Pages with repository root `/`, build command `pnpm run build`,
and output directory `dist`. Set the public build-time `SITE_URL` to the
custom HTTPS origin for sitemap and canonical URLs.
