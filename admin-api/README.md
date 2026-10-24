# Admin API: validation and security boundary

This folder is an isolated, non-deployed preparation step. It is not imported by the public catalogue and is not wired into `wrangler.jsonc` or the existing deployment workflow.

## What this step adds
- A pure server-side-friendly validator for the registry payload shape.
- Node tests for valid payloads and common malformed inputs.
- An API/security design contract for a future Cloudflare Worker.

## Validation contract
The server must treat all client input as untrusted. Validate:
- payload is a bounded JSON array of registry objects;
- required fields have the expected types; `description` and `officialUrl` may be empty strings because the current catalogue uses empty values for unknown metadata;
- slugs follow a lowercase kebab-case format and are unique;
- `country` references an existing country ID;
- every category reference exists and each registry has at least one category;
- a non-empty `officialUrl` parses as HTTPS;
- unexpected fields are rejected so only the supported schema is written.

The existing catalogue's reference files are `artifacts/iedr/public/data/categories.json` and `countries.json`. The production Worker should receive trusted category/country IDs from server-side configuration or load them from the repository, not accept the reference lists from the browser as authoritative.

## Intended future API (not implemented here)
- `GET /auth/login` and `GET /auth/callback`: server-side GitHub OAuth flow with state validation and PKCE where supported.
- `GET /api/session`: return only safe session metadata, never credentials.
- `POST /api/registries/validate`: validate bounded JSON without writing.
- `POST /api/registries/pull-request`: require an authenticated administrator, CSRF/origin protections, rate limits, strict validation, then create a branch and pull request using a server-side GitHub credential.
- Unknown routes and methods fail closed.

## Security requirements before deployment
- Keep OAuth client secret and GitHub credential in Cloudflare Worker secrets only; never put them in Vite environment variables, client code, JSON responses, URLs, or logs.
- Use a server-side session with a random identifier in a Secure, HttpOnly, SameSite cookie. Store session/token state server-side (e.g. a Cloudflare storage binding) and implement expiry/revocation.
- Validate OAuth state and callback URLs; protect write endpoints against CSRF; restrict CORS to the exact admin origin; add rate limits and audit events without sensitive values.
- Restrict write capability to the target repository and minimum required permissions. Never accept arbitrary repository, file path, branch, or target branch from the browser.
- Keep public catalogue hosting static on Cloudflare. A PR is not a deployment; merge and the existing CI/release gates remain separate.
- Do not deploy this code until OAuth, storage bindings, secrets, integration tests, and threat review are complete.

## Run tests
From the repository root, run:
`node --test admin-api/src/validate.test.mjs`
