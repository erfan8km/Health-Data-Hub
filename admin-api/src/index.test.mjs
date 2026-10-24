import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "./index.mjs";

const env = { ADMIN_ORIGIN: "https://admin.example.test" };

function jwtWithClaims(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return [encode({ alg: "RS256", kid: "test-key" }), encode(claims), "invalid-signature"].join(".");
}


test("proposal endpoint accepts a valid signed Access JWT and proceeds to the GitHub API", async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  publicJwk.kid = "valid-test-key";
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const encodedHeader = encode({ alg: "RS256", kid: "valid-test-key" });
  const encodedClaims = encode({
    iss: "https://team.example.cloudflareaccess.com",
    aud: ["test-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    nbf: Math.floor(Date.now() / 1000) - 5,
    email: "admin@example.test",
  });
  const signingInput = encodedHeader + "." + encodedClaims;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  const token = signingInput + "." + Buffer.from(signature).toString("base64url");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/cdn-cgi/access/certs")) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "deliberate test denial" }), { status: 403 });
  };
  try {
    const response = await handleRequest(new Request("https://api.example.test/api/proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://admin.example.test",
        "cf-access-jwt-assertion": token,
      },
      body: JSON.stringify({ registries: [] }),
    }), {
      ...env,
      ADMIN_EMAIL: "admin@example.test",
      CF_ACCESS_TEAM_DOMAIN: "team.example.cloudflareaccess.com",
      CF_ACCESS_AUD: "test-audience",
      GITHUB_TOKEN: "test-only-not-a-real-token",
      GITHUB_REPOSITORY: "example/repository",
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /could not create proposal/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proposal endpoint rejects malformed nbf time claims before fetching signing keys", async () => {
  const token = jwtWithClaims({
    iss: "https://team.example.cloudflareaccess.com",
    aud: ["test-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    nbf: "not-a-number",
    email: "admin@example.test",
  });
  const response = await handleRequest(new Request("https://api.example.test/api/proposals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://admin.example.test",
      "cf-access-jwt-assertion": token,
    },
    body: JSON.stringify({ registries: [] }),
  }), {
    ...env,
    ADMIN_EMAIL: "admin@example.test",
    CF_ACCESS_TEAM_DOMAIN: "team.example.cloudflareaccess.com",
    CF_ACCESS_AUD: "test-audience",
  });
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /authentication failed/);
});

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

test("serves the admin UI through the same-origin static assets binding", async () => {
  const envWithAssets = {
    ...env,
    ASSETS: {
      fetch: async (request) => new Response("admin-ui", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    },
  };
  const response = await handleRequest(new Request("https://admin.example.test/"), envWithAssets);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "admin-ui");
});

test("returns 404 for unknown API routes and 405 for non-GET health requests", async () => {
  const unknown = await handleRequest(new Request("https://admin.example.test/api/unknown"), env);
  assert.equal(unknown.status, 404);
  const health = await handleRequest(new Request("https://admin.example.test/health", { method: "POST" }), env);
  assert.equal(health.status, 405);
});

  const token = jwtWithClaims({
    iss: "https://team.example.cloudflareaccess.com",
    aud: ["test-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    nbf: "not-a-number",
    email: "admin@example.test",
  });
  const response = await handleRequest(new Request("https://api.example.test/api/proposals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://admin.example.test",
      "cf-access-jwt-assertion": token,
    },
    body: JSON.stringify({ registries: [] }),
  }), {
    ...env,
    ADMIN_EMAIL: "admin@example.test",
    CF_ACCESS_TEAM_DOMAIN: "team.example.cloudflareaccess.com",
    CF_ACCESS_AUD: "test-audience",
  });
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /authentication failed/);
});

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

test("serves the admin UI through the same-origin static assets binding", async () => {
  const envWithAssets = {
    ...env,
    ASSETS: {
      fetch: async (request) => new Response("admin-ui", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    },
  };
  const response = await handleRequest(new Request("https://admin.example.test/"), envWithAssets);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "admin-ui");
});

test("returns 404 for unknown API routes and 405 for non-GET health requests", async () => {
  const unknown = await handleRequest(new Request("https://admin.example.test/api/unknown"), env);
  assert.equal(unknown.status, 404);
  const health = await handleRequest(new Request("https://admin.example.test/health", { method: "POST" }), env);
  assert.equal(health.status, 405);
});
