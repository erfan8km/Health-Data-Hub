import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest, isAllowedGithubWrite, readBodyLimited } from "./index.mjs";
import { handleAuthRequest } from "./auth.mjs";
import { createOAuthStateStoreBinding } from "./test-support.mjs";

const ORIGIN = "https://admin.example.test";
const env = {
  ADMIN_ORIGIN: ORIGIN,
  ADMIN_GITHUB_USER_ID: "123456",
  GITHUB_OAUTH_CLIENT_ID: "oauth-client-id",
  GITHUB_OAUTH_CLIENT_SECRET: "oauth-client-secret-long-enough",
  SESSION_SIGNING_SECRET: "s".repeat(64),
  OAUTH_STATE_STORE: createOAuthStateStoreBinding(),
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

test("catalogue endpoint returns current main data to an authenticated administrator", async () => {
  const session = await createSessionCookie();
  const files = {
    "registries.json": [{ slug: "example-registry", fa: "Example", en: "Example", country: "IR", city: "tehran", categories: ["gyn"], description: "", officialUrl: "" }],
    "categories.json": [{ id: "gyn", en: "Gynaecology" }],
    "countries.json": [{ id: "IR", en: "Iran" }],
  };
  const urls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    urls.push(url.toString());
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(url.searchParams.get("ref"), "main");
    const filename = url.pathname.split("/").at(-1);
    assert.ok(Object.hasOwn(files, filename), "only the three catalogue data files may be read");
    return new Response(JSON.stringify({
      sha: "a".repeat(40),
      content: Buffer.from(JSON.stringify(files[filename]), "utf8").toString("base64"),
    }), { status: 200 });
  };
  try {
    const response = await handleRequest(new Request(ORIGIN + "/api/catalogue", {
      headers: { cookie: session },
    }), env);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.source, "main");
    assert.deepEqual(data.registries, files["registries.json"]);
    assert.deepEqual(data.categories, files["categories.json"]);
    assert.deepEqual(data.countries, files["countries.json"]);
    assert.equal(urls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalogue endpoint rejects anonymous requests before making GitHub calls", async () => {
  const originalFetch = globalThis.fetch;
  let githubCalled = false;
  globalThis.fetch = async () => {
    githubCalled = true;
    throw new Error("GitHub must not be called for an anonymous catalogue request");
  };
  try {
    const response = await handleRequest(new Request(ORIGIN + "/api/catalogue"), env);
    assert.equal(response.status, 401);
    assert.equal(githubCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("health endpoint reports service status without exposing configuration", async () => {
  const response = await handleRequest(new Request(ORIGIN + "/health"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "registryhub-admin-api" });
});

test("proposal endpoint rejects a missing Origin header", async () => {
  const response = await handleRequest(new Request(ORIGIN + "/api/proposals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ registries: [] }),
  }), env);
  assert.equal(response.status, 403);
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

test("serves bundled admin HTML and security headers when static assets are unavailable", async () => {
  const html = "<!doctype html><html lang=\"en\"><body>admin-ui</body></html>";
  const envWithHtml = { ...env, ADMIN_HTML: html };
  const response = await handleRequest(new Request(ORIGIN + "/"), envWithHtml);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), html);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);

  const missing = await handleRequest(new Request(ORIGIN + "/missing.css"), envWithHtml);
  assert.equal(missing.status, 404);
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
    assert.match(await response.text(), /protection is unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


const SHA = "a".repeat(40);
const ADMIN_BRANCH = "admin/registry-update-a1b2c3d4";
const REPO = "erfan8km/Health-Data-Hub";
const REGISTRY_PATH = "/repos/" + REPO + "/contents/artifacts/iedr/public/data/registries.json";

test("GitHub write allowlist permits only the canonical data file, proposal branch, and PR", () => {
  const contentWrite = JSON.stringify({
    message: "Propose registry catalogue update via RegistryHub admin",
    content: "W10=",
    sha: SHA,
    branch: ADMIN_BRANCH,
  });
  assert.equal(isAllowedGithubWrite(REPO, REGISTRY_PATH, "PUT", contentWrite), true);

  const branchCreate = JSON.stringify({ ref: "refs/heads/" + ADMIN_BRANCH, sha: SHA });
  assert.equal(isAllowedGithubWrite(REPO, "/repos/" + REPO + "/git/refs", "POST", branchCreate), true);

  const prCreate = JSON.stringify({
    title: "Registry catalogue update",
    head: ADMIN_BRANCH,
    base: "main",
    body: "This PR must be reviewed and merged manually; the API never merges or deploys.",
  });
  assert.equal(isAllowedGithubWrite(REPO, "/repos/" + REPO + "/pulls", "POST", prCreate), true);
});

test("GitHub write allowlist rejects direct main writes and unapproved repository paths", () => {
  const directMain = JSON.stringify({
    message: "Propose registry catalogue update via RegistryHub admin",
    content: "W10=",
    sha: SHA,
    branch: "main",
  });
  assert.equal(isAllowedGithubWrite(REPO, REGISTRY_PATH, "PUT", directMain), false);

  const codeFile = "/repos/" + REPO + "/contents/admin-api/src/index.mjs";
  const codeWrite = JSON.stringify({
    message: "Propose registry catalogue update via RegistryHub admin",
    content: "Y29kZQ==",
    sha: SHA,
    branch: ADMIN_BRANCH,
  });
  assert.equal(isAllowedGithubWrite(REPO, codeFile, "PUT", codeWrite), false);

  const workflowFile = "/repos/" + REPO + "/contents/.github/workflows/deploy-cloudflare-worker.yml";
  assert.equal(isAllowedGithubWrite(REPO, workflowFile, "PUT", codeWrite), false);

  const arbitraryEndpoint = "/repos/" + REPO + "/git/blobs";
  assert.equal(isAllowedGithubWrite(REPO, arbitraryEndpoint, "POST", JSON.stringify({ content: "x", encoding: "utf-8" })), false);
});

test("GitHub write allowlist rejects unrelated branches, changed filenames, and PRs not based on main", () => {
  const wrongBranch = JSON.stringify({
    ref: "refs/heads/main",
    sha: SHA,
  });
  assert.equal(isAllowedGithubWrite(REPO, "/repos/" + REPO + "/git/refs", "POST", wrongBranch), false);

  const wrongFile = JSON.stringify({
    message: "Propose registry catalogue update via RegistryHub admin",
    content: "W10=",
    sha: SHA,
    branch: ADMIN_BRANCH,
  });
  assert.equal(isAllowedGithubWrite(REPO, "/repos/" + REPO + "/contents/artifacts/iedr/public/data/categories.json", "PUT", wrongFile), false);

  const wrongBase = JSON.stringify({
    title: "Registry catalogue update",
    head: ADMIN_BRANCH,
    base: "feat/admin-independent-auth",
    body: "This PR must be reviewed and merged manually.",
  });
  assert.equal(isAllowedGithubWrite(REPO, "/repos/" + REPO + "/pulls", "POST", wrongBase), false);
});
