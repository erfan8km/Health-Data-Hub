# RegistryHub admin prototype

## Scope
The UI in `admin-prototype/` is an isolated, local-only editor. It is not imported by the public Vite app and does not change the public site, Worker, domain, Cloudflare settings, or `main`.

## Try the UI prototype
Open `index.html` locally in a browser. Load a copy of `artifacts/iedr/public/data/registries.json`, search, add/edit/delete draft entries, then export the JSON. Changes remain in browser memory until exported. The UI intentionally has no network calls, authentication, or repository-write integration.

## API status
A separate Cloudflare Worker API already exists in `admin-api/`. It validates proposed registry data, checks Cloudflare Access JWTs, and creates a branch + pull request in GitHub. However, the UI prototype is **not connected to that API**, and the API has not been configured or deployed as part of this PR. Do not submit secrets in the browser or assume the endpoint is ready for use.

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
- No authentication, API calls, or GitHub writes are implemented in this HTML prototype.
- The form covers the current registry shape documented in `artifacts/iedr/src/App.tsx`.
