# RegistryHub Support Worker

Independent catalogue-only support API. It must not connect to GitHub or `registryhub-admin-api`.

## Setup
1. Create a Cloudflare D1 database named `registryhub-support`.
2. Configure `CATALOG_SERVICE` as a service binding to the existing `registryhub` Worker. Same-account Worker calls on `workers.dev` require a service binding.
3. Replace the placeholder `database_id` in `wrangler.jsonc` with its real ID.
4. Verify the fixed `PUBLIC_ORIGIN` and `CATALOG_URL` values.
5. Apply schema: `npx wrangler d1 migrations apply registryhub-support --remote`.
6. Test locally with `npx wrangler dev`; Workers AI uses `@cf/meta/llama-3.1-8b-instruct-fast`.
7. Deploy only after security and quality tests: `npx wrangler deploy`.

## Endpoints
- `GET /health`
- `POST /api/chat`: JSON `{"message":"..."}`, max 1200 characters.
- `POST /api/report`: JSON `{"message":"..."}`, 5–2000 characters.

## Safeguards
- Catalogue URL is fixed in Worker configuration, never accepted from a request.
- Catalogue cache TTL is 300 seconds.
- Request bodies are capped at 16 KiB before JSON parsing; chat messages at 1200 characters and reports at 2000 characters.
- Per-IP hashed chat limits: 10 chats/minute and 10 chats/day by default, plus a site-wide cap of 50 chats/day for the initial beta. These are independent limits. Reports are limited to 3/hour/IP. Configure the chat limits with `PER_IP_MINUTE_LIMIT`, `PER_IP_DAILY_MESSAGE_LIMIT`, and `DAILY_MESSAGE_LIMIT`. A daily scheduled task removes usage-limit counters older than two days.
- Raw IPs are not stored in D1. Configure `RATE_LIMIT_SALT` as a secret before public deployment.
- Chat messages are not persisted. Report text is stored in D1 for human follow-up.
- Do not ask users for personal or confidential medical information.
- The model is instructed not to return URLs; registry links are returned only when the exact slug and HTTPS URL exist in the published catalogue.
- All catalogue fields, including descriptions and data summaries, are treated as untrusted data; instructions embedded in records must be ignored. Prompt-injection testing is still required before launch; a prompt is not a complete security boundary.
- D1 report states: `new`, `in_review`, `resolved`.
- No public endpoint reads or updates reports. Add a separately authenticated management workflow only if needed.

Test page: `artifacts/iedr/public/support-test.html`.