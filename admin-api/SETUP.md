# RegistryHub Admin: OAuth and Worker setup checklist

This checklist prepares the independent-authentication branch only. **Do not deploy the Worker yet.** The public catalogue Worker `health-data-hub` is separate and must not be changed. Before creating any GitHub write token, follow and verify [REPOSITORY-PROTECTION.md](./REPOSITORY-PROTECTION.md); do not continue with token creation while that prerequisite is outstanding.

## 1. Planned admin origin

The Cloudflare account's current workers.dev subdomain is `erfan8km`, and the planned Worker name is `registryhub-admin-api`. The expected origin is:

```text
https://registryhub-admin-api.erfan8km.workers.dev
```

The admin Worker does not exist in the Cloudflare account yet. Verify the exact hostname remains available before deployment. If the Worker name or URL changes, update `ADMIN_ORIGIN` and the GitHub OAuth callback URL together before deployment.

Preview/version URLs are explicitly disabled in `wrangler.jsonc`. The standard workers.dev URL remains enabled to serve this separate admin Worker. All write routes require a signed administrator session and exact-origin validation.

## 2. Register a GitHub OAuth App

In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**:
https://github.com/settings/developers

Use these values:

- **Application name:** `RegistryHub Admin`
- **Homepage URL:** `https://registryhub-admin-api.erfan8km.workers.dev`
- **Authorization callback URL:** `https://registryhub-admin-api.erfan8km.workers.dev/auth/callback`

Register a new OAuth App dedicated to this admin interface. Do not reuse a different app's client secret. The current login flow requests no repository scopes; the OAuth token is only used to read the authenticated user's GitHub identity, and is not saved or sent to the browser.

After registration, copy the **Client ID**. It is not a secret; it can be supplied to update `GITHUB_OAUTH_CLIENT_ID` in the feature branch. **Do not send the Client secret in chat, commit it, or put it in a file in the repository.**

The Worker must not be deployed until the registered callback URL and `ADMIN_ORIGIN` match exactly.

## 3. Confirm administrator identity

The configured numeric GitHub user ID is `323634447`, corresponding to the repository owner account. Authentication is restricted to that numeric ID, not a value submitted by the browser. Do not change it unless a deliberate administrator handover is intended.

## 4. Required runtime values

**Gate:** do not create the fine-grained `GITHUB_TOKEN` until the active `main` ruleset is configured and verified. The repository rulesets endpoint was empty when checked on 2026-10-25, and the connected integration cannot inspect legacy branch protection.

These non-secret values are in `admin-api/wrangler.jsonc`:

- `GITHUB_REPOSITORY=erfan8km/Health-Data-Hub`
- `ADMIN_ORIGIN=https://registryhub-admin-api.erfan8km.workers.dev`
- `ADMIN_GITHUB_USER_ID=323634447`
- `GITHUB_OAUTH_CLIENT_ID` — currently a fail-closed placeholder. Replace it after creating the dedicated OAuth App.

These values must be configured as **Worker secrets** before the first live login or write action:

- `GITHUB_OAUTH_CLIENT_SECRET` — the OAuth App client secret.
- `SESSION_SIGNING_SECRET` — a strong, independently generated random secret with at least 32 bytes. Do not reuse the OAuth secret.
- `GITHUB_TOKEN` — a separate fine-grained personal access token for the proposal-writing API only.

For the fine-grained GitHub token, restrict repository access to `erfan8km/Health-Data-Hub`. Grant only the permissions required by the endpoints used here: **Contents: Read and write** and **Pull requests: Read and write** (Metadata read-only is required by GitHub). Never grant organization-wide or all-repository access for this workflow. Re-check GitHub's current permission requirements when creating the token.

Generate a session secret locally, for example:

```sh
openssl rand -base64 48
```

Copy the output directly into Cloudflare's secret-value field. Never send it through chat, add it to a commit, or store it in `wrangler.jsonc`.

Cloudflare's official guidance says secrets should be set as Worker secrets rather than plaintext `vars`, and local `.dev.vars` files should be excluded from Git. See:
https://developers.cloudflare.com/workers/configuration/secrets/

## 5. OAuth state replay protection

OAuth login state is reserved and consumed through the `OAUTH_STATE_STORE` SQLite-backed Durable Object. A callback can consume a state only once, including concurrent callback attempts; missing or unavailable state storage fails closed. The binding and initial migration are declared in `wrangler.jsonc`. The namespace is provisioned only when this experimental Worker is first deployed; this code change has not created a live Cloudflare resource.

Do not deploy merely to provision the Durable Object. Keep the existing no-deploy gate in place until the authentication flow and review checklist pass.

## 6. Rate limits in this branch

The configuration uses Cloudflare Rate Limiting bindings:

- `AUTH_RATE_LIMITER`: up to 20 sign-in initiation/callback checks per minute per source IP and route.
- `PROPOSAL_RATE_LIMITER`: up to 5 proposal submissions per minute for the configured administrator.

Cloudflare documents these bindings as approximate per-location limits, not strict global ceilings. They help with ordinary abuse but are not a substitute for monitoring or a strict globally consistent limiter:
https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## 7. Secret handling and deployment gate

- `admin-api/.dev.vars.example` is a placeholder template only. For local development, copy it to `admin-api/.dev.vars` and replace every placeholder with test-only values. The actual `.dev.vars` is ignored by Git.
- Do not paste secrets into GitHub issues, PR text, commits, browser code, or chat.
- Wrangler secret-management commands can publish a Worker version; do not run them until a deployment has been explicitly approved.
- A first deployment would create a new, separate `registryhub-admin-api` Worker. It must not edit, replace, or share the public catalogue Worker.
- The admin Worker has not been deployed and no OAuth App or real secret has been created by this change.
- Before authorizing deployment, run the complete CI checks, confirm that all runtime values are configured, and manually test login, logout, session expiry, unauthorized account rejection, rate limiting, and a proposal that opens a PR without merging or deploying the catalogue.
