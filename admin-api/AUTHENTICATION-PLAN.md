# Independent admin authentication plan (not deployed)

## Goal

Replace the Cloudflare Access dependency in the *experimental admin Worker only* with GitHub OAuth sign-in and a short-lived, signed server-side session. This is a design and implementation branch; it must not be deployed until the review checklist below passes.

## Proposed flow

1. `GET /auth/login` creates a cryptographically random OAuth `state` and PKCE verifier/challenge, stores a short-lived signed state cookie, and redirects to GitHub OAuth.
2. `GET /auth/callback` validates state in constant time, exchanges the authorization code using the PKCE verifier and the server-side OAuth client secret, then calls GitHub's `GET /user` endpoint.
3. The Worker checks the immutable GitHub numeric user ID against a configured allowlist (preferred) and optionally confirms the expected login. It must not trust a username or email supplied by the browser.
4. The Worker issues a short-lived HMAC-signed session cookie with `Secure; HttpOnly; SameSite=Lax; Path=/`. No OAuth token or GitHub write token is sent to the browser. Session expiration and key rotation are explicit.
5. `GET /api/session` reports only whether the current request is authenticated and the minimal display identity. `POST /auth/logout` clears the cookie.
6. `POST /api/proposals` requires a valid session, exact same-origin validation, JSON content type, and the existing bounded streaming body reader. The API continues to create a reviewable GitHub PR only; it never merges or deploys.

## Required server-side configuration

- `GITHUB_OAUTH_CLIENT_ID` (non-secret configuration)
- `GITHUB_OAUTH_CLIENT_SECRET` (Worker secret)
- `SESSION_SIGNING_SECRET` (high-entropy Worker secret, independent of the OAuth secret)
- `ADMIN_GITHUB_USER_ID` (the administrator's numeric GitHub user ID; avoid relying only on a mutable username)
- `ADMIN_ORIGIN` (exact origin)
- `GITHUB_TOKEN` (separate least-privilege server-side token for branch + file + PR operations)
- `GITHUB_REPOSITORY`

OAuth callback URI must exactly match the registered GitHub OAuth App callback. Request no repository write scopes for login; identity authentication and the server-side write credential must remain separate.

## Security requirements before any deployment

- Use PKCE (S256), single-use random state, strict callback URL, short state lifetime, and constant-time signature comparisons where applicable.
- Validate OAuth token exchange and GitHub API response status/content types; do not log authorization codes, OAuth tokens, session cookies, or secrets.
- Use a strict session expiry, HMAC verification, key rotation plan, and cookie flags above.
- Protect state-changing requests against CSRF with same-origin checks and a session-bound CSRF token if the UI flow requires it.
- Reject unknown GitHub numeric user IDs before issuing a session.
- Rate-limit login/callback and proposal endpoints; return generic authentication errors.
- Keep the admin Worker separate from the public catalogue Worker. Do not alter the public Worker, main branch, domain, or active Cloudflare configuration.
- Test valid and invalid OAuth state, PKCE, bad signatures, expiry, unknown users, logout, cookie flags, CSRF/origin mismatch, oversized bodies, invalid payloads, and proposal creation behavior.
- Verify the hosting and GitHub OAuth login are reachable from the intended operator's network. This design does not promise to bypass regional restrictions.
- Do not deploy until the user has registered the OAuth app, configured secrets in Cloudflare, and explicitly approved deployment after review.

## Current status

Planning branch only. Cloudflare Access is not enabled on the account. No OAuth app has been registered, no secrets have been created or stored, and no Worker has been deployed. The existing Cloudflare Access implementation remains unchanged on the prototype branch until the OAuth implementation and tests are reviewed.
