import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "./index.mjs";

const env = { ADMIN_ORIGIN: "https://admin.example.test" };

test("health endpoint reports service status without exposing configuration", async () => {
  const response = await handleRequest(new Request("https://api.example.test/health"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "registryhub-admin-api" });
});

test("proposal endpoint rejects requests without an allowed origin", async () => {
  const response = await handleRequest(new Request("https://api.example.test/api/proposals", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ registries: [] }),
  }), env);
  assert.equal(response.status, 403);
});

test("proposal endpoint requires Cloudflare Access authentication", async () => {
  const response = await handleRequest(new Request("https://api.example.test/api/proposals", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://admin.example.test" },
    body: JSON.stringify({ registries: [] }),
  }), env);
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /authentication required/);
});

test("proposal endpoint rejects unsupported methods", async () => {
  const response = await handleRequest(new Request("https://api.example.test/api/proposals", {
    method: "GET",
    headers: { origin: "https://admin.example.test" },
  }), env);
  assert.equal(response.status, 405);
});
