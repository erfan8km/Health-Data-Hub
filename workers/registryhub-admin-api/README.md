# RegistryHub Admin API validation

This directory contains the province-aware registry validator and regression tests for the separately deployed `registryhub-admin-api` Worker.

## Change

- Recognizes `province` as a valid registry field.
- Requires `province` to be a non-empty string.
- Checks the province ID against the trusted `provinces.json` list, while allowing IDs for currently inactive provinces.
- Keeps existing country, category, URL, slug, and unsupported-field checks.
- Adds regression tests and runs them from the root `pnpm test` command.

## Deployment limitation

The live admin API entrypoint is not currently version-controlled in this repository. The current GitHub Actions deploy workflow publishes the public site Worker only. Therefore, this PR prepares and tests the validator but does not itself fix the live Worker. Follow `integration.md` as part of a separate, controlled admin Worker deployment that preserves existing secrets and bindings.
