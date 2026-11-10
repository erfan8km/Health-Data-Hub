# RegistryHub maintenance mode

The public `registryhub` Worker supports a reversible maintenance switch.

- Enable public maintenance: set `vars.MAINTENANCE_MODE` to `"true"` in the root `wrangler.jsonc`.
- Restore the public site: set it to `"false"` (or remove the variable), then merge and deploy.
- The maintenance response is HTTP 503 with `Retry-After`, `no-store`, and `noindex` headers.
- The static build in `dist/` is retained and served unchanged when maintenance mode is disabled.
- The separate `registryhub-admin-api` Worker and its D1 database are not modified by this switch.

Changes to the root Worker are deployed by `.github/workflows/deploy-cloudflare-worker.yml` after they reach `main`. Use a reviewed pull request; do not edit production Worker settings manually.
