import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "./index.mjs";

const env = {
  ADMIN_ORIGIN: "https://registryhub-admin-api.erfan8km.workers.dev",
  ADMIN_GITHUB_USER_ID: "323634447",
  SESSION_SIGNING_SECRET: "x".repeat(48),
};

test("support reports endpoint rejects unauthenticated requests", async () => {
  const response = await handleRequest(new Request(
    "https://registryhub-admin-api.erfan8km.workers.dev/api/reports",
    { method: "GET", headers: { origin: env.ADMIN_ORIGIN } },
  ), env);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "authentication required" });
});

test("support reports endpoint is read-only", async () => {
  const response = await handleRequest(new Request(
    "https://registryhub-admin-api.erfan8km.workers.dev/api/reports",
    { method: "POST", headers: { origin: env.ADMIN_ORIGIN, "content-type": "application/json" }, body: "{}" },
  ), env);
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: "method not allowed" });
});
