# RegistryHub — Sveltia CMS proof of concept

This folder is an isolated experiment on branch `feat/sveltia-cms-poc`. It is not imported into the public React/Vite app and has not been deployed or merged.

## What it tests

- Sveltia CMS static admin shell loaded from the official package CDN.
- GitHub backend targeting this repository and the experiment branch only.
- Editorial workflow for proposed changes rather than direct commits to `main`.
- A single-file collection mapped to the existing `artifacts/iedr/public/data/registries.json` array.
- Reference selectors for countries and categories backed by the existing `countries.json` and `categories.json` files.
- Existing field names and shapes: `slug`, `fa`, `en`, `country`, `city`, `categories[]`, `description`, `officialUrl`.
- Basic CMS-level patterns for city IDs and HTTPS official URLs.

## Not ready to authenticate or publish

The `base_url` in `config.yml` is intentionally a placeholder. Before using OAuth, deploy and configure the official Sveltia CMS Authenticator on Cloudflare Workers, register the corresponding GitHub OAuth application, and set the exact authenticator URL. Do not replace this with a guessed URL.

Do not enable this admin path on the public production site yet. Before production, also:
1. Put the admin route behind Cloudflare Access and restrict it to approved administrators.
2. Verify the authentication flow and callback URL with a dedicated test account.
3. Confirm the CMS can only target an approved working branch and produces a reviewable PR.
4. Run the repository validator and full CI on proposed content changes.
5. Review category/country reference integrity, HTTPS URL validation, slug stability, and concurrent edits. The CMS form is not a replacement for server-side validation.
6. Decide whether the editorial workflow's base branch should be `main` after testing. This prototype deliberately targets `feat/sveltia-cms-poc` so it does not intentionally point writes at `main`.

## Local review

Open `index.html` with a local static server to inspect the CMS shell. The GitHub backend requires valid OAuth configuration and repository permissions before sign-in or content editing can work. The current config is deliberately not production-authenticatable because the OAuth URL is a placeholder.

The CMS configuration and editor UI still need an authenticated browser end-to-end test. The repository's standard CI validates the app code and catalogue, but does not currently exercise this separate CMS configuration.

## Deployment boundary

No Cloudflare settings, GitHub Actions workflows, production code, domain settings, or GitHub Pages workflow are changed by this proof of concept. Do not merge this branch or deploy the admin until authentication, branch workflow, and validation have been reviewed.
