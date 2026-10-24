# RegistryHub Admin API

This folder contains the separate Cloudflare Worker for the admin UI and proposal API. It is not the public catalogue Worker, and it must not be deployed with write credentials until Cloudflare Access is configured and verified.

## What the API does
- Static UI files are served from `../admin-prototype` on the same origin.
- `GET /health`: returns a minimal health response without configuration details.
- `POST /api/proposals`: requires a valid Cloudflare Access JWT, checks the exact configured admin origin, validates a bounded registry payload against the trusted `categories.json` and `countries.json` files on `main`, creates a branch, writes `registries.json` on that branch, and opens a pull request to `main`.
- It does not merge pull requests or deploy the public catalogue.

## Required Worker configuration
Non-secret settings:
- `GITHUB_REPOSITORY` — repository name; currently set in `wrangler.jsonc`.
- `ADMIN_ORIGIN` — exact origin of the admin UI, including scheme and port if present, without a trailing slash.
- `ADMIN_EMAIL` — the single administrator email allowed by the API.
- `CF_ACCESS_TEAM_DOMAIN` — Cloudflare Access team hostname used as the JWT issuer, e.g. `your-team.cloudflareaccess.com` (hostname only).
- `CF_ACCESS_AUD` — audience tag for the Cloudflare Access application protecting the API.

Secret:
- `GITHUB_TOKEN` — set as a Worker secret with `wrangler secret put GITHUB_TOKEN`. Never commit the token, put it in a plaintext variable, or expose it to the browser.

## Required before deployment
1. Protect the **entire admin Worker** with Cloudflare Access and restrict the policy to the intended administrator. Cloudflare documents that Worker-level Access can protect the Worker, its `workers.dev` hostname, and previews; see the official [Cloudflare Access for Workers documentation](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
2. Set `ADMIN_ORIGIN` to the exact origin of the same Worker UI. The UI calls `/api/proposals` on the same origin, avoiding a cross-origin browser flow. Origin checking is an additional control, not authentication.
4. Create a narrowly scoped GitHub credential limited to this repository, with only the permissions needed to read contents, create a branch, write the catalogue file on that branch, and open a pull request. Confirm endpoint-specific permissions against GitHub's current API documentation.
5. Store the credential only as a Worker secret. Never send it to the browser, return it in responses, or log it.
6. Test unauthenticated, invalid-token, wrong-origin, oversized, malformed, and invalid-data requests. Run `pnpm test:admin-api`, `pnpm validate`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
7. Confirm that a valid submission creates a branch and reviewable PR only. Human review and merge remain required; production deployment is a separate step.
8. Add appropriate rate limiting/abuse controls and a token rotation/revocation procedure.

## Current limitations and boundaries
- The HTML editor submits to the same-origin `/api/proposals` endpoint, but the Worker is not deployed/configured by this PR.
- No API deployment workflow or live Access application is configured by this PR.
- The current Worker configuration has `workers_dev: true`. Do not deploy with a GitHub write secret until Worker-level Cloudflare Access protection is enabled and verified for the `workers.dev` hostname and previews.
- The API currently reads trusted country/category metadata and the base ref from `main`; it does not accept these from the browser.
- `/health` is intentionally unauthenticated and exposes only a static status.
- A PR is not a deployment. Never merge or deploy the admin API just to preview the local HTML editor.
