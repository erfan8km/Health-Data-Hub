# RegistryHub Admin API

This directory contains a version-controlled source snapshot of the deployed **registryhub-admin-api** Worker.

- Entry point: **src/index.mjs**
- Supporting modules: **src/auth.mjs**, **src/oauth-state-store.mjs**, and **src/validate.mjs**
- Runtime: Cloudflare Workers; native Web APIs, no third-party runtime dependencies.
- Recovery guide: **docs/REGISTRYHUB-ADMIN-API-RECOVERY.md**

The source was exported from the current Cloudflare Worker deployment (version 10, created 2026-10-25). Secret values are not stored in the repository. The Wrangler config contains non-secret Worker variables and account-specific rate-limit namespace IDs; review those IDs before deploying in a different Cloudflare account.

Do not delete the live Worker or its Durable Object namespace as a first-line recovery action. Prefer an in-place redeployment after verifying bindings.
