# IEDR — Technical Documentation

**Iran Epidemiology Data Repository**
Version 1.0 · Last updated: June 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Entity Relationship Diagram](#6-entity-relationship-diagram)
7. [API Reference](#7-api-reference)
8. [Frontend Pages](#8-frontend-pages)
9. [Dataset Management Workflow](#9-dataset-management-workflow)
10. [Variable Management Workflow](#10-variable-management-workflow)
11. [Admin Panel Features](#11-admin-panel-features)
12. [Export & Backup](#12-export--backup)
13. [Bilingual & RTL Support](#13-bilingual--rtl-support)
14. [Configuration Reference](#14-configuration-reference)

---

## 1. System Overview

IEDR is a bilingual (English / Persian-RTL) academic dataset repository for epidemiological and health registry data from Iran, modelled after the UCI Machine Learning Repository. It provides public browsing, searching, and filtering of datasets and their variables, plus a password-protected admin panel for full CRUD management.

**Design principles:**

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas
- Fully self-hosted: no Replit-specific services required
- Bilingual at every layer: every user-facing field has an `_fa` counterpart
- RTL-aware layout: document `dir` attribute switches at runtime; Tailwind `text-start`/`text-end` used throughout

---

## 2. Architecture

```
Browser
  │
  ├── React SPA (Vite, port 19420 in dev)
  │     ├── TanStack Query — server state / caching
  │     ├── Wouter — client-side routing
  │     ├── shadcn/ui + Tailwind CSS — component library
  │     └── Orval-generated hooks — typed API calls
  │
  │  (shared reverse proxy on port 80 in dev, or nginx/caddy in prod)
  │
  └── Express API Server (port 8080 in dev)
        ├── Drizzle ORM
        ├── Zod validation (Orval-generated schemas)
        ├── Pino structured logging
        └── PostgreSQL database
```

### Request flow

1. Browser → `GET /` → React SPA served by Vite dev server (or nginx in prod)
2. React component mounts → TanStack Query fires → `GET /api/datasets`
3. Shared proxy forwards `/api/*` to Express (port 8080)
4. Express route handler validates request with Zod, queries DB via Drizzle, returns JSON
5. TanStack Query caches response; component re-renders

### Contract-first API pipeline

```
lib/api-spec/openapi.yaml
        │
        ▼ pnpm --filter @workspace/api-spec run codegen
        │
        ├── lib/api-client-react/src/generated/api.ts   ← TanStack Query hooks
        └── lib/api-zod/src/generated/api.ts            ← Zod validation schemas
```

The server imports Zod schemas from `@workspace/api-zod` to validate every request.
The frontend imports React Query hooks from `@workspace/api-client-react`.

---

## 3. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 24 |
| Language | TypeScript | 5.9 |
| Package manager | pnpm workspaces | 9 |
| Frontend framework | React | 19 |
| Build tool | Vite | 7 |
| CSS | Tailwind CSS | 4 |
| Component library | shadcn/ui | latest |
| Routing (frontend) | Wouter | 3 |
| Server state | TanStack Query | 5 |
| API server | Express | 5 |
| ORM | Drizzle ORM | latest |
| Database | PostgreSQL | 16+ |
| Validation | Zod v4 | 3.x |
| API codegen | Orval | 8 |
| API server build | esbuild | latest |
| Logging | Pino | latest |
| Fonts | Inter (EN), Vazirmatn (FA) | Google Fonts |

---

## 4. Project Structure

```
workspace/
├── artifacts/
│   ├── api-server/              # Express API server
│   │   ├── src/
│   │   │   ├── app.ts           # Express app setup, middleware
│   │   │   ├── index.ts         # Server entry point (reads PORT env)
│   │   │   ├── lib/
│   │   │   │   └── logger.ts    # Pino singleton logger
│   │   │   └── routes/
│   │   │       ├── index.ts     # Route aggregator
│   │   │       ├── auth.ts      # POST /auth/admin-login
│   │   │       ├── categories.ts
│   │   │       ├── datasets.ts
│   │   │       ├── variables.ts
│   │   │       ├── stats.ts
│   │   │       ├── health.ts
│   │   │       └── export.ts    # GET /export/* download endpoints
│   │   └── build.mjs            # esbuild bundle script
│   │
│   └── iedr/                    # React frontend (Vite)
│       ├── src/
│       │   ├── App.tsx          # Router, providers
│       │   ├── index.css        # Tailwind + theme tokens
│       │   ├── components/
│       │   │   ├── Layout.tsx   # Header, nav, footer
│       │   │   └── ui/          # shadcn/ui components
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── Datasets.tsx
│       │   │   ├── DatasetDetail.tsx
│       │   │   ├── VariableDictionary.tsx
│       │   │   ├── About.tsx
│       │   │   ├── Admin.tsx
│       │   │   └── not-found.tsx
│       │   ├── lib/
│       │   │   └── language.tsx # Bilingual context + RTL toggle
│       │   └── hooks/
│       │       └── use-toast.ts
│       └── vite.config.ts
│
├── lib/
│   ├── api-spec/
│   │   ├── openapi.yaml         # Single source of truth for API contracts
│   │   └── orval.config.ts      # Codegen configuration
│   ├── api-client-react/        # Generated: React Query hooks
│   ├── api-zod/                 # Generated: Zod request/response schemas
│   └── db/
│       ├── src/
│       │   ├── index.ts         # DB connection (pool + drizzle)
│       │   └── schema/
│       │       ├── categories.ts
│       │       ├── datasets.ts
│       │       └── variables.ts
│       └── drizzle.config.ts    # Migration config
│
├── scripts/                     # Utility scripts (seed, etc.)
├── pnpm-workspace.yaml          # Workspace + catalog + overrides
├── tsconfig.base.json           # Shared strict TS defaults
└── tsconfig.json                # Root solution file (libs only)
```

---

## 5. Database Schema

### Table: `categories`

Stores research categories that group datasets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-increment ID |
| `name` | `text` | NOT NULL | English category name |
| `name_fa` | `text` | NOT NULL | Persian category name |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe identifier (e.g. `chronic-diseases`) |
| `description` | `text` | NULL | English description |
| `description_fa` | `text` | NULL | Persian description |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |

---

### Table: `datasets`

Stores epidemiological dataset metadata.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-increment ID |
| `title` | `text` | NOT NULL | English title |
| `title_fa` | `text` | NOT NULL | Persian title |
| `description` | `text` | NOT NULL | English description |
| `description_fa` | `text` | NOT NULL | Persian description |
| `records_count` | `integer` | NOT NULL, DEFAULT 0 | Number of records/rows |
| `variables_count` | `integer` | NOT NULL, DEFAULT 0 | Number of variables/columns |
| `year_start` | `integer` | NOT NULL | Study start year |
| `year_end` | `integer` | NOT NULL | Study end year |
| `geographic_coverage` | `text` | NOT NULL | English coverage description |
| `geographic_coverage_fa` | `text` | NOT NULL | Persian coverage description |
| `data_source` | `text` | NOT NULL | English source name |
| `data_source_fa` | `text` | NOT NULL | Persian source name |
| `citation_text` | `text` | NULL | Full citation string |
| `citation_doi` | `text` | NULL | DOI identifier |
| `is_featured` | `boolean` | NOT NULL, DEFAULT false | Show on home page |
| `category_id` | `integer` | NOT NULL, FK → categories.id | Owning category |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

---

### Table: `variables`

Stores individual variables (columns/fields) belonging to datasets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-increment ID |
| `dataset_id` | `integer` | NOT NULL, FK → datasets.id ON DELETE CASCADE | Owning dataset |
| `name` | `text` | NOT NULL | Technical variable name (e.g. `age_at_diagnosis`) |
| `name_fa` | `text` | NOT NULL | Persian variable name |
| `label` | `text` | NOT NULL | Human-readable English label |
| `label_fa` | `text` | NOT NULL | Human-readable Persian label |
| `type` | `text` | NOT NULL, ENUM(numeric, categorical, date, text) | Data type |
| `description` | `text` | NOT NULL | English description |
| `description_fa` | `text` | NOT NULL | Persian description |
| `values_range` | `text` | NULL | Allowed values or numeric range |
| `values_range_fa` | `text` | NULL | Persian values/range |
| `missing_value_notes` | `text` | NULL | How missing values are coded |
| `missing_value_notes_fa` | `text` | NULL | Persian missing value notes |

---

## 6. Entity Relationship Diagram

```mermaid
erDiagram
    categories {
        serial id PK
        text name
        text name_fa
        text slug UK
        text description
        text description_fa
        timestamptz created_at
    }

    datasets {
        serial id PK
        text title
        text title_fa
        text description
        text description_fa
        integer records_count
        integer variables_count
        integer year_start
        integer year_end
        text geographic_coverage
        text geographic_coverage_fa
        text data_source
        text data_source_fa
        text citation_text
        text citation_doi
        boolean is_featured
        integer category_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    variables {
        serial id PK
        integer dataset_id FK
        text name
        text name_fa
        text label
        text label_fa
        text type
        text description
        text description_fa
        text values_range
        text values_range_fa
        text missing_value_notes
        text missing_value_notes_fa
    }

    categories ||--o{ datasets : "has many"
    datasets ||--o{ variables : "has many (cascade delete)"
```

---

## 7. API Reference

All endpoints are served under the `/api` base path.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/admin-login` | Verify admin password. Body: `{ password: string }`. Returns `{ ok: true }` on success. |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Returns `{ status: "ok" }` |

### Statistics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats` | Repository totals: datasets, variables, records, categories, year range, 5 recent datasets |

### Categories

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/api/categories` | — | List all categories with `datasetCount` |
| `POST` | `/api/categories` | `CategoryInput` | Create a category |
| `PUT` | `/api/categories/:id` | `CategoryUpdate` | Update a category |
| `DELETE` | `/api/categories/:id` | — | Delete a category |

### Datasets

| Method | Path | Query / Body | Description |
|---|---|---|---|
| `GET` | `/api/datasets/featured` | — | Up to 6 featured datasets (ordered by newest) |
| `GET` | `/api/datasets` | `search`, `categoryId`, `featured`, `page`, `limit` | Paginated dataset list |
| `GET` | `/api/datasets/:id` | — | Single dataset + inline variables array |
| `POST` | `/api/datasets` | `DatasetInput` | Create a dataset |
| `PUT` | `/api/datasets/:id` | `DatasetUpdate` | Update a dataset |
| `DELETE` | `/api/datasets/:id` | — | Delete a dataset (cascades to variables) |

### Variables

| Method | Path | Query / Body | Description |
|---|---|---|---|
| `GET` | `/api/variables` | `search`, `name`, `datasetId`, `categoryId`, `type`, `page`, `limit` | Paginated flat variable listing across all datasets |
| `GET` | `/api/datasets/:datasetId/variables` | — | All variables for one dataset |
| `POST` | `/api/datasets/:datasetId/variables` | `VariableInput` | Add a variable |
| `PUT` | `/api/datasets/:datasetId/variables/:id` | `VariableUpdate` | Update a variable |
| `DELETE` | `/api/datasets/:datasetId/variables/:id` | — | Delete a variable |

#### `GET /api/variables` query parameters

| Parameter | Type | Description |
|---|---|---|
| `search` | `string` | Fuzzy search across name, label, description (EN + FA) |
| `name` | `string` | Exact match on variable name — used for cross-dataset lookup |
| `datasetId` | `integer` | Filter to one dataset |
| `categoryId` | `integer` | Filter by dataset's category |
| `type` | `numeric \| categorical \| date \| text` | Filter by type |
| `page` | `integer` (default 1) | Page number |
| `limit` | `integer` (default 20) | Results per page |

### Export & Backup

All export endpoints stream downloadable files. No authentication required.

| Method | Path | Format | Filename |
|---|---|---|---|
| `GET` | `/api/export/json` | JSON | `iedr-full-export.json` |
| `GET` | `/api/export/schema` | JSON | `iedr-schema.json` |
| `GET` | `/api/export/json/categories` | JSON | `iedr-categories.json` |
| `GET` | `/api/export/json/datasets` | JSON (with nested variables) | `iedr-datasets.json` |
| `GET` | `/api/export/json/variables` | JSON | `iedr-variables.json` |
| `GET` | `/api/export/csv/categories` | CSV (UTF-8 BOM) | `iedr-categories.csv` |
| `GET` | `/api/export/csv/datasets` | CSV (UTF-8 BOM) | `iedr-datasets.csv` |
| `GET` | `/api/export/csv/variables` | CSV (UTF-8 BOM) | `iedr-variables.csv` |

> CSV files include a UTF-8 BOM (`\uFEFF`) for correct rendering of Persian text in Excel.

---

## 8. Frontend Pages

| Route | Component | Access | Description |
|---|---|---|---|
| `/` | `Home.tsx` | Public | Hero, live stats, featured datasets, category links |
| `/datasets` | `Datasets.tsx` | Public | Searchable/filterable paginated catalog |
| `/datasets/:id` | `DatasetDetail.tsx` | Public | Full metadata, variable table, copy-to-clipboard citation |
| `/variables` | `VariableDictionary.tsx` | Public | Cross-dataset variable browser with filter sidebar and detail sheet |
| `/about` | `About.tsx` | Public | Mission, team, contact |
| `/admin` | `Admin.tsx` | Password-gated | Full CRUD for datasets, categories, variables; export panel |

---

## 9. Dataset Management Workflow

### Adding a dataset (via Admin UI)

1. Navigate to `/admin` and authenticate with `ADMIN_PASSWORD`
2. Click the **Datasets** tab → **Add Dataset**
3. Fill in English and Persian fields: title, description, geographic coverage, data source
4. Set records count, variables count, year range
5. Select a category (must exist first)
6. Optionally set citation text, DOI, and "Featured" toggle
7. Click **Save** → `POST /api/datasets`
8. The dataset appears in the table immediately (TanStack Query cache invalidated)

### Updating a dataset

1. Click the pencil icon on any dataset row
2. Edit fields in the dialog
3. Click **Save** → `PUT /api/datasets/:id`

### Deleting a dataset

1. Click the trash icon → confirm in the alert dialog
2. `DELETE /api/datasets/:id` — all associated variables are cascade-deleted

### Marking a dataset as featured

Toggle **Featured** in the dataset edit dialog. Featured datasets appear on the Home page (max 6, ordered by newest).

---

## 10. Variable Management Workflow

### Adding variables to a dataset (via Admin UI)

1. Navigate to the **Variables** tab in Admin
2. Optionally filter by dataset using the dropdown
3. Click **Add Variable** → select the target dataset
4. Fill in:
   - **Name** (technical, e.g. `bmi`) and **Persian name**
   - **Label** (human-readable, e.g. "Body Mass Index") and **Persian label**
   - **Type**: Numeric / Categorical / Date / Text
   - **Description** (EN + FA)
   - **Allowed values / range** (optional, e.g. `15.0–65.0 kg/m²`)
   - **Missing value notes** (optional, e.g. `coded as -1`)
5. Click **Save** → `POST /api/datasets/:datasetId/variables`

### Cross-dataset variable lookup (public Variable Dictionary)

Navigate to `/variables`. The page calls `GET /api/variables` with the `name` parameter set to the exact variable name to find all datasets that include a variable with that name. Clicking a result navigates to the dataset detail page.

---

## 11. Admin Panel Features

The admin panel at `/admin` is protected by a server-side password check (`POST /api/auth/admin-login`). Authentication state is stored in `sessionStorage`; closing the browser tab clears it.

### Tabs

| Tab | Features |
|---|---|
| **Variables** | Searchable list of all variables across all datasets; filter by dataset and type; paginated (20/page); Add / Edit / Delete dialogs with all fields |
| **Datasets** | Table of all datasets; Add / Edit / Delete; featured toggle; category selector |
| **Categories** | Table of all categories; Add / Edit / Delete with EN + FA name, slug, description |
| **Export** | Download buttons for full JSON backup, schema definition, per-table JSON and CSV |

### Security model

- Password is stored only as an environment variable (`ADMIN_PASSWORD`) on the server; never in the database or frontend code
- The login endpoint returns only `{ ok: true }` on success — no token is issued
- The frontend stores only the string `"1"` in `sessionStorage` as a session flag
- All mutating API routes (`POST`, `PUT`, `DELETE`) are unprotected at the API level in v1 — they rely on the admin UI gate. For public deployments, add middleware-level protection (see `PROJECT_SETUP.md`)

---

## 12. Export & Backup

Export endpoints are registered at `/api/export/*` and require no authentication. They are intended for admin use via the Export tab.

### JSON exports

- **Full backup** (`/api/export/json`): one JSON object containing `categories`, `datasets`, and `variables` arrays
- **Datasets** (`/api/export/json/datasets`): each dataset includes a nested `variables` array
- **Schema** (`/api/export/schema`): human-readable JSON describing all tables, columns, types, constraints, and foreign key relationships

### CSV exports

- One file per table: categories, datasets, variables
- All fields included; multi-line text values are quoted and escaped per RFC 4180
- UTF-8 BOM prepended for Excel compatibility with Persian text

---

## 13. Bilingual & RTL Support

### Language context

`LanguageProvider` in `artifacts/iedr/src/lib/language.tsx` wraps the entire app. It exposes:

- `language`: `"en"` | `"fa"`
- `setLanguage(lang)`: switches language and sets `document.documentElement.dir`
- `t(en, fa)`: returns the string for the current language
- `isRtl`: `true` when Persian is active

### RTL layout rules

- Document root `dir` attribute is set to `"rtl"` when Persian is active
- All layout classes use `text-start` / `text-end` instead of `text-left` / `text-right`
- Spacing utilities `ms-*` / `me-*` (margin-inline) are used instead of `ml-*` / `mr-*`
- The Sheet component in `VariableDictionary` opens from `left` in RTL and `right` in LTR

### Fonts

Both fonts are loaded from Google Fonts in `index.html`:

- **Inter** — used for Latin (English) text
- **Vazirmatn** — used for Persian text; applied via `font-[Vazirmatn]` class in RTL contexts

---

## 14. Configuration Reference

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname`) |
| `PORT` | Yes | Port the API server listens on (set by workflow runner) |
| `ADMIN_PASSWORD` | Yes | Admin panel password (plain text, stored as server env var) |
| `SESSION_SECRET` | Provisioned | Reserved; not yet used in v1 |
| `NODE_ENV` | Optional | `development` or `production` |

### Common pnpm commands

| Command | Description |
|---|---|
| `pnpm --filter @workspace/api-server run dev` | Start API server (build + run) |
| `pnpm --filter @workspace/iedr run dev` | Start frontend dev server |
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate hooks + Zod schemas from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push Drizzle schema changes to the database |
| `pnpm --filter @workspace/api-server run typecheck` | Typecheck only the API server |
| `pnpm --filter @workspace/iedr run typecheck` | Typecheck only the frontend |

### Codegen workflow

When the OpenAPI spec (`lib/api-spec/openapi.yaml`) is modified:

1. Run `pnpm --filter @workspace/api-spec run codegen`
2. This generates files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`
3. Restart both workflows (api-server and iedr) to pick up regenerated schemas

When the Drizzle schema (`lib/db/src/schema/*.ts`) is modified:

1. Run `pnpm --filter @workspace/db run push` to apply changes to the live database
2. Restart the api-server workflow
