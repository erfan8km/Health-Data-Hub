import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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


function adminCookie() {
  const payload = Buffer.from(JSON.stringify({
    sub: env.ADMIN_GITHUB_USER_ID,
    login: "erfan8km",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString("base64url");
  const signature = createHmac("sha256", env.SESSION_SIGNING_SECRET).update(payload).digest("base64url");
  return "__Host-rh_session=" + payload + "." + signature;
}

test("support report deletion requires an authenticated admin", async () => {
  const response = await handleRequest(new Request(
    "https://registryhub-admin-api.erfan8km.workers.dev/api/reports/12",
    { method: "DELETE", headers: { origin: env.ADMIN_ORIGIN } },
  ), env);
  assert.equal(response.status, 401);
});

test("support report deletion removes only the selected report", async () => {
  let statement = "";
  let parameters = [];
  const testEnv = {
    ...env,
    PROPOSAL_RATE_LIMITER: { limit: async () => ({ success: true }) },
    SUPPORT_DB: {
      prepare(sql) {
        statement = sql;
        return {
          bind(...values) {
            parameters = values;
            return { run: async () => ({ meta: { changes: 1 } }) };
          },
        };
      },
    },
  };
  const response = await handleRequest(new Request(
    "https://registryhub-admin-api.erfan8km.workers.dev/api/reports/12",
    { method: "DELETE", headers: { origin: env.ADMIN_ORIGIN, cookie: adminCookie() } },
  ), testEnv);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, deleted_id: 12 });
  assert.equal(statement, "DELETE FROM support_reports WHERE id = ?");
  assert.deepEqual(parameters, [12]);
});

test("support report deletion rejects a cross-origin request", async () => {
  const testEnv = {
    ...env,
    PROPOSAL_RATE_LIMITER: { limit: async () => ({ success: true }) },
    SUPPORT_DB: { prepare() { throw new Error("must not access database"); } },
  };
  const response = await handleRequest(new Request(
    "https://registryhub-admin-api.erfan8km.workers.dev/api/reports/12",
    { method: "DELETE", headers: { origin: "https://attacker.example", cookie: adminCookie() } },
  ), testEnv);
  assert.equal(response.status, 403);
});
