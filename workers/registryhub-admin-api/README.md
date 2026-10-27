# RegistryHub Admin API Worker

This directory contains the source modules for the Cloudflare Worker `registryhub-admin-api`.

## Province validation fix

- `province` is an allowed registry field.
- Province IDs are validated against trusted `provinces.json` metadata.
- IDs for inactive provinces remain acceptable as metadata so catalogues can be prepared before those provinces are enabled on the map.
- OAuth/session checks, server-side authentication, request limits, GitHub write-path allowlisting, and manual Pull Request review remain in place.
- The API creates a proposal branch and Pull Request; it does not merge or deploy catalogue changes.

## Deployment

The root GitHub Actions deployment currently deploys the public static-site Worker only. The admin Worker has a separate version/deployment lifecycle in Cloudflare. Deploy it through a controlled Worker-version upload that inherits all existing bindings and secrets, and verify the binding set before routing traffic. Do not overwrite its live settings with a bare configuration.
