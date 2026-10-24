# RegistryHub admin prototype (local-only)

## Scope
This isolated UI prototype lives in `admin-prototype/`. It is not imported by the public Vite app. It does not change `main`, the public site, Worker, domain, Cloudflare settings, or deployment configuration.

## Try it
Open `index.html` locally in a browser. Load copies of:
- `artifacts/iedr/public/data/registries.json`
- `artifacts/iedr/public/data/categories.json`
- `artifacts/iedr/public/data/countries.json`

The prototype supports search, add/edit/delete of local drafts, basic catalogue checks, and JSON export. Country and category choices are controlled by the loaded reference files. City IDs are normalized to lowercase ASCII IDs (for example, `mashhad`). Existing slugs are locked while editing because they are used in public detail URLs. Unknown properties on an existing record are preserved when it is edited.

Drafts autosave in this browser's `localStorage`; a warning appears before leaving with unsaved-to-export changes. This is only local convenience, not secure storage. Avoid shared computers. No network calls, authentication, GitHub write integration, or deployment functionality is implemented.

## Validation alignment
The client mirrors the current `validate-data.mjs` rules for registry fields:
- slug and bilingual titles are required;
- country IDs and category IDs are checked against reference files when loaded;
- city is required;
- categories must contain at least one ID;
- `description` and `officialUrl` must be strings but may be empty;
- a non-empty `officialUrl` must parse as a valid HTTPS URL.

This browser validation is a usability aid, not a security boundary. The CI validator remains authoritative. The client also warns about duplicate slugs. Keep these rules aligned when the catalogue schema changes.

## Recommended production architecture
- Put the admin hostname behind **Cloudflare Access** with an allowlist for approved administrator email addresses.
- The Worker must independently verify the Access JWT (signature, issuer/audience and expiry) on every protected request. Access in front of the page alone is not sufficient to secure an exposed API endpoint.
- Do not put a GitHub PAT or other write secret in browser JavaScript, HTML, local storage, or a public repository.
- Have the client send a narrow operation (for example, add/update/delete a registry by slug), not a filename, repository path, arbitrary branch, or replacement file.
- The current isolated Worker scaffold accepts a complete `registries` array, reads current registry/category/country JSON from `main`, validates the payload, creates a separate branch, and opens a Pull Request. It never merges or writes to `main`. Before production, prefer per-record operations and add explicit stale-base conflict handling.
- The Worker imports the server-side validator in `admin-api/src/validate.mjs`; CI runs unit tests for both the validator and request guards. Keep this schema aligned with `artifacts/iedr/scripts/validate-data.mjs`.
- Use a fine-grained GitHub credential restricted to this repository and only the permissions required to read contents, create a branch, and open a PR. Keep it in Worker secrets; never expose it in responses or logs.
- Protect `main` with required CI checks and review where repository settings/plan permit. CI and human review are the release gate. The Worker must never write directly to `main`.
- This PR proposes removing the GitHub Pages deployment workflow. The change is only on the review branch and has no effect until the PR is merged. The live default branch and hosting settings have not been changed.

## Admin API scaffold status
A separate Worker implementation now exists under `admin-api/`. It verifies the Cloudflare Access JWT signature, issuer, audience, expiry and allowlisted email; checks the request origin and payload size; validates the full registry array; and opens a branch + PR using a server-side GitHub token. Automated tests cover basic request guards.

**Not production-ready / not deployed:** no Cloudflare Access application/policy or Worker secrets have been configured; the admin UI is not yet wired to the API; no deployment workflow exists for this separate Worker; the full-array update flow needs a stronger stale-base conflict strategy; and end-to-end tests against a staging repository are still needed.

Required Worker configuration before a future deployment:
- Non-secret variables: `CF_ACCESS_TEAM_DOMAIN` (team domain, e.g. `team.cloudflareaccess.com`), `CF_ACCESS_AUD` (the Access application's AUD tag), `ADMIN_EMAIL` (the one allowlisted administrator email), and `ADMIN_ORIGIN` (exact HTTPS origin of the admin UI).
- Secret: `GITHUB_TOKEN`, a fine-grained token limited to this repository with Contents read/write and Pull requests read/write permissions as required by the API calls.
- The Worker also has a fixed `GITHUB_REPOSITORY` variable in its separate Wrangler config. Do not reuse the public site's deployment workflow to deploy this admin API without a separate review.

Do not deploy until the Access app, allowed admin email, exact admin origin, and least-privilege GitHub token are configured and reviewed.
