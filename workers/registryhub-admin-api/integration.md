# Admin Worker deployment and verification

The source files in this folder were exported from the deployed `registryhub-admin-api` Worker after the province validation fix was applied.

The proposal handler loads `provinces.json` alongside `registries.json`, `categories.json`, and `countries.json`, then calls:

```js
validateRegistryPayload(registries, categories.data, countries.data, provinces.data)
```

The validator allows `province`, requires a non-empty string, and verifies the value against the province IDs from trusted metadata. An unknown province ID is rejected.

## Safe deployment checklist

1. Upload a new module-syntax Worker version with `main_module: index.mjs`.
2. Use `type: "inherit"` for every existing binding and `bindings_inherit: "strict"` so missing bindings cannot be silently dropped.
3. Before routing traffic, verify all ten bindings are present, including the three existing secret bindings and the `OAuthStateStore` Durable Object namespace.
4. Deploy the version, verify `/health` and that unauthenticated API requests remain rejected.
5. Test an authenticated proposal containing the existing `province: "razavi-khorasan"` value, then verify a Pull Request is created and no direct merge occurs.

The public-site deployment workflow does not deploy this Worker. Keep the current OAuth, session-signing, GitHub token, rate-limit, and Durable Object configuration intact.
