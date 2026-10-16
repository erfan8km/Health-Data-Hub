# Iran Epidemiology Data Repository (IEDR)

IEDR is a bilingual Persian/English catalogue of epidemiology and health
registries. It is a metadata-only repository: it does not store, upload,
publish, or distribute individual-level patient records.

The catalogue preserves the 21 supplied registries. Unknown metadata remains
unknown and is shown as `Not available` / `اطلاعات در دسترس نیست`; the project
does not manufacture record counts, study periods, variable dictionaries, or
official URLs.

## Architecture

```text
GitHub
  └─ Cloudflare Pages
       ├─ React + Vite static frontend
       └─ Pages Functions: /api/*
            └─ PostgreSQL via @neondatabase/serverless
```

The repository also keeps an Express API for local development and traditional
Node hosting. Production on Cloudflare uses `functions/api/[[path]].ts`, so the
frontend and API remain same-origin and the existing `/api` client paths do not
need a proxy rewrite.

## Local development

Requirements: Node.js 20+ and pnpm 10+.

```bash
pnpm install --frozen-lockfile

# Set DATABASE_URL, ADMIN_PASSWORD, and SESSION_SECRET in the environment.
pnpm --filter @workspace/db run push

# Terminal 1
pnpm --filter @workspace/api-server run dev

# Terminal 2
pnpm --filter @workspace/iedr run dev
```

The local frontend uses the existing Replit artifact routing. The standalone
Express server listens on `PORT` and serves its routes under `/api`.

## Environment variables

### Cloudflare Pages / Functions

Set these as encrypted production variables in the Cloudflare dashboard. Do
not commit a `.env` file or put any of these values in frontend code.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL supported by `@neondatabase/serverless` |
| `ADMIN_PASSWORD` | Yes | Server-only admin password |
| `SESSION_SECRET` | Yes | Server-only HMAC key; at least 32 characters |
| `CORS_ORIGINS` | Only for separate origins | Comma-separated exact origins; leave unset for same-origin Pages deployment |

For the Express server, also set `NODE_ENV=production` and `PORT`. `NODE_ENV`
controls secure cookies; `PORT` is not used by Pages Functions.

Generate a session secret locally without printing or committing it:

```bash
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex') + '\n')"
```

## Database

The existing Drizzle schema contains only:

- `categories`
- `datasets` (registry metadata)
- `variables` (general variable dictionary metadata)

There is no patient table and no raw registry-record table. Apply the existing
schema to a PostgreSQL database before starting the API:

```bash
DATABASE_URL='postgresql://...' pnpm --filter @workspace/db run push
```

Do not use a destructive reset against a database containing the 21 registries.
Inspect and back up metadata before any schema change.

## Admin authentication

`POST /api/auth/admin-login` verifies `ADMIN_PASSWORD` on the server and issues
a signed, expiring cookie. The cookie is `HttpOnly`, `SameSite=Lax`, and
`Secure` in production. `GET /api/auth/admin-session` validates it and
`POST /api/auth/admin-logout` clears it.

Every dataset, variable, and category create/update/delete endpoint checks this
session server-side. The browser `sessionStorage` flag is only a UI hint and
is not a security boundary.

## API surface

Public routes include:

- `GET /api/healthz`
- `GET /api/datasets`, `/api/datasets/:id`, `/api/datasets/featured`
- `GET /api/categories`
- `GET /api/variables` and `/api/datasets/:id/variables`
- `GET /api/stats`
- metadata-only JSON, CSV, and schema exports under `/api/export/*`

Admin-protected mutations include all dataset, variable, and category
`POST`, `PUT`, and `DELETE` routes. Inputs are validated server-side and
official URLs accept only `http` or `https`.

## Cloudflare deployment from GitHub

1. Create a Cloudflare Pages project connected to
   `https://github.com/erfan8km/Health-Data-Hub`, using the repository root as
   the build root.
2. Use `pnpm run build:pages` as the build command.
3. Use `artifacts/iedr/dist/public` as the output directory.
4. Set the four Pages/Functions environment variables above in the Cloudflare
   dashboard for the production environment.
5. Apply the Drizzle schema to the production PostgreSQL database before the
   first request.
6. Deploy from the `main` branch and verify `/`, a nested route,
   `/api/healthz`, `/api/datasets?limit=100`, and `/api/auth/admin-session`.

`wrangler.toml` and `functions/api/[[path]].ts` are committed so GitHub builds
are reproducible. Because the Vite output has no `404.html`, Cloudflare Pages
uses its built-in SPA fallback for nested frontend routes while the Functions
route owns `/api/*`.

For a CLI deployment after configuring a Pages project:

```bash
pnpm exec wrangler pages deploy artifacts/iedr/dist/public \
  --project-name health-data-hub
```

The CLI still needs the Pages project and production variables configured in
Cloudflare; those values are intentionally not committed here.

## Editing registries

Use the admin panel after logging in with the server-side password. Add or
change only metadata supplied by an authoritative source. Leave unavailable
counts, periods, variable dictionaries, and official links empty/null. The
official source link must point to the source site where researchers can
request or access the actual registry data; IEDR itself must never receive
those records.

## Verification commands

```bash
pnpm run typecheck
pnpm --filter @workspace/iedr run build
pnpm --filter @workspace/api-server run build
pnpm run build:pages
```

## Security rules

- Never commit passwords, database URLs, session secrets, or `.env` files.
- Never add individual-level health records to this repository or its database.
- Keep metadata exports public only because they contain metadata and schema
  information, not patient records or secrets.
- Use exact `CORS_ORIGINS` values when a separate frontend/API origin is
  required.
- Do not treat the frontend login state as authorization.