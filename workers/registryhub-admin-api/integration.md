# Integrating province validation into the deployed Worker

The live `registryhub-admin-api` Worker is currently configured directly in Cloudflare; its full entrypoint is not present in the repository and the existing site deployment workflow does not publish it. The validation module and tests here therefore need to be integrated into the Worker as a separate reviewed deployment.

In the Worker entrypoint, update the proposal loader to fetch the trusted province directory alongside the current catalogue metadata:

```js
const [current, categories, countries, provinces, mainRef] = await Promise.all([
  readDataFile(env, repo, "registries.json"),
  readDataFile(env, repo, "categories.json"),
  readDataFile(env, repo, "countries.json"),
  readDataFile(env, repo, "provinces.json"),
  githubRequest(env, "/repos/" + repo + "/git/ref/heads/main"),
]);
const validation = validateRegistryPayload(
  registries,
  categories.data,
  countries.data,
  provinces.data,
);
```

Keep the existing write allowlist, OAuth/session protections, rate limits, Durable Object binding, and manual Pull Request review flow intact. Do not deploy a bare Worker configuration: the current secrets and bindings must be preserved.
