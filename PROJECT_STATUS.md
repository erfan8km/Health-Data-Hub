# IEDR — Project Status

**Iran Epidemiology Data Repository — MVP Complete**
Version 1.0 · June 2026

---

## Summary

The IEDR MVP is complete. The application is a bilingual (English / Persian-RTL) academic dataset repository for epidemiological and health registry data from Iran. It is fully self-hosted, built on a contract-first API architecture, and requires no Replit-specific services to operate.

---

## Implemented Features

### Public Pages

#### Home (`/`)
- Hero banner with repository name in English and Persian
- Live statistics counters: total datasets, variables, records, categories, and year range
- Featured dataset cards (up to 6, admin-selectable)
- Category quick-links sidebar
- Responsive layout with RTL support

#### Datasets (`/datasets`)
- Searchable dataset catalog (English + Persian full-text search)
- Filter by category via sidebar
- Paginated grid (12 datasets per page)
- Dataset cards showing: title, description, record count, variable count, year range, geographic coverage, category badge
- Search debouncing for performance

#### Dataset Detail (`/datasets/:id`)
- Full dataset metadata display
- Key metrics panel: records, variables, years, source, coverage
- Complete variable dictionary table with all fields
- Copy-to-clipboard citation with DOI link
- Navigation back to catalog

#### Variable Dictionary (`/variables`)
- Cross-dataset public variable browser
- Search by variable name, label, or description (EN + FA)
- Filter sidebar: by dataset, by category, by variable type
- Variable cards showing: technical name, label, description, data type badge, dataset, category, allowed values, missing value warning
- Click any variable → slide-out sheet with full detail and list of all datasets containing that variable name
- Each dataset in the sheet links to its detail page
- Paginated (20 variables per page)
- RTL-aware sheet (opens from left in Persian mode)

#### About (`/about`)
- Mission statement
- Team profiles
- Contact information

---

### Admin Panel (`/admin`)

#### Authentication
- Password gate on the admin page (password never stored in browser beyond the session flag)
- Server-side password verification via `POST /api/auth/admin-login`
- Session stored in `sessionStorage` (cleared when browser tab closes)
- Sign out button

#### Variables Tab
- Searchable list of all variables across all datasets
- Filter by dataset and variable type
- Paginated (20 per page)
- Add Variable dialog: all fields (name EN/FA, label EN/FA, type, description EN/FA, values range EN/FA, missing value notes EN/FA, dataset assignment)
- Edit Variable dialog with pre-populated fields
- Delete variable with confirmation dialog

#### Datasets Tab
- Full dataset table with all metadata
- Add Dataset dialog: all fields including featured toggle and category selector
- Edit Dataset dialog
- Delete Dataset with confirmation (cascades to all variables)

#### Categories Tab
- Category table with dataset counts
- Add Category dialog: name EN/FA, slug, description EN/FA
- Edit Category dialog
- Delete Category with confirmation

#### Export Tab
- Full database backup download (JSON — all tables in one file)
- Schema definition download (JSON — table structures, column types, relationships)
- Per-table downloads:
  - Categories: JSON, CSV
  - Datasets: JSON (with nested variables), CSV
  - Variables: JSON, CSV
- CSV files include UTF-8 BOM for Excel compatibility with Persian text

---

### API

- Contract-first design: OpenAPI spec → Orval codegen → typed hooks + Zod schemas
- 8 resource endpoints: health, auth, stats, categories, datasets, variables, export
- Full CRUD for categories, datasets, and variables
- Featured dataset endpoint (registered before `:id` route to avoid Express ambiguity)
- Flat variable listing with cross-table joins (category name, dataset title)
- Paginated responses with `total`, `page`, `limit`
- Structured JSON logging via Pino
- Zod validation on all request bodies and query parameters

---

### Bilingual & RTL Support

- Language context (`LanguageProvider`) wraps the entire app
- Every user-facing string has an English and Persian variant
- Every database field has an English and Persian counterpart (`_fa` suffix)
- RTL layout activates via `document.dir = "rtl"` when Persian is selected
- Tailwind logical properties (`text-start`, `ms-*`, `me-*`) used throughout
- Vazirmatn font loaded for Persian; Inter for English
- Language toggle in the navbar (persistent per-session)

---

## Seeded Data

The database is seeded with:

- **5 categories**: Chronic Diseases, Infectious Diseases, Mental Health, Maternal & Child Health, Environmental Health
- **8 datasets**: across all 5 categories, spanning years 1999–2023
- **20 variables**: distributed across 3 datasets with full EN/FA metadata

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Contract-first API (OpenAPI → Orval) | Single source of truth; prevents drift between server and client types |
| Drizzle ORM | Type-safe SQL with full Postgres support; no magic |
| `zod/v4` in libs, plain `zod` in api-server | esbuild cannot resolve the `zod/v4` subpath; `zod/v4` works only in tsc-compiled lib packages |
| `/datasets/featured` registered before `/datasets/:id` | Express matches routes in registration order; "featured" would be treated as a numeric `:id` otherwise |
| `text-start` / `text-end` over `text-left` / `text-right` | Tailwind logical properties automatically flip with `dir="rtl"` |
| `sessionStorage` for admin auth flag | Clears on tab close; no persistent token; simple and appropriate for v1 |
| UTF-8 BOM in CSV exports | Required for Excel to correctly render Persian (UTF-8) text |
| Variables flat listing joins categories | Enables public Variable Dictionary to show category without a second request |

---

## Known Limitations (v1 Scope)

| Limitation | Notes |
|---|---|
| Mutating API routes unprotected at HTTP level | Admin UI gate is browser-only; see `PROJECT_SETUP.md §13` for production hardening options |
| No file upload / dataset download | IEDR is a metadata repository; actual data files are hosted externally and linked via DOI |
| `variablesCount` on datasets is manually maintained | Not auto-computed from the variables table; admin must keep it in sync |
| No pagination on the Dataset Detail variable table | Rendered inline; acceptable for current dataset sizes |
| Session not invalidated server-side | Since no server session exists, there is no logout endpoint; `sessionStorage.clear()` is the mechanism |

---

## File Inventory

| File | Purpose |
|---|---|
| `lib/api-spec/openapi.yaml` | OpenAPI 3.1 spec — single source of truth |
| `lib/db/src/schema/` | Drizzle table definitions |
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/iedr/src/pages/` | React page components |
| `artifacts/iedr/src/components/Layout.tsx` | Global nav + footer |
| `artifacts/iedr/src/lib/language.tsx` | Bilingual context |
| `artifacts/iedr/src/index.css` | Theme tokens (Persian Teal, Saffron) |
| `TECHNICAL_DOCUMENTATION.md` | Full technical reference |
| `PROJECT_SETUP.md` | VPS deployment guide |
| `PROJECT_STATUS.md` | This file |

---

## MVP Completion Checklist

- [x] Home page with live stats and featured datasets
- [x] Datasets catalog with search, filter, pagination
- [x] Dataset detail with variable table and citation
- [x] Variable Dictionary (public, cross-dataset, with detail sheet)
- [x] About page
- [x] Admin authentication (server-side password gate)
- [x] Admin CRUD: categories, datasets, variables
- [x] Admin export: JSON and CSV for all tables
- [x] Bilingual EN/FA throughout
- [x] RTL layout for Persian
- [x] Contract-first API with codegen
- [x] PostgreSQL database with Drizzle ORM
- [x] Structured logging (Pino)
- [x] Full TypeScript coverage, zero type errors
- [x] Technical documentation
- [x] ERD (Mermaid, in TECHNICAL_DOCUMENTATION.md)
- [x] VPS deployment guide
- [x] Export/backup functionality

---

**MVP is complete. No further development is planned.**
