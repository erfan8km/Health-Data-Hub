# IEDR — GitHub and Cloudflare Deployment

This is the deployment runbook for the Iran Epidemiology Data Repository. IEDR
is a bilingual, metadata-only catalogue. It does not store or distribute
individual-level patient or raw registry records.

## Production architecture

Cloudflare Pages serves the Vite output from `artifacts/iedr/dist/public`.
Cloudflare Pages Functions loads `functions/api/[[path]].ts` and owns the
same-origin `/api/*` routes. The Function uses
`@neondatabase/serverless` to query PostgreSQL. The existing Express API
remains available for local development and non-Cloudflare Node hosting.

## Cloudflare Pages setup

Create a Pages project connected to the canonical GitHub repository:

`https://github.com/erfan8km/Health-Data-Hub`

Use:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Build command | `pnpm run build:pages` |
| Build output directory | `artifacts/iedr/dist/public` |
| Production branch | `main` |
| Node version | 20 or newer |

Cloudflare detects the committed `functions/` directory automatically. Do not
configure a separate API proxy for `/api`; the Pages Function rewrites the
incoming `/api/*` path internally and serves the existing API contract.

Because the Vite output has no `404.html`, Cloudflare Pages uses its built-in
SPA fallback for direct navigation to `/`, `/datasets`, `/datasets/:id`,
`/variables`, `/about`, and `/admin`.

## Required production variables

Set these in **Cloudflare Pages → Settings → Environment variables** for the
Production environment. Use encrypted/secret values and never commit them:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL supported by `@neondatabase/serverless` |
| `ADMIN_PASSWORD` | Yes | Server-only admin password |
| `SESSION_SECRET` | Yes | HMAC signing secret, at least 32 characters |
| `CORS_ORIGINS` | Conditional | Exact comma-separated origins only when another origin calls the API |

`NODE_ENV` and `PORT` are used by the Express server, not by Pages Functions.
For a Node deployment set `NODE_ENV=production` and `PORT=8080`.

Generate a session secret locally:

```bash
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex') + '\n')"
```

Do not paste a database URL, password, or secret into GitHub Actions, source
files, frontend code, or public build output.

## Database setup

The schema is managed by Drizzle in `lib/db`. It contains only `categories`,
`datasets`, and `variables`. There is no patient table or raw registry-record
table.

Apply the existing schema from a trusted machine before the first production
request:

```bash
DATABASE_URL='postgresql://...' pnpm install --frozen-lockfile
DATABASE_URL='postgresql://...' pnpm --filter @workspace/db run push
```

Inspect and back up the database before schema changes. Do not reset or replace
the database: the 21 supplied registries and their valid metadata must remain.

## GitHub deployment flow

1. Push the intended changes to `main`.
2. Let the connected Cloudflare Pages project run `pnpm run build:pages`.
3. Apply or verify the database schema.
4. Check the deployed root page and a nested route.
5. Check `GET /api/healthz` and `GET /api/datasets?limit=100`.
6. Check `GET /api/auth/admin-session` returns `{"authenticated":false}` before login.
7. Log into `/admin` and confirm that a metadata-only mutation succeeds.
8. Confirm a direct unauthenticated mutation returns `401`.

The optional CLI equivalent is:

```bash
pnpm install --frozen-lockfile
pnpm run build:pages
pnpm exec wrangler pages deploy artifacts/iedr/dist/public \
  --project-name health-data-hub
```

The Pages project and its secrets must already exist in Cloudflare. This
repository does not contain credentials or account identifiers.

## Local Express deployment

For local development or a traditional Node host:

```bash
pnpm install --frozen-lockfile
DATABASE_URL='postgresql://...' pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
PORT=8080 NODE_ENV=production \
  DATABASE_URL='postgresql://...' \
  ADMIN_PASSWORD='set-outside-the-repository' \
  SESSION_SECRET='a-random-secret-at-least-32-characters' \
  pnpm --filter @workspace/api-server run start
```

Serve the Vite output and reverse proxy `/api/*` to the Express process. Use
HTTPS so the admin session cookie is secure.

## Admin security

Login is checked on the server. A successful login creates an expiring,
HMAC-signed `HttpOnly`, `SameSite=Lax` cookie, with `Secure` enabled in
production. All dataset, variable, and category `POST`, `PUT`, and `DELETE`
routes enforce this cookie server-side. Browser state is not authorization.

## Metadata-only boundary

Public catalogue and export routes expose registry metadata and general
variable dictionary information only. They must never be used for patient data,
raw registry records, or individual-level downloads. Unknown values remain
empty/null and are rendered as `Not available` / `اطلاعات در دسترس نیست`.

## Verification

```bash
pnpm run typecheck
pnpm --filter @workspace/iedr run build
pnpm --filter @workspace/api-server run build
pnpm run build:pages
```

The Cloudflare Function requires a configured PostgreSQL URL for a successful
database health check. A live Cloudflare URL, database credential, and
dashboard configuration cannot be verified from this repository alone.