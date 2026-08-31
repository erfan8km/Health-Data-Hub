# IEDR Project Audit

**Iran Epidemiology Data Repository (IEDR)**  
**Audit date:** 2026-09-01  
**Scope:** Inspection of the current repository, source code, generated API contract, deployment documentation, and reachable development database.  
**Change policy for this audit:** No application code, package, database schema, or database record was changed. This report is the only file created by this audit.

> **Important scope note:** Database counts in this report are from the currently reachable development database, not an independently verified production database. The application stores dataset metadata and variable dictionaries; it does not store individual-level epidemiological records in the current schema.

---

## 1. Project overview

### What the application currently does

IEDR is a bilingual English/Persian web repository for discovering and documenting epidemiological and health-registry datasets from Iran. It provides:

- A public home page with repository statistics, featured datasets, a search entry point, and category browsing.
- A searchable, paginated dataset catalogue.
- Dataset detail pages with bilingual metadata, summary metrics, variable dictionaries, citations, and DOI links.
- A public variable dictionary spanning all datasets, with search, dataset/category/type filters, pagination, and cross-dataset lookup by variable name.
- A bilingual About page with mission, team, affiliation, contact, and website information.
- A password-gated browser admin panel for managing categories, datasets, and variables.
- JSON and CSV export endpoints for repository metadata, categories, datasets, variables, and a schema definition.

The current architecture is a metadata catalogue, not a data-download or data-analysis system. A dataset’s `recordsCount` describes the number of records represented by a dataset, but the underlying records are not stored in the current database tables and cannot be downloaded through the current application.

### Current MVP status

The MVP is functionally complete for demonstration of a bilingual epidemiological metadata repository:

- Public discovery and browsing are implemented.
- CRUD management for the three metadata entities is implemented in the UI and API.
- A variable dictionary is implemented.
- Repository statistics and featured-dataset presentation are implemented.
- Backup/export endpoints and an admin export tab are implemented.
- Ubuntu/Linux VPS deployment is documented.

The MVP is **not production-ready for unrestricted public operation or real individual-level health-registry data** without security, governance, validation, operational, and data-protection work. The most important reason is that the password gate is not enforced by the server on mutating API routes, and export endpoints are public.

### Currently implemented features

#### Public experience

- English/Persian language toggle.
- Automatic left-to-right or right-to-left document direction.
- Responsive navigation and mobile menu.
- Home-page repository statistics:
  - Dataset count.
  - Variable count as calculated by the statistics endpoint.
  - Total record count from dataset metadata.
  - Category count.
- Featured dataset list, limited by the API to six records.
- Category quick links.
- Dataset catalogue:
  - Debounced text search.
  - Category filtering.
  - Pagination.
  - Dataset cards with title, description, category, record count, variable count, year range, and geographic coverage.
- Dataset detail:
  - Bilingual title and description.
  - Source and category.
  - Record, variable, year, and geography metrics.
  - Inline variable dictionary.
  - Citation text copy-to-clipboard.
  - DOI link when a DOI is present.
  - Disabled “Request Download” button; no download workflow is implemented.
- Global variable dictionary:
  - Debounced search.
  - Dataset, category, and variable-type filters.
  - Paginated results.
  - Variable details in a side sheet.
  - Cross-dataset lookup by exact variable name.
- About page with bilingual mission statement, team cards, affiliations, contact email, address, and website.
- Loading skeletons and not-found/empty states.

#### Administration

- Admin password form.
- Dataset create, edit, and delete.
- Category create, edit, and delete.
- Variable create, edit, and delete.
- Dataset and variable searching/filtering in the admin interface.
- Featured-dataset flag management.
- Confirmation dialogs for destructive actions.
- Toast feedback for successful and failed operations.
- Browser-session logout.
- Export tab with:
  - Full JSON repository export.
  - Schema JSON export.
  - Category JSON and CSV exports.
  - Dataset JSON and CSV exports.
  - Variable JSON and CSV exports.

#### Backend

- Express API server.
- PostgreSQL access through Drizzle ORM and `pg`.
- Zod validation generated from the OpenAPI contract.
- Pino HTTP/application logging.
- CORS middleware.
- JSON and URL-encoded request parsing.
- Health endpoint.
- Repository statistics endpoint.
- Export endpoints with UTF-8 BOM on CSV responses for spreadsheet/Persian-text compatibility.

---

## 2. Technology stack

| Area | Current implementation |
|---|---|
| Frontend framework | React with TypeScript |
| Frontend build/dev server | Vite 7 |
| Backend framework | Express 5 |
| Database | PostgreSQL |
| ORM/database access | Drizzle ORM with `node-postgres` (`pg`) |
| Runtime validation | Zod v4 and `drizzle-zod` |
| API contract | OpenAPI 3.1 |
| API code generation | Orval-generated React Query client and Zod schemas |
| Client data fetching | TanStack React Query |
| Routing | Wouter |
| Styling | Tailwind CSS, Tailwind Vite plugin, CSS variables |
| UI components | shadcn/ui-style components built on Radix UI primitives |
| Icons | lucide-react |
| Forms | React Hook Form and `@hookform/resolvers` are installed; the current admin forms primarily use local React state |
| Motion/charts | Framer Motion and Recharts are installed; the current core pages do not depend on a chart dashboard |
| Logging | Pino and pino-http |
| Frontend package manager | pnpm workspace |
| Backend bundler | esbuild |
| Type checking | TypeScript 5.9 composite library checks plus leaf-package checks |
| Documented Node.js runtime | Node.js 24 |
| Fonts | Inter for English and Vazirmatn for Persian/RTL, loaded from Google Fonts |
| Reverse proxy in documented deployment | nginx |
| Process supervision in documented deployment | systemd |

### Important workspace packages

- `@workspace/iedr`: React/Vite frontend.
- `@workspace/api-server`: Express API.
- `@workspace/api-spec`: OpenAPI specification and code-generation configuration.
- `@workspace/api-client-react`: generated typed React Query client.
- `@workspace/api-zod`: generated request/response validation schemas and types.
- `@workspace/db`: Drizzle schema and PostgreSQL connection.
- `@workspace/scripts`: utility package; currently contains only a hello script, not a data seed script.

---

## 3. Project structure

```text
.
├── artifacts/
│   ├── iedr/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Layout.tsx
│   │   │   │   └── ui/                 # shadcn/ui-style reusable primitives
│   │   │   ├── hooks/                   # frontend hooks such as toast/mobile helpers
│   │   │   ├── lib/
│   │   │   │   ├── language.tsx         # English/Persian context and RTL handling
│   │   │   │   └── utils.ts             # shared UI utilities
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx
│   │   │   │   ├── Datasets.tsx
│   │   │   │   ├── DatasetDetail.tsx
│   │   │   │   ├── VariableDictionary.tsx
│   │   │   │   ├── About.tsx
│   │   │   │   ├── Admin.tsx
│   │   │   │   └── not-found.tsx
│   │   │   ├── App.tsx                  # providers and application routes
│   │   │   ├── main.tsx                 # frontend entry point
│   │   │   └── index.css                # theme tokens and global styles
│   │   ├── public/                      # favicon, Open Graph image, robots.txt
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── api-server/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── datasets.ts
│   │   │   │   ├── export.ts
│   │   │   │   ├── health.ts
│   │   │   │   ├── stats.ts
│   │   │   │   └── variables.ts
│   │   │   ├── app.ts                   # Express middleware and /api mount
│   │   │   └── index.ts                 # PORT validation and server startup
│   │   ├── build.mjs                    # esbuild bundle configuration
│   │   └── package.json
│   └── mockup-sandbox/                  # separate design-preview artifact
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml                 # API contract source of truth
│   ├── api-client-react/
│   │   └── src/generated/               # generated React Query client
│   ├── api-zod/
│   │   └── src/generated/               # generated Zod schemas/types
│   └── db/
│       ├── src/
│       │   ├── index.ts                 # Drizzle + PostgreSQL connection
│       │   └── schema/
│       │       ├── categories.ts
│       │       ├── datasets.ts
│       │       ├── variables.ts
│       │       └── index.ts
│       ├── drizzle.config.ts
│       └── package.json
├── scripts/
│   ├── src/hello.ts                     # current utility script
│   └── post-merge.sh
├── attached_assets/                     # uploaded/project assets
├── pnpm-workspace.yaml                  # workspace and dependency catalog
├── tsconfig.json                         # root library project references
├── tsconfig.base.json
├── TECHNICAL_DOCUMENTATION.md
├── PROJECT_SETUP.md
├── PROJECT_STATUS.md
└── IEDR_PROJECT_AUDIT.md                 # this report
```

### Contract-first API flow

The intended API development flow is:

1. Edit `lib/api-spec/openapi.yaml`.
2. Run the API-spec code-generation command.
3. Consume generated hooks from `@workspace/api-client-react`.
4. Consume generated Zod schemas/types from `@workspace/api-zod`.
5. Implement or update Express route handlers.

The current OpenAPI contract covers health, datasets, categories, variables, and statistics. The separately implemented admin-login and export endpoints are not fully represented in the current OpenAPI file, which is a contract/documentation gap.

---

## 4. Database

### Current database contents

The currently reachable development PostgreSQL database contains:

| Entity | Current count |
|---|---:|
| Categories | 5 |
| Dataset metadata rows | 8 |
| Variable dictionary rows | 20 |
| Sum of `datasets.records_count` | 1,933,171 |
| Sum of `datasets.variables_count` | 555 |

The data is metadata/sample content, not the 1,933,171 underlying records. The database has no table for individual records, files, observations, patients, or registry events.

### Categories currently present

1. Chronic Diseases — `chronic-diseases`
2. Infectious Diseases — `infectious-diseases`
3. Cancer Registry — `cancer-registry`
4. Maternal & Child Health — `maternal-child-health`
5. Mental Health — `mental-health`

### Dataset metadata currently present

1. National Diabetes Registry of Iran
2. Iran National Cancer Registry
3. Tehran Lipid and Glucose Study (TLGS)
4. National Maternal Mortality Surveillance
5. COVID-19 National Epidemiological Data
6. Isfahan Cohort Study
7. National Mental Health Survey (NMHS)
8. Breast Cancer Registry of Tehran

### Actual variable-row distribution

The database contains variable rows for only three of the eight datasets:

| Dataset ID | Dataset | `datasets.variables_count` metadata | Actual variable rows |
|---:|---|---:|---:|
| 1 | National Diabetes Registry of Iran | 64 | 8 |
| 2 | Iran National Cancer Registry | 48 | 6 |
| 3 | Tehran Lipid and Glucose Study (TLGS) | 142 | 0 |
| 4 | National Maternal Mortality Surveillance | 38 | 0 |
| 5 | COVID-19 National Epidemiological Data | 22 | 6 |
| 6 | Isfahan Cohort Study | 87 | 0 |
| 7 | National Mental Health Survey (NMHS) | 98 | 0 |
| 8 | Breast Cancer Registry of Tehran | 56 | 0 |

This is important when interpreting the UI: the dataset card/detail metric is a metadata claim, while the variable dictionary is backed by actual rows. The statistics endpoint sums the metadata claims and therefore reports 555 variables, not the 20 actual variable dictionary rows.

### Entity relationship diagram

```mermaid
erDiagram
    CATEGORIES ||--o{ DATASETS : groups
    DATASETS ||--o{ VARIABLES : contains

    CATEGORIES {
        serial id PK
        text name
        text name_fa
        text slug UK
        text description
        text description_fa
        timestamptz created_at
    }

    DATASETS {
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

    VARIABLES {
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
```

### Table: `categories`

Source: `lib/db/src/schema/categories.ts`

| Column | PostgreSQL type | Nullability/default | Key/constraint | Meaning |
|---|---|---|---|---|
| `id` | `serial` / integer sequence | Not null | Primary key | Category identifier |
| `name` | `text` | Not null | — | English category name |
| `name_fa` | `text` | Not null | — | Persian category name |
| `slug` | `text` | Not null | Unique | URL-safe category identifier |
| `description` | `text` | Nullable | — | English description |
| `description_fa` | `text` | Nullable | — | Persian description |
| `created_at` | `timestamptz` | Not null; `now()` | — | Creation timestamp |

### Table: `datasets`

Source: `lib/db/src/schema/datasets.ts`

| Column | PostgreSQL type | Nullability/default | Key/constraint | Meaning |
|---|---|---|---|---|
| `id` | `serial` / integer sequence | Not null | Primary key | Dataset identifier |
| `title` | `text` | Not null | — | English title |
| `title_fa` | `text` | Not null | — | Persian title |
| `description` | `text` | Not null | — | English description |
| `description_fa` | `text` | Not null | — | Persian description |
| `records_count` | `integer` | Not null; `0` | — | Number of records claimed by metadata |
| `variables_count` | `integer` | Not null; `0` | — | Number of variables claimed by metadata |
| `year_start` | `integer` | Not null | — | Start year |
| `year_end` | `integer` | Not null | — | End year |
| `geographic_coverage` | `text` | Not null | — | English geographic coverage |
| `geographic_coverage_fa` | `text` | Not null; empty string default | — | Persian geographic coverage |
| `data_source` | `text` | Not null | — | English data source |
| `data_source_fa` | `text` | Not null; empty string default | — | Persian data source |
| `citation_text` | `text` | Nullable | — | Citation text |
| `citation_doi` | `text` | Nullable | — | DOI identifier |
| `is_featured` | `boolean` | Not null; `false` | — | Whether shown as featured |
| `category_id` | `integer` | Not null | FK → `categories.id` | Owning category |
| `created_at` | `timestamptz` | Not null; `now()` | — | Creation timestamp |
| `updated_at` | `timestamptz` | Not null; `now()` | — | Updated by the Drizzle `$onUpdate` application behavior |

### Table: `variables`

Source: `lib/db/src/schema/variables.ts`

| Column | PostgreSQL type | Nullability/default | Key/constraint | Meaning |
|---|---|---|---|---|
| `id` | `serial` / integer sequence | Not null | Primary key | Variable identifier |
| `dataset_id` | `integer` | Not null | FK → `datasets.id`, `ON DELETE CASCADE` | Owning dataset |
| `name` | `text` | Not null | — | Technical variable name |
| `name_fa` | `text` | Not null | — | Persian variable name |
| `label` | `text` | Not null; empty string default | — | English human-readable label |
| `label_fa` | `text` | Not null; empty string default | — | Persian human-readable label |
| `type` | `text` | Not null | No database check constraint | Variable type |
| `description` | `text` | Not null | — | English description |
| `description_fa` | `text` | Not null | — | Persian description |
| `values_range` | `text` | Nullable | — | Allowed values or numeric range |
| `values_range_fa` | `text` | Nullable | — | Persian allowed values/range |
| `missing_value_notes` | `text` | Nullable | — | English missing-value notes |
| `missing_value_notes_fa` | `text` | Nullable | — | Persian missing-value notes |

### Relationships

1. One category can have many datasets.
   - `datasets.category_id` references `categories.id`.
   - The category foreign key has no explicit `ON DELETE` action, so PostgreSQL’s default restrictive behavior applies.
2. One dataset can have many variables.
   - `variables.dataset_id` references `datasets.id`.
   - Deleting a dataset cascades to its variables.
3. There is no user, role, session, raw-record, file, access-request, consent, audit-log, or permission relationship in the current schema.

### Indexes

The current public indexes observed in PostgreSQL are:

| Table | Index | Definition/purpose |
|---|---|---|
| `categories` | `categories_pkey` | Unique B-tree index on `id` |
| `categories` | `categories_slug_unique` | Unique B-tree index on `slug` |
| `datasets` | `datasets_pkey` | Unique B-tree index on `id` |
| `variables` | `variables_pkey` | Unique B-tree index on `id` |

There are no explicit indexes on:

- `datasets.category_id`
- `variables.dataset_id`
- dataset search columns
- variable search columns
- `variables.type`

The application uses `ILIKE '%term%'` searches, which may become slow as the catalogue grows without appropriate search/indexing strategy.

### Constraints and validation

- Primary keys are present on all three tables.
- Category slugs are unique.
- Required metadata fields are `NOT NULL`.
- Dataset-to-category and variable-to-dataset foreign keys are present.
- Dataset deletion cascades to variables.
- There are no database-level checks for:
  - Non-negative counts.
  - `year_start <= year_end`.
  - Valid DOI format.
  - Valid dataset/category text lengths.
  - Valid variable type values.
  - Unique variable names within a dataset.
- Request validation is performed in the API with generated Zod schemas, but it does not replace database constraints for all business rules.

### Seed/sample data

No checked-in database seed script was found. `scripts/src/hello.ts` is only a hello-world utility, and `scripts/package.json` has no seed command. The currently reachable database is populated with sample/demo metadata, but the source and repeatable procedure that produced that data are not present in the inspected project.

---

## 5. API

### API base path and common behavior

- Base path: `/api`
- Transport: HTTP JSON
- Express middleware:
  - Pino request logging.
  - CORS enabled for all origins through `cors()`.
  - JSON body parsing.
  - URL-encoded body parsing.
- Input validation: generated Zod schemas for the contract-backed routes.
- Typical errors:
  - `400` for invalid IDs, query parameters, or request bodies.
  - `404` for missing records.
  - `500` for database/server failures.

### Authentication status for API routes

The current API does not enforce authentication middleware. All routes below, including `POST`, `PUT`, `DELETE`, and export routes, are reachable without an authenticated API session. The `/auth/admin-login` endpoint only verifies a password and returns `{ "ok": true }`; it does not issue a cookie, bearer token, or server-side session.

The frontend stores a local browser flag after a successful password check, but that flag is not sent to the API. Consequently, the admin password gate controls navigation in the current UI but does not protect direct API access.

### Health

| Method | URL | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/api/healthz` | Liveness check | None | None | `200` JSON `{ "status": "ok" }` |

### Admin login

| Method | URL | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/api/auth/admin-login` | Compare a submitted password with `ADMIN_PASSWORD` | None; this is the login endpoint | JSON `{ "password": "..." }` | `200` `{ "ok": true }`; `400` if missing; `401` if incorrect; `503` if the environment variable is absent |

No login session is issued. `SESSION_SECRET` is not read by this route or by any other inspected application source.

### Datasets

| Method | URL | Purpose | Auth | Request parameters/body | Response |
|---|---|---|---|---|---|
| `GET` | `/api/datasets/featured` | Return up to six featured datasets | None | None | `200` array of dataset summaries, newest first |
| `GET` | `/api/datasets` | Paginated dataset catalogue | None | Query: `search`, `categoryId`, `featured`, `page` default `1`, `limit` default `12` | `200` `{ data, total, page, limit }` |
| `GET` | `/api/datasets/:id` | Return one dataset and its variables | None | Path `id` integer | `200` dataset detail with `variables`; `400` invalid ID; `404` missing |
| `POST` | `/api/datasets` | Create dataset metadata | **None enforced** | JSON dataset input: bilingual titles/descriptions, counts, years, geography, sources, optional citation fields, `isFeatured`, `categoryId` | `201` created dataset with category names; `400` validation; `500` server error |
| `PUT` | `/api/datasets/:id` | Update dataset metadata | **None enforced** | Path `id`; JSON partial dataset update | `200` updated dataset with category names; `400` validation; `404` missing; `500` server error |
| `DELETE` | `/api/datasets/:id` | Delete dataset metadata and cascading variables | **None enforced** | Path `id` integer | `204` empty response; `400` invalid ID; `404` missing; `500` server error |

Dataset search currently matches:

- `title`
- `description`
- `title_fa`
- `description_fa`

It does not search category names, data sources, geography, DOI, or variable contents.

### Categories

| Method | URL | Purpose | Auth | Request parameters/body | Response |
|---|---|---|---|---|---|
| `GET` | `/api/categories` | List categories with dataset counts | None | None | `200` array of categories including `datasetCount` |
| `POST` | `/api/categories` | Create a category | **None enforced** | JSON `{ name, nameFa, slug, description?, descriptionFa? }` | `201` category with `datasetCount: 0`; `400` validation; `500` server error |
| `PUT` | `/api/categories/:id` | Update a category | **None enforced** | Path `id`; JSON partial category update | `200` updated category with recalculated `datasetCount`; `400`, `404`, or `500` on failure |
| `DELETE` | `/api/categories/:id` | Delete a category | **None enforced** | Path `id` integer | `204` if deleted; `400`, `404`, or `500` on failure. A category referenced by datasets may fail because the FK is restrictive. |

### Variables

| Method | URL | Purpose | Auth | Request parameters/body | Response |
|---|---|---|---|---|---|
| `GET` | `/api/variables` | Paginated flat variable dictionary across datasets | None | Query: `search`, exact `name`, `datasetId`, `categoryId`, `type`, `page`, `limit` default `20` | `200` `{ data, total, page, limit }` with dataset/category context |
| `GET` | `/api/datasets/:datasetId/variables` | List variables for one dataset | None | Path `datasetId` integer | `200` array of variable rows; `400` invalid dataset ID; `500` server error |
| `POST` | `/api/datasets/:datasetId/variables` | Add a variable to a dataset | **None enforced** | Path `datasetId`; JSON variable fields: names, labels, type, descriptions, optional range and missing-value notes | `201` created variable; `400` validation; `500` server error |
| `PUT` | `/api/datasets/:datasetId/variables/:id` | Update one variable within one dataset | **None enforced** | Path `datasetId` and `id`; JSON partial variable update | `200` updated variable; `400`, `404`, or `500` |
| `DELETE` | `/api/datasets/:datasetId/variables/:id` | Delete one variable within one dataset | **None enforced** | Path `datasetId` and `id` | `204` if deleted; `400`, `404`, or `500` |

Variable search currently matches:

- `name`
- `label`
- `description`
- `name_fa`
- `label_fa`
- `description_fa`

The exact `name` query parameter performs equality matching and is used for cross-dataset lookup.

### Statistics

| Method | URL | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/api/stats` | Repository summary for the home page | None | None | `200` `{ totalDatasets, totalVariables, totalRecords, categoriesCount, yearRange, recentDatasets }` |

`totalVariables` is calculated by summing `datasets.variables_count`, not by counting rows in `variables`.

### Export and backup routes

These routes are implemented in `artifacts/api-server/src/routes/export.ts`. They are not protected by the current admin gate and are not fully represented in `lib/api-spec/openapi.yaml`.

| Method | URL | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/api/export/schema` | Export a JSON schema definition | None | None | Download-style JSON containing version, generated timestamp, table columns, relationships, and types |
| `GET` | `/api/export/json` | Full repository metadata export | None | None | JSON containing `exportedAt`, `categories`, `datasets`, and `variables` |
| `GET` | `/api/export/json/categories` | Category JSON export | None | None | JSON `{ exportedAt, count, data }` |
| `GET` | `/api/export/json/datasets` | Dataset JSON export | None | None | JSON `{ exportedAt, count, data }`; each dataset includes nested variables |
| `GET` | `/api/export/json/variables` | Flat variable JSON export | None | None | JSON `{ exportedAt, count, data }` |
| `GET` | `/api/export/csv/categories` | Category CSV export | None | None | UTF-8 CSV with BOM and attachment filename |
| `GET` | `/api/export/csv/datasets` | Dataset metadata CSV export | None | None | UTF-8 CSV with BOM and attachment filename |
| `GET` | `/api/export/csv/variables` | Variable CSV export | None | None | UTF-8 CSV with BOM and attachment filename |

The exports contain metadata and variable-dictionary content only. There is no raw-record export because raw records are not part of the current schema.

---

## 6. Frontend pages and routes

The frontend is mounted through Wouter with the Vite `BASE_URL` as its route base.

| Route | Page | Functionality |
|---|---|---|
| `/` | Home | Repository introduction, bilingual search entry point, live statistics, featured datasets, category navigation |
| `/datasets` | Datasets | Searchable/filterable paginated dataset catalogue |
| `/datasets/:id` | Dataset Detail | Dataset metadata, key metrics, inline variable dictionary, citation copy, DOI link |
| `/variables` | Variable Dictionary | Search and filter variables across all datasets; view variable details and related datasets |
| `/about` | About | Mission, team, affiliations, contact information, website |
| `/admin` | Admin | Password gate followed by CRUD tabs for variables, datasets, categories, and export |
| unmatched | Not Found | Generic not-found page |

### Home

The home page calls:

- `GET /api/stats`
- `GET /api/datasets/featured`
- `GET /api/categories`

The search form navigates to `/datasets?search=...`.

### Dataset catalogue

The catalogue calls `GET /api/datasets` with a debounced search term, selected category, page, and a page size of 12. It displays dataset cards and previous/next pagination.

### Dataset detail

The detail page calls `GET /api/datasets/:id`. The server returns the dataset and all currently stored variable rows inline. The page displays the metadata-defined `variablesCount`, even when that number differs from the number of variable rows returned.

The “Request Download” button is visibly present but disabled. No request, access approval, or data-download behavior is implemented.

### Variable dictionary

The public dictionary calls:

- `GET /api/variables`
- `GET /api/datasets`
- `GET /api/categories`

It supports dataset/category/type filters and a debounced multilingual search. Selecting a variable opens a detail sheet and performs an exact-name lookup to show matching variables in other datasets.

### About

The About page is static frontend content. Team members, contact email, address, and website are hard-coded in the page component; they are not database-backed.

### Admin

The Admin page starts in a login state unless its browser session flag is present. After successful login it renders tabs for variables, datasets, categories, and export. The UI calls the mutation APIs directly without sending a server-issued credential.

---

## 7. Admin panel

### Authentication mechanism

1. The browser displays an admin password form.
2. The form sends `POST /api/auth/admin-login` with the entered password.
3. The API compares the plaintext request value with the `ADMIN_PASSWORD` environment variable.
4. On success, the browser stores `iedr_admin_auth = "1"` in `sessionStorage`.
5. On subsequent page rendering in that browser tab, the presence of that value bypasses the login screen.

There is no:

- User account system.
- Clerk/Replit Auth integration.
- Replit Auth integration.
- Cookie session.
- Signed token.
- Server-side session record.
- Permission/role model.
- Logout request to invalidate a server session.

The logout action only removes the browser `sessionStorage` flag.

### Dataset CRUD

The dataset tab provides:

- Create form.
- Edit form.
- Delete confirmation.
- Bilingual title and description.
- Record and variable metadata counts.
- Year range.
- Geographic coverage in English and Persian.
- Data source in English and Persian.
- Optional citation text and DOI.
- Featured toggle.
- Category selection.

The UI uses generated hooks for create, update, and delete operations and invalidates list queries after mutations.

### Variable CRUD

The variable tab provides:

- Search over variable dictionary results.
- Dataset filter.
- Variable type filter.
- Pagination.
- Create and edit dialogs.
- Dataset selection.
- Technical and Persian names.
- English and Persian labels.
- Type selection.
- English and Persian descriptions.
- English and Persian values/range.
- English and Persian missing-value notes.
- Delete confirmation.

### Category management

The category tab provides:

- List of categories.
- Dataset count per category.
- Create category.
- Edit category.
- Delete category.
- English and Persian names.
- Slug.
- English and Persian descriptions.

### Export functionality

The export tab offers download controls for all implemented export endpoints. It does not import or restore data. There is no upload, import, merge, overwrite, or rollback UI.

### Where authentication/session information is stored

- Expected password: server environment variable `ADMIN_PASSWORD`.
- Browser login flag: current tab’s `sessionStorage` under `iedr_admin_auth`.
- `SESSION_SECRET`: documented/configured as an environment variable but unused by the current source.
- No authentication information is stored in PostgreSQL.

---

## 8. Search and filtering

### Dataset search

The frontend waits approximately 400 ms after input before updating the query. The API uses case-insensitive `ILIKE` substring matching across:

- English title.
- English description.
- Persian title.
- Persian description.

Dataset filters:

- `categoryId`.
- `featured`.
- Pagination through `page` and `limit`.

The public catalogue currently exposes category filtering, but not a visible featured filter control.

### Variable search

The public variable dictionary waits approximately 350 ms after input before updating the query. The API uses case-insensitive `ILIKE` substring matching across:

- Technical name.
- Human-readable English label.
- English description.
- Persian name.
- Persian label.
- Persian description.

Variable filters:

- Dataset ID.
- Category ID through the dataset’s category.
- Variable type.
- Exact variable name through `name`.
- Pagination.

### Search limitations

- Search is substring matching and not full-text search.
- Search does not cover all metadata fields.
- No ranking, stemming, synonym support, or Persian-specific normalization is implemented.
- Search columns have no dedicated indexes.
- Variable type filtering expects the API’s lower-case enum values, but current sample database rows contain values such as `Integer`, `Continuous`, `String`, `Ordinal`, and `Date`. This can produce inconsistent filtering and editing behavior.

---

## 9. Internationalization

### English and Persian support

The `LanguageProvider` exposes:

- `language`: `en` or `fa`.
- `setLanguage`.
- `isRtl`.
- `t(en, fa)`, which returns the selected language and falls back to the other value when the selected value is empty.

Page and component copy generally includes both English and Persian strings. Dataset, category, and variable records have bilingual fields for user-facing metadata.

### RTL implementation

When Persian is selected:

- `document.documentElement.dir` is set to `rtl`.
- The body font changes to Vazirmatn.
- Layouts use RTL-aware utilities and `text-start` in important places.
- Persian data fields are displayed where available.
- The variable detail sheet and directional controls account for RTL.

When English is selected:

- Document direction is `ltr`.
- The body font is Inter.

### Font

Inter and Vazirmatn are referenced from Google Fonts in `index.html`. This is an external font dependency unless the fonts are self-hosted during an offline deployment.

### Translation limitations

- There is no translation catalog or message extraction system.
- Most translations are inline pairs in React components.
- Static team/contact content is hard-coded.
- Some API/database values may be missing Persian alternatives and fall back to English.
- Persisting the language preference across browser sessions is not implemented; the provider starts in English.

---

## 10. Security

### Current controls

- Admin password is supplied through `ADMIN_PASSWORD`, not hard-coded in the repository.
- The password is not written to the database.
- `password` input is rendered as a password field by default.
- Request bodies are parsed as JSON/URL-encoded data.
- Route inputs are validated with Zod schemas.
- Dataset deletion cascades to child variables at the database level.
- Pino logs request method, URL without query string, request ID, and response status.
- The deployment guide recommends HTTPS with Let’s Encrypt.

### Environment variables

| Variable | Current use | Required/observed status |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection for Drizzle and Drizzle Kit | Required by database package and schema push |
| `PORT` | API server listen port; frontend Vite port in the Replit workflow | Required by API startup |
| `NODE_ENV` | Build/dev behavior and documented deployment | Used by frontend build configuration and scripts |
| `ADMIN_PASSWORD` | Plaintext comparison for admin login | Required for login to work |
| `SESSION_SECRET` | No current source usage found | Documented as recommended, but not functional |
| `BASE_PATH` | Vite frontend base path | Defaults to `/` in `vite.config.ts` |
| `REPL_ID` | Detects Replit for development-only Vite plugins | Not required for standard VPS deployment |

The database package also supports the standard PostgreSQL environment variables indirectly through `pg`, but the application explicitly requires `DATABASE_URL`.

### Password handling

- The API compares the submitted password directly to the `ADMIN_PASSWORD` environment value.
- There is no password hash, password rotation workflow, attempt counter, lockout, or rate limit.
- The password is sent in a request body and therefore requires HTTPS in any non-local deployment.
- The password is not logged by the current Pino request serializer, but generic infrastructure logging should still be reviewed.

### Session handling

There is no server session. `sessionStorage` is client-controlled, can be created or modified by browser developer tools, disappears when the tab/session is closed, and is not a proof of authorization to the API.

### Potential security weaknesses

The following are concrete issues in the current implementation:

1. **Mutating API routes are unauthenticated.** Anyone who can reach the API can call dataset, category, and variable `POST`, `PUT`, and `DELETE` endpoints directly.
2. **Export routes are unauthenticated.** Anyone who can reach the API can retrieve all stored metadata and variable-dictionary content.
3. **The browser gate is not authorization.** The `sessionStorage` flag is not verified by the server.
4. **No rate limiting.** Login and mutation endpoints have no brute-force or abuse protection.
5. **CORS is open to all origins.** `cors()` is used without an allowlist.
6. **No security-header middleware was observed.** HSTS, CSP, frame policy, and related headers are left to the reverse proxy or browser defaults.
7. **No audit trail.** Changes do not record operator identity, timestamp, before/after values, reason, or source IP in a database audit log.
8. **No input business-rule checks at the database level.** Negative counts, invalid year ranges, arbitrary types, and duplicate variable names are not constrained by the database.
9. **Potentially sensitive metadata is publicly accessible.** DOI, source, geography, record counts, and variable definitions are exposed through public routes and exports.
10. **No backup encryption or access policy is implemented by the application.** The deployment guide describes shell-level backups, but backup storage security is an operational responsibility.

### Changes needed before production

Before exposing the API to the public internet, at minimum:

- Enforce server-side authentication/authorization for every mutation and administrative export.
- Replace the browser-only flag with a secure session or token mechanism.
- Use HTTPS everywhere.
- Restrict CORS to known frontend origins.
- Add rate limiting and login abuse controls.
- Add security headers at nginx and/or Express.
- Add server-side authorization tests and audit logging.
- Add database constraints/business validation for counts, years, types, and variable uniqueness.
- Establish encrypted, access-controlled, tested backups.
- Review whether any metadata itself should be restricted.

---

## 11. Data privacy

### Current architecture

The current schema is suitable for a public catalogue of **dataset metadata and variable dictionaries**, subject to ordinary web security and content-review controls. It is not an architecture for storing or serving real individual-level epidemiological or health-registry data.

### Metadata versus individual-level raw data

#### Metadata currently stored

- Dataset names and bilingual descriptions.
- Claimed record and variable counts.
- Year coverage.
- Geographic coverage.
- Data-source descriptions.
- Citation and DOI fields.
- Featured status.
- Category assignments.
- Variable names, labels, descriptions, ranges, allowed values, and missing-value notes.

#### Individual-level data not currently stored

- Patient/person records.
- Names, national identifiers, addresses, phone numbers, or emails.
- Clinical measurements as row-level observations.
- Dates of birth or encounter-level dates.
- Diagnoses, treatments, outcomes, or laboratory event rows.
- Raw CSV, Excel, Parquet, database, or registry files.
- Consent records, data-use agreements, access requests, or data-release approvals.

### Privacy assessment

- The current application does not itself contain raw individual-level health data in the observed schema.
- The metadata may still reveal information about a registry, geographic coverage, population, source institution, or sensitive variable definitions; it should not automatically be assumed to be risk-free.
- If raw health data are added later, the current architecture is insufficient without identity management, least-privilege access, encryption, auditability, consent/legal-basis controls, de-identification or pseudonymization, retention/deletion rules, secure file handling, and a formal data-governance process.
- The current public export endpoints would be inappropriate for unrestricted raw-data export.

---

## 12. Deployment outside Replit

### Overall assessment

The IEDR web/API/database stack is portable to a standard Ubuntu VPS. It uses standard React/Vite, Express, PostgreSQL, Drizzle, Node.js, nginx, and systemd components. No Replit-hosted database, authentication provider, object storage, or runtime API is required by the IEDR application itself.

The current `PROJECT_SETUP.md` contains a useful deployment outline, but it should be reviewed before treating it as a production runbook because of the warnings listed below.

### Required software

- Ubuntu 22.04+ or Debian 12+.
- Node.js 24, or a compatible supported Node.js version.
- pnpm.
- PostgreSQL 16 or compatible PostgreSQL version.
- nginx or another reverse proxy/static server.
- systemd or another process supervisor for the API.
- TLS certificate tooling, such as Certbot, for HTTPS.
- Git, curl, and standard build tools.

### Environment variables

The API needs:

```text
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=8080
NODE_ENV=production
ADMIN_PASSWORD=<strong secret>
```

`SESSION_SECRET` is documented but currently unused. `BASE_PATH=/` is appropriate when nginx serves the frontend at the domain root. `REPL_ID` is not needed on Ubuntu.

### Build commands

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/iedr run build
```

The API build produces:

```text
artifacts/api-server/dist/index.mjs
```

The frontend build is configured to produce:

```text
artifacts/iedr/dist/public/
```

### Database setup

The documented setup creates a PostgreSQL role and database, then uses Drizzle Kit push with `DATABASE_URL`. The current repository does not contain a repeatable checked-in seed script. A clean installation therefore creates schema only; sample/demo records must be loaded through another controlled process or manually through the API/database.

### Production start command

The API server requires `PORT` and starts with:

```bash
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The deployment guide places this behind a systemd service.

The frontend is static and does not need a Node process in production if nginx serves the built files.

### Reverse proxy and port configuration

Recommended arrangement:

- nginx listens on ports 80/443.
- nginx serves `artifacts/iedr/dist/public/`.
- nginx proxies `/api/` to the API process on `127.0.0.1:8080`.
- The API process listens only on the internal interface/port when possible.
- nginx provides SPA fallback to `index.html`.
- HTTPS should be enforced.

### Deployment documentation warnings

The existing `PROJECT_SETUP.md` contains these items that should be treated as warnings:

1. Its nginx example sets the frontend root to `artifacts/iedr/dist`, while the actual Vite output is `artifacts/iedr/dist/public`. The static root must match the actual output directory.
2. It references `node scripts/src/seed.js`, but no such file exists in the inspected repository.
3. It says the export tab can be used to import a previously exported JSON backup. The current export tab only downloads files; no import functionality exists.
4. It recommends `SESSION_SECRET`, but the current application does not use it.
5. It suggests securing mutation routes as a future/recommended step, but this is a material production security requirement, not optional hardening for an internet-exposed deployment.

---

## 13. Replit dependencies

### Runtime service dependency

**No Replit service is required by the IEDR application runtime.**

The application uses standard self-hostable components:

- Node.js.
- React/Vite.
- Express.
- PostgreSQL.
- Drizzle ORM.
- nginx/systemd in the documented VPS deployment.

### Replit-specific packages and metadata

The frontend package lists:

- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`
- `@replit/vite-plugin-runtime-error-modal`

`artifacts/iedr/vite.config.ts` loads these only when `REPL_ID` is present and the build is not production. On a normal Ubuntu VPS, `REPL_ID` is absent, so these plugins are not loaded and no Replit runtime service is called. They remain package-install dependencies unless removed in a future portability cleanup.

The repository also contains Replit artifact metadata under `.replit-artifact/` and a separate mockup-sandbox artifact that uses Replit development tooling. Those files are relevant to the Replit workspace but are not needed to run the built IEDR frontend/API on an independent VPS.

### Conclusion on portability

IEDR can be exported and deployed outside Replit, but the deployer should:

- Install dependencies from the lockfile.
- Configure an independent PostgreSQL database.
- Build the API and frontend.
- Serve the frontend from `dist/public`.
- Run the API with a process supervisor.
- Configure nginx or an equivalent reverse proxy.
- Address the security findings before exposing mutation/export routes publicly.

---

## 14. Backup and data portability

### Current application exports

The application currently provides:

- Schema JSON.
- Full metadata JSON.
- Categories JSON and CSV.
- Datasets JSON and CSV.
- Variables JSON and CSV.

JSON is the better application-level portability format because it preserves nulls, booleans, timestamps, and nested dataset variables. CSV is convenient for spreadsheet review and includes a UTF-8 BOM, but it is flat and requires a separate relationship reconstruction step.

### Database-level backup

The deployment documentation describes PostgreSQL logical backups with `pg_dump` and restoration with `psql`. These are the appropriate mechanism for preserving the complete PostgreSQL database, including sequences and database-level details as configured.

### What the current exports do not include

- PostgreSQL roles and grants.
- Database extensions/configuration.
- Migration history, if any.
- Application environment secrets.
- nginx/systemd configuration.
- Raw epidemiological record files, because they are not stored.
- A data-import or restore command inside the application.

### Moving to another server

A complete move requires:

1. Copying the repository and lockfile.
2. Installing the documented Node.js/pnpm/PostgreSQL stack.
3. Creating a new PostgreSQL database and role.
4. Applying the Drizzle schema.
5. Restoring a `pg_dump` backup, or loading the application-level JSON/CSV exports with a separate controlled import process.
6. Rebuilding the API and frontend.
7. Recreating environment variables without committing them.
8. Recreating the reverse proxy and process-supervisor configuration.

The current application does not implement a one-click restore/import workflow.

---

## 15. Current limitations

The following capabilities are not implemented:

### Data and repository scope

- No raw dataset files or individual-level records.
- No data preview or row-level browsing.
- No actual dataset download.
- No “Request Download” workflow; the button is disabled.
- No upload or import from CSV, Excel, JSON, or other data formats.
- No application-level restore from an export.
- No data versioning, release versions, or immutable snapshots.
- No dataset file checksums or provenance chain.
- No automated metadata-to-file consistency checks.
- No data dictionary import from source files.

### Identity, authorization, and governance

- No server-enforced authentication for admin mutations.
- No users, roles, permissions, or institutions.
- No secure server session.
- No operator identity in changes.
- No audit log.
- No access-request or approval workflow.
- No consent, data-use agreement, ethics review, or governance record.
- No API keys or service accounts.

### Data quality and interoperability

- No database checks for counts, years, types, or variable uniqueness.
- No controlled vocabulary registry for variable types.
- No standards mapping to ICD, SNOMED, LOINC, OMOP, FHIR, or other terminology.
- No machine-readable provenance or methodology model.
- No automated validation of DOI or citation fields.
- No duplicate-dataset detection.
- No full-text/Persian-normalized search.

### Operations

- No migrations directory or versioned migration workflow is visible; schema management uses Drizzle Kit push.
- No repeatable checked-in seed script.
- No automated backup job in the application.
- No backup encryption, retention, or restore verification system.
- No monitoring, alerting, metrics, or health checks beyond a basic liveness response.
- No automated API or end-to-end test suite was part of the inspected implementation.
- No CI/CD deployment definition was found in the inspected project tree.

### User experience

- Language preference is not persisted.
- Static About/team/contact data is not admin-editable.
- No deep link or saved-search mechanism.
- No advanced sorting or multi-select filters.
- No accessibility audit or formal WCAG conformance evidence.
- No formal content review/publishing status beyond the featured flag.

---

## 16. Known bugs, warnings, and technical debt

### Confirmed data/model inconsistency

The live sample database currently contains 20 variable rows, while `datasets.variables_count` sums to 555. The statistics endpoint reports the metadata sum, so the home page can show 555 variables while the variable dictionary contains only 20 actual rows. This is either intentional “available dataset metadata” versus “currently documented variable rows” semantics or a data completeness bug; the product does not currently distinguish the two.

### Variable-type mismatch

The OpenAPI/schema contract and frontend forms define variable types as:

```text
numeric, categorical, date, text
```

The current database sample rows contain values including:

```text
Integer, Continuous, Categorical, String, Ordinal, Date
```

There is no database check constraint on `variables.type`. This mismatch can cause type filters and update forms to behave inconsistently.

### Admin authentication does not protect the API

The browser can display the admin panel only after a successful password comparison, but the API does not verify that state. Direct calls to mutation endpoints do not require the password. This is the highest-priority security warning.

### Public exports

All metadata exports are GET endpoints without authentication. This is appropriate only if the repository’s entire metadata catalogue is intentionally public.

### Category delete behavior

`datasets.category_id` is a required foreign key without cascade. Deleting a category with associated datasets is likely to fail at the database layer and be returned as a generic `500` rather than a clear conflict response.

### Missing performance indexes

The common relationship and search columns have no explicit supporting indexes. The current sample is small, but catalogue performance should be reconsidered before large-scale growth.

### Export scalability

Dataset JSON export fetches variables separately for each dataset, creating an N+1 query pattern. It is acceptable for the current eight-dataset sample but may not scale to a large catalogue.

### Deployment-documentation inconsistencies

The existing VPS guide has the frontend static root, seed-script, import-functionality, and `SESSION_SECRET` discrepancies described in Section 12.

### Replit development package residue

The production-safe conditional loading avoids a runtime dependency on Replit, but Replit Vite plugins remain in the frontend dependency list and comments in generated UI components. This is not a runtime blocker for Ubuntu, but it is technical residue in a project that aims to be fully independent.

---

## 17. Recommended next steps

These are recommendations only. They were not implemented during this audit.

### Priority 0 — before any public production deployment

1. Add server-enforced admin authentication and authorization to all mutation routes.
2. Decide whether export endpoints are public; protect them if they are administrative backups.
3. Replace the client-controlled `sessionStorage` gate with a secure server session or equivalent.
4. Enforce HTTPS, restrict CORS, add rate limiting, and add security headers.
5. Review metadata for privacy and institutional disclosure risk.

### Priority 1 — data integrity

6. Decide whether `variables_count` is a declared source-dataset count or the count of dictionary rows stored in IEDR; expose separate fields if both meanings are needed.
7. Normalize existing variable type values to the declared enum, or formally expand/version the controlled vocabulary.
8. Add database checks for non-negative counts, valid year ranges, and allowed types.
9. Add a uniqueness policy for variable names within a dataset.
10. Define behavior for deleting categories that still contain datasets.
11. Create a repeatable seed/import process and document the provenance of demo records.

### Priority 2 — operations and portability

12. Correct the nginx static root in `PROJECT_SETUP.md`.
13. Remove or clearly separate the nonexistent seed/import instructions.
14. Add versioned database migrations and a tested upgrade path.
15. Establish encrypted, rotated, retained, and periodically restored backups.
16. Add monitoring, structured error reporting, and operational alerts.
17. Add automated API contract, authorization, and CRUD tests.

### Priority 3 — repository maturity

18. Add controlled vocabulary and provenance models.
19. Add full-text/Persian-aware search and indexes appropriate for catalogue size.
20. Add dataset release/version management and publication review status.
21. Add a governed download/access-request flow if raw data will ever be distributed.
22. Map metadata and variables to the standards required by the intended university/public-health users.

---

## 18. Final status

### Complete

- Bilingual public repository shell.
- Home, catalogue, detail, variable dictionary, About, and Admin routes.
- Category, dataset, and variable CRUD APIs and UI.
- Dataset search/filter/pagination.
- Variable search/filter/pagination and cross-dataset lookup.
- Featured datasets and repository statistics.
- Citation display/copy and DOI linking.
- JSON/CSV metadata exports and schema export.
- PostgreSQL/Drizzle persistence.
- Linux VPS deployment outline.

### Partially complete

- Dataset variable dictionaries: the UI and schema support them, but only 20 variable rows exist for 8 datasets and metadata counts do not match actual dictionary rows.
- Admin security: password gate exists in the UI, but server-side API authorization is missing.
- Portability documentation: the main path is present, but several deployment instructions need correction.
- API contract coverage: core CRUD/statistics routes are represented in OpenAPI, while auth/export routes are implemented outside the current contract.

### Missing

- Raw data storage, upload, preview, and download.
- Secure server-enforced authentication and authorization.
- User/role/permission management.
- Audit logs and governance workflows.
- Import/restore functionality.
- Repeatable seed data process.
- Production-grade privacy, security, monitoring, and backup controls.

### Ready for demonstration to a university professor?

**Yes, with a clear scope statement.**

The current MVP is suitable for demonstrating:

- The concept of a bilingual Iranian epidemiology metadata repository.
- Dataset discovery and categorization.
- Variable-dictionary presentation.
- Admin metadata management.
- Basic export and Linux portability.

During a demonstration, it should be stated explicitly that the displayed record counts are metadata/sample values, not records stored in the application, and that the current admin password is a prototype gate rather than production authorization.

### Ready for real registry data?

**No, not for real individual-level registry data.**

The current system does not store raw individual-level data, which reduces immediate exposure risk, but it also lacks the controls required to safely introduce such data. In particular, API mutations and exports are not server-authenticated, there is no auditability or access-governance model, and there are no privacy, retention, de-identification, or secure file-handling controls.

It can be used as a starting point for a public metadata catalogue after the security and data-quality issues are addressed. It should not be treated as an approved platform for real identifiable, sensitive, or restricted health records in its present state.

### Overall assessment

**IEDR MVP status: demonstration-ready metadata repository; not production-ready for real health-registry data or unrestricted administrative operation.**
