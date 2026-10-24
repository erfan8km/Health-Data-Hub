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
- The Worker should read the latest catalogue from `main`, apply the operation server-side, validate the full result using a shared validator, and open a Pull Request. If the base version changes during processing, detect the race and retry safely or return a conflict instead of silently overwriting data.
- Extract validation into a shared module used by CI and the Worker. The UI can mirror the rules for immediate feedback, but server-side validation remains mandatory.
- Use a fine-grained GitHub credential restricted to this repository and only the permissions required to read contents, create a branch, and open a PR. Keep it in Worker secrets; never expose it in responses or logs.
- Protect `main` with required CI checks and review where repository settings/plan permit. CI and human review are the release gate. The Worker must never write directly to `main`.
- Deploy the public catalogue only to Cloudflare. GitHub Pages is not a required production target; its existing workflow has not been changed in this prototype.

## Not implemented yet
No real authentication, Cloudflare Access policy, JWT verification, Worker API, GitHub integration, PR creation, shared validator, automated browser tests, or production deployment is included in this prototype.
