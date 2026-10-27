import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.mjs";

const env = {
  PUBLIC_ORIGIN: "https://registryhub.erfan8km.workers.dev",
  CATALOG_URL: "https://registryhub.erfan8km.workers.dev/data/registries.json",
  DAILY_MESSAGE_LIMIT: "1000"
};

test("rejects requests from unapproved origins", async () => {
  const request = new Request("https://support.example/api/chat", {
    method: "POST", headers: { Origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify({ message: "hello" })
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 403);
});

test("health endpoint reports service name without touching catalogue or model", async () => {
  const response = await worker.fetch(new Request("https://support.example/health", {
    headers: { Origin: env.PUBLIC_ORIGIN }
  }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "registryhub-support" });
});

test("rejects methods other than GET and POST", async () => {
  const response = await worker.fetch(new Request("https://support.example/api/chat", {
    method: "DELETE", headers: { Origin: env.PUBLIC_ORIGIN }
  }), env);
  assert.equal(response.status, 405);
});

test("rejects oversized chat messages before fetching catalogue or invoking model", async () => {
  const response = await worker.fetch(new Request("https://support.example/api/chat", {
    method: "POST",
    headers: { Origin: env.PUBLIC_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(1201) })
  }), env);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "message_length_invalid");
});

test("rejects oversized reports before writing to D1", async () => {
  const response = await worker.fetch(new Request("https://support.example/api/report", {
    method: "POST",
    headers: { Origin: env.PUBLIC_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(2001) })
  }), env);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "report_length_invalid");
});
