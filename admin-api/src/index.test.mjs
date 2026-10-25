import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest, readBodyLimited } from "./index.mjs";
import { handleAuthRequest } from "./auth.mjs";

const ORIGIN = "https://admin.example.test";
const env = {
  ADMIN_ORIGIN: ORIGIN,
  ADMIN_GITHUB_USER_ID: "123456",
  GITHUB_OAUTH_CLIENT_ID: "oauth-client-id",
  GITHUB_OAUTH_CLIENT_SECRET: "oauth-client-secret-long-enough",
  SESSION_SIGNING_SECRET: "s".repeat(64),
  AUTH_RATE_LIMITER: { limit: async () => ({ success: true }) },
  PROPOSAL_RATE_LIMITER: { limit: async () => ({ success: true }) },
  GITHUB_TOKEN: "fake-test-only-token",
  GITHUB_REPOSITORY: "example/repository",
};

function setCookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const value = response.headers.get("set-cookie");
  return value ? value.split(/, (?=__Host-rh_)/) : [];
}

function setCookieFor(response, name) {
  return setCookies(response).find((value) => value.startsWith(name + "=")) || "";
}

function cookiePair(header) {
  return header.split(";")[0];
}

async function createSessionCookie() {
  const login = await handleAuthRequest(new Request(ORIGIN + "/auth/login"), env);
  const stateCookie = setCookieFor(login, "__Host-rh_oauth");
  const state = new URL(login.headers.get("location")).searchParams.get("state");
  const callbackUrl = new URL(ORIGIN + "/auth/callback");
  callbackUrl.searchParams.set("code", "test-code");
  callbackUrl.searchParams.set("state", state);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "https://github.com/login/oauth/access_token") {
      return new Response(JSON.stringify({ access_token: "temporary-test-token", token_type: "bearer" }), { status: 200 });
    }
    if (url === "https://api.github.com/user") {
      return new Response(JSON.stringify({ id: 123456, login: "erfan8km" }), { status: 200 });
    }
    throw new Error("Unexpected URL: " + url);
  };
  try {
    const callback = await handleAuthRequest(new Request(callbackUrl, {
      headers: { cookie: cookiePair(stateCookie) },
    }), env);
    assert.equal(callback.status, 303);
    return cookiePair(setCookieFor(callback, "__Host-rh_session"));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("valid signed admin session reaches the GitHub proposal operation without Cloudflare Access", async () => {
  const session = await createSessionCookie();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "deliberate test denial" }), { status: 403 });
  try {
    const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        cookie: session,
      },
      body: JSON.stringify({ registries: [] }),
    }), env);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /could not create proposal/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proposal endpoint rejects missing sessions even if an Access-looking header is supplied", async () => {
  const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      "cf-access-jwt-assertion": "not-used",
    },
    body: JSON.stringify({ registries: [] }),
  }), env);
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /authentication required/);
});

test("health endpoint reports service status without exposing configuration", async () => {
  const response = await handleRequest(new Request(ORIGIN + "/health"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "registryhub-admin-api" });
});

test("proposal endpoint rejects requests without the exact configured origin", async () => {
  const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ registries: [] }),
  }), env);
  assert.equal(response.status, 403);
});

test("proposal endpoint rejects unsupported methods", async () => {
  const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
    method: "GET",
    headers: { origin: ORIGIN },
  }), env);
  assert.equal(response.status, 405);
});

test("serves the admin UI through the same-origin static assets binding", async () => {
  const envWithAssets = {
    ...env,
    ASSETS: {
      fetch: async () => new Response("admin-ui", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    },
  };
  const response = await handleRequest(new Request(ORIGIN + "/"), envWithAssets);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "admin-ui");
});

test("returns 404 for unknown API routes and 405 for non-GET health requests", async () => {
  const unknown = await handleRequest(new Request(ORIGIN + "/api/unknown"), env);
  assert.equal(unknown.status, 404);
  const health = await handleRequest(new Request(ORIGIN + "/health", { method: "POST" }), env);
  assert.equal(health.status, 405);
});

test("bounded body reader stops oversized streamed requests without content-length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(64)));
      controller.enqueue(new TextEncoder().encode("y".repeat(64)));
      controller.close();
    },
  });
  const request = new Request("https://api.example.test/api/proposals", { method: "POST", body, duplex: "half" });
  await assert.rejects(() => readBodyLimited(request, 100), (error) =>
    error.status === 413 && /request too large/.test(error.message));
});


test("proposal rate limit blocks repeat submissions for the authenticated administrator", async () => {
  const session = await createSessionCookie();
  const originalFetch = globalThis.fetch;
  let githubCalled = false;
  globalThis.fetch = async () => {
    githubCalled = true;
    throw new Error("GitHub must not be called after the limiter rejects the request");
  };
  try {
    const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        cookie: session,
      },
      body: JSON.stringify({ registries: [] }),
    }), {
      ...env,
      PROPOSAL_RATE_LIMITER: { limit: async ({ key }) => {
        assert.equal(key, "admin:123456");
        return { success: false };
      } },
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(githubCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proposal API fails closed when rate limiting binding is missing", async () => {
  const session = await createSessionCookie();
  const { PROPOSAL_RATE_LIMITER, ...withoutLimiter } = env;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("GitHub must not be called when rate limiting is unavailable");
  };
  try {
    const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        cookie: session,
      },
      body: JSON.stringify({ registries: [] }),
    }), withoutLimiter);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /protection is unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
