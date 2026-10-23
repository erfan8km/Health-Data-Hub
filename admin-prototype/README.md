# RegistryHub admin prototype (local-only)

## Scope
This is an isolated UI prototype in `admin-prototype/`. It is not imported by the public Vite app and does not change the public site, Worker, domain, Cloudflare settings, or `main`.

## Try it
Open `index.html` locally in a browser. Load a copy of `artifacts/iedr/public/data/registries.json`, search, add/edit/delete draft records, then export the JSON. Changes remain in browser memory until exported. The UI intentionally has no network calls, authentication, GitHub write integration, or deployment functionality.

## Security review and recommended production architecture
- **Do not put a GitHub PAT or other write secret in browser JavaScript, HTML, local storage, or a public repository.** Anyone who can inspect the client can extract it.
- The current prototype is a data-editor usability demo, not an authenticated admin tool. Do not treat hiding its URL or adding a client-side password as security.
- Recommended future workflow: administrator signs in through a server-side OAuth flow; a small Cloudflare Worker validates the session and CSRF/origin protections, keeps GitHub credentials only in Worker secrets, and creates a branch + pull request for JSON changes. Public production remains a static catalogue served by Cloudflare.
- Limit GitHub permissions to the minimum repository contents/pull-request permissions available; never expose the credential in responses or logs. Validate schema, unique slugs, HTTPS URLs, country/category references, and payload size on the server before opening a PR.
- Require CI validation and human review before merging. Merge to `main` is the release gate. No PR is created by this prototype.
- Use secure, HttpOnly, SameSite cookies for sessions; implement OAuth state/PKCE as appropriate, expiry/revocation, rate limiting, audit logging without secrets, and CSRF protection. Avoid accepting arbitrary repository paths or branch names from clients.
- Deploy only the public catalogue to Cloudflare. GitHub Pages is not a required production target; any future GitHub Pages workflow can be reviewed separately and disabled/removed only with explicit approval.

## Known prototype limits
- Client validation is only a convenience, not a security boundary.
- Country and category IDs are not cross-validated against their companion JSON files yet.
- The form covers the current registry shape documented in `App.tsx`; if the data schema changes, update this UI and server-side validation together.
- No real authentication, GitHub write path, PR creation, or automated test suite is implemented in this phase.
