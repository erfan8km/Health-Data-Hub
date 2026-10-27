# RegistryHub Support Worker

Independent catalogue-only support API. It must not connect to GitHub or `registryhub-admin-api`.

## Setup
1. Create a Cloudflare D1 database named `registryhub-support`.
2. Replace the placeholder `database_id` in `wrangler.jsonc` with its real ID.
3. Verify the fixed `PUBLIC_ORIGIN` and `CATALOG_URL` values.
4. Apply schema: `npx wrangler d1 migrations apply registryhub-support --remote`.
5. Test locally with `npx wrangler dev`; Workers AI uses `@cf/meta/llama-3.1-8b-instruct`.
6. Deploy only after security and quality tests: `npx wrangler deploy`.

## Endpoints
- `GET /health`
- `POST /api/chat`: JSON `{"message":"..."}`, max 1200 characters.
- `POST /api/report`: JSON `{"message":"..."}`, 5–2000 characters.

## Safeguards
- Catalogue URL is fixed in Worker configuration, never accepted from a request.
- Catalogue cache TTL is 300 seconds.
- Request bodies are capped at 16 KiB before JSON parsing; chat messages at 1200 characters and reports at 2000 characters.
- Per-IP hashed rate limit: 10 chats/minute and 3 reports/hour; global chat cap defaults to 1000/day. A daily scheduled task removes usage-limit counters older than two days.
- Raw IPs are not stored in D1. Configure `RATE_LIMIT_SALT` as a secret before public deployment.
- Chat messages are not persisted. Report text is stored in D1 for human follow-up.
- Do not ask users for personal or confidential medical information.
- The model is instructed not to return URLs; registry links are returned only when the exact slug and HTTPS URL exist in the published catalogue.
- Prompt-injection testing is required before launch; a prompt is not a complete security boundary.
- D1 report states: `new`, `in_review`, `resolved`.
- No public endpoint reads or updates reports. Add a separately authenticated management workflow only if needed.

Test page: `artifacts/iedr/public/support-test.html`.