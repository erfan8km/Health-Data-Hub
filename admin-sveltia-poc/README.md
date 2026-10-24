# RegistryHub — Sveltia CMS proof of concept

This folder is an isolated experiment on branch `feat/sveltia-cms-poc`. It is not imported into the public React/Vite app and has not been deployed or merged.

## What it tests

- Sveltia CMS static admin shell loaded from the official package CDN.
- GitHub backend targeting this repository's isolated `cms-staging` branch.
- Single-file collections mapped to the existing JSON arrays:
  - `registries.json`
  - `categories.json`
  - `countries.json`
- Relation selectors that store the existing country IDs and category IDs, without changing the site's data schema.
- Existing registry field names and shapes: `slug`, `fa`, `en`, `country`, `city`, `categories[]`, `description`, `officialUrl`.
- Basic CMS-level patterns for city IDs and HTTPS official URLs.

## Workflow and data safety

Sveltia CMS's built-in Editorial Workflow is not implemented yet, so this prototype uses the Simple Workflow. The Simple Workflow commits directly to the branch configured in the GitHub backend. That branch is `cms-staging`, created from the repository's `main` branch on 2026-10-24; the CMS is not configured to write directly to `main`.

Review any content changes by comparing `cms-staging` with `main`, then open a normal pull request and run the repository validator/CI before merging. This review step is manual; the CMS does not automatically create a review PR in this configuration. Keep the staging branch separate from the CMS implementation PR.

## Not ready to authenticate or publish

The `base_url` in `config.yml` is intentionally a placeholder. Before using OAuth, deploy and configure the official Sveltia CMS Authenticator on Cloudflare Workers, register the corresponding GitHub OAuth application, and set the exact authenticator URL. Do not replace this with a guessed URL.

Do not enable this admin path on the public production site yet. Before production, also:

1. Put the admin route behind Cloudflare Access and restrict it to approved administrators.
2. Verify the authentication flow and callback URL with a dedicated test account.
3. Confirm the CMS can only write to the intended staging branch and verify the manual review process.
4. Run the repository validator and full CI on proposed content changes.
5. Review category/country reference integrity, HTTPS URL validation, slug stability, and concurrent edits. The CMS form is not a replacement for server-side validation.
6. Define how the staging branch will be reconciled with `main` and how conflicts will be resolved.

## Local review

Open `index.html` with a local static server to inspect the CMS shell. The GitHub backend requires valid OAuth configuration and repository permissions before sign-in or content editing can work. The current config is deliberately not production-authenticatable because the OAuth URL is a placeholder.

The configuration now models all three current JSON-array files as single-file entry collections, allowing relation fields to refer to categories and countries by their stable `id` fields. However, the CMS configuration and editor UI still need an authenticated browser end-to-end test. The repository's standard CI validates the app and catalogue, but does not currently exercise this separate CMS configuration.

## Deployment boundary

No Cloudflare settings, GitHub Actions workflows, production code, domain settings, or GitHub Pages workflow are changed by this proof of concept. Do not merge this branch or deploy the admin until authentication, branch workflow, and validation have been reviewed.

## Official documentation

- [Single-file collections](https://sveltiacms.app/en/docs/collections/entries/single-file)
- [Relation fields](https://sveltiacms.app/en/docs/fields/relation)
- [Simple workflow](https://sveltiacms.app/en/docs/workflows/simple)
- [Editorial workflow status](https://sveltiacms.app/en/docs/workflows/editorial)
