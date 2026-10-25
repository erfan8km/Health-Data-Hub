# RegistryHub Admin API

This folder contains an experimental, separate Cloudflare Worker for the admin UI and proposal API. It is isolated from the public catalogue Worker. It must not be deployed with a GitHub write credential until the authentication implementation is reviewed and the runtime configuration is tested. See [SETUP.md](./SETUP.md) for the planned callback URL, configuration checklist, rate limits, and deployment gate.

## Authentication design

The experimental branch replaces the Cloudflare Access dependency with GitHub OAuth sign-in and a signed, server-side-verified session cookie.

- `GET /auth/login` starts GitHub OAuth using a random state value and PKCE S256.
- `GET /auth/callback` validates the signed, short-lived state cookie, exchanges the code with the PKCE verifier, calls GitHub's authenticated user endpoint, and permits only the configured numeric GitHub user ID.
- `GET /api/session` returns a minimal session status.
- `POST /auth/logout` clears the session cookie and requires the exact configured Origin.
- `POST /api/proposals` requires a valid signed session, the exact configured Origin, JSON, a bounded request body, and server-side catalogue validation.

The OAuth token is used only to read the GitHub identity during sign-in. It is not stored or returned to the browser, and the login flow requests no repository permissions. Catalogue writes use a separate server-side `GITHUB_TOKEN` secret. The API creates a branch and a reviewable Pull Request only; it never merges or deploys.

## Required configuration

Non-secret Worker variables:

- `GITHUB_REPOSITORY` — repository name, currently set in `wrangler.jsonc`.
- `ADMIN_ORIGIN` — exact HTTPS origin where this admin Worker is served, without a trailing slash.
- `ADMIN_GITHUB_USER_ID` — the numeric GitHub account ID allowed to administer the panel. Do not substitute a display name or browser-supplied username.
- `GITHUB_OAUTH_CLIENT_ID` — Client ID from the GitHub OAuth App.

Worker secrets (never commit them or send them to the browser):

- `GITHUB_OAUTH_CLIENT_SECRET` — OAuth App client secret.
- `SESSION_SIGNING_SECRET` — independent high-entropy secret of at least 32 bytes. Rotating it invalidates existing sessions.
- `GITHUB_TOKEN` — separate, least-privilege repository credential used only by the proposal API.

## GitHub OAuth App setup (manual; do not deploy yet)

1. Register an OAuth App in GitHub settings.
2. Set its Homepage URL to the exact `ADMIN_ORIGIN`.
3. Set its Authorization callback URL to `ADMIN_ORIGIN/auth/callback` exactly. Do not enable wildcard callback matching.
4. Store its Client ID as `GITHUB_OAUTH_CLIENT_ID` and its client secret using the Cloudflare Worker secret mechanism. Do not paste secrets into this repository, issue comments, or chat.
5. Configure `ADMIN_GITHUB_USER_ID` using the numeric ID of the single permitted administrator.
6. Verify the intended operator can access both the Worker hostname and GitHub OAuth sign-in from their network. This setup is not a method for bypassing regional restrictions.

The application requests no OAuth scopes; the OAuth token is used only to retrieve the authenticated account's public identity. If a future design needs GitHub access as the signed-in user, re-review permissions rather than adding broad scopes to this login flow.

## Required checks before any deployment

- Keep the admin Worker separate from the public catalogue Worker. Do not alter the public Worker, main branch, domain, or active Cloudflare configuration as part of this prototype.
- Verify `ADMIN_ORIGIN` and the OAuth callback URI match exactly and use HTTPS.
- Use a strong, independently generated `SESSION_SIGNING_SECRET`; never use the OAuth client secret for session signing.
- Configure a separate least-privilege `GITHUB_TOKEN` secret. Confirm current GitHub endpoint permissions before granting any write access.
- Test OAuth state mismatch/expiry, PKCE, token-exchange errors, unauthorized user IDs, session signature tampering/expiry, logout, origin mismatch, oversized bodies, malformed payloads, and proposal creation behavior.
- Run `pnpm test:admin-api`, `pnpm validate`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Verify the configured rate-limiting bindings and add monitoring/abuse-response and token rotation/revocation procedures before deployment.
- Confirm security headers, runtime compatibility, and successful tests in CI.
- A Pull Request is not a deployment. The API must not be deployed until the user explicitly approves after review and has configured all required variables and secrets.

## Current status and limits

- Authentication code is an experimental implementation in a feature branch; it has not been live-tested against a registered OAuth App.
- No OAuth App has been registered by this change, no secrets have been created or stored, and no Worker has been deployed.
- The admin UI files may be delivered as static assets, but all write operations remain server-side protected by session validation. UI hiding is only a user-experience measure, not a security boundary.
- The current Worker configuration uses `workers_dev: true` so the dedicated admin hostname can be served, but explicitly sets `preview_urls: false`. The ordinary workers.dev hostname may be public; session validation and exact-origin checks remain mandatory.
- Session cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, root-path `__Host-` cookies, expire after eight hours, and are signed with HMAC. Sessions are not stored server-side; rotating `SESSION_SIGNING_SECRET` invalidates them.
- A PR is not a deployment. The API never merges the proposal or deploys the public catalogue.
