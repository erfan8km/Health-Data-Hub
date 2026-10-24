# RegistryHub admin prototype

## Scope
The UI in `admin-prototype/` is an isolated admin editor served by the separate `registryhub-admin-api` Worker configuration. It is not imported by the public Vite app and does not change the public site, domain, Cloudflare settings, or `main`.

## Try the UI prototype
For a local draft, open `index.html` in a browser and load copies of `registries.json`, `categories.json`, and `countries.json`. Drafts autosave to this browser's local storage; export JSON for a portable copy. The submit button requires the admin Worker to be deployed and protected by Cloudflare Access.

## API status
A separate Cloudflare Worker API already exists in `admin-api/`. It validates proposed registry data, checks Cloudflare Access JWTs, and creates a branch + pull request in GitHub. The UI now submits to the same-origin `/api/proposals` endpoint. The API and UI have **not** been configured or deployed as part of this PR. Until the Worker is deployed behind Cloudflare Access and its secrets are set, submission is not expected to work. Do not submit secrets in the browser.

See [admin API deployment and security notes](../admin-api/README.md) before configuring anything.

## Security requirements before production use
- **Never put a GitHub token or any write secret in browser JavaScript, HTML, local storage, or a public repository.**
- Do not treat an obscure URL or a client-side password as authentication.
- Configure Cloudflare Access to protect the admin UI and API before deploying the API with secrets. Do not rely on the default public `workers.dev` URL as a protected admin boundary unless Access protection has been explicitly configured and verified.
- Store the GitHub credential only as a Worker secret. Restrict it to the minimum repository permissions needed for reading catalogue files, creating a branch, writing the registry file on that branch, and opening a pull request.
- Keep server-side validation for schema, unique slugs, HTTPS URLs, country/category references, and request size. Client validation is not a security boundary.
- Require CI validation and human review before merging. The API must never merge a PR or deploy the public catalogue.
- Production public hosting is intended to be Cloudflare Workers only. This branch removes the GitHub Pages deployment workflow, but `main` still has it until this PR is reviewed and merged. No deployment or Cloudflare setting has been changed.

## Known UI prototype limits
- Country/category references are not cross-validated by the UI itself.
- The UI does not implement its own login; authentication must be enforced by Cloudflare Access at the Worker boundary.
- The form covers the current registry shape documented in `artifacts/iedr/src/App.tsx`.
