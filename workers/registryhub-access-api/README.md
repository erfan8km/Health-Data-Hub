# RegistryHub Access Workflow (foundation)

This directory is the separate data/workflow boundary for paid requests to access registry data.

## Non-negotiable workflow rules

1. RegistryHub stores request, payment, correspondence, and status metadata only. It does **not** store individual-level clinical or patient data.
2. A successful payment records a paid request; it does not approve the research or grant access to data.
3. The registry-owning university retains authority over ethics, feasibility, data minimization, agreements, and final delivery.
4. Outbound university correspondence is prepared as a draft and requires an explicit admin action before sending.
5. Every material status transition is auditable in `access_request_events`.
6. Payment verification must be server-to-server, amount- and currency-matched, and idempotent. A browser redirect is never proof of payment.
7. All amounts are integer Iranian rials (`IRR`); do not mix rial and toman values.
8. No gateway secrets, email credentials, or real personal records belong in source control.

## Initial schema

`migrations/0001_access_workflow.sql` defines:

- `access_requests`: applicant, research purpose, registry and workflow status.
- `access_payments`: gateway attempts, amount, idempotency key, authority/reference and verification state.
- `access_universities` and `registry_university_routes`: routing metadata for data-owning institutions.
- `access_request_events`: immutable-style status/event history.
- `university_correspondence`: admin-controlled draft/sent/received correspondence log.
- `access_email_logs`: delivery audit metadata.

## Deliberately not enabled in this foundation PR

- No production D1 database is created or modified.
- No Worker is deployed and no production binding is changed.
- No payment gateway is selected or activated yet.
- No email provider/domain is configured.
- No user-facing checkout is exposed.

Before implementing the gateway adapter, the project owner must select the Iranian payment provider (for example, Zarinpal or Zibal) and provide merchant onboarding/configuration through Cloudflare Worker secrets, never through Git. Before applying this migration, create a dedicated D1 database (suggested name: `registryhub-access`) and verify the appropriate data-residency/privacy requirements. Keep it separate from `registryhub-support`.

## Planned request lifecycle

`awaiting_payment -> payment_pending -> paid_pending_review -> under_admin_review -> submitted_to_university -> awaiting_university -> university_approved / university_rejected -> data_delivered`

A rejected request may enter `refund_pending -> refunded` according to the published refund policy. Cancellation and failed payment do not imply university rejection.

## Required production safeguards

- Provider callback signature/authority verification and server-to-server verification.
- Exact amount/currency validation and unique gateway reference.
- Idempotent callback processing and replay protection.
- CSRF/origin controls, rate limits, strict payload validation, and admin session checks.
- Public tracking must use an unguessable tracking token; never expose sequential database IDs.
- Retention/deletion policy for applicant PII and correspondence.
- Published pricing, rejection/refund rules, privacy notice, and terms version before checkout is enabled.
