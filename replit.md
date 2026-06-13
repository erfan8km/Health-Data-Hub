# Iran Epidemiology Data Repository (IEDR)

A bilingual (English/Persian-RTL) academic dataset repository for epidemiological and health registry datasets from Iran, inspired by the UCI Machine Learning Repository.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/iedr run dev` — run the frontend (port 19420)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Fonts: Inter (EN) + Vazirmatn (FA/RTL) via Google Fonts

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (single source of truth for API contracts)
- `lib/db/src/schema/` — Drizzle DB schema (categories, datasets, variables)
- `artifacts/api-server/src/routes/` — Express API route handlers
- `artifacts/iedr/src/pages/` — React pages (Home, Datasets, DatasetDetail, About, Admin)
- `artifacts/iedr/src/components/` — Shared components (Layout)
- `artifacts/iedr/src/lib/language.tsx` — Bilingual language context (EN/FA)
- `artifacts/iedr/src/index.css` — Theme tokens (Persian teal primary, saffron accent)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod validation schemas
- Language context: `LanguageProvider` wraps the entire app; `t(en, fa)` helper switches text; `dir="rtl"` set on document root for Persian; Vazirmatn font loaded for RTL
- No auth on admin panel in v1 — add Clerk/Replit Auth when ready to lock it down
- Featured datasets endpoint separate from main list for efficient home page loading
- Variables are returned inline in `GET /datasets/:id` response to avoid a second API call on detail page

## Product

- **Home**: Hero banner, search, live stats (datasets/variables/records/categories), featured dataset cards, category quick-links
- **Datasets**: Searchable/filterable catalog, category sidebar, paginated grid with metadata
- **Dataset Detail**: Full metadata, key metrics, variable dictionary table, copy-to-clipboard citation with DOI
- **About**: Mission statement, team profiles, contact info
- **Admin Panel**: Full CRUD for datasets and categories via tabbed interface with modals

## User preferences

_Populate as you build._

## Gotchas

- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` then restart the frontend workflow
- After DB schema changes: run `pnpm --filter @workspace/db run push`
- The `/datasets/featured` route must be registered BEFORE `/datasets/:id` in Express (already done) — otherwise Express tries to match "featured" as an `:id` param
- RTL layout: use `text-start` (not `text-left`) in Tailwind so alignment flips automatically with dir

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
