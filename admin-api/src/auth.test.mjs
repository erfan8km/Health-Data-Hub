import test from "node:test";
import assert from "node:assert/strict";
import { handleAuthRequest, readAdminSession } from "./auth.mjs";

const ORIGIN = "https://admin.example.test";
const env = {
  ADMIN_ORIGIN: ORIGIN,
  ADMIN_GITHUB_USER_ID: "123456",
  GITHUB_OAUTH_CLIENT_ID: "oauth-client-id",
  GITHUB_OAUTH_CLIENT_SECRET: "oauth-client-secret-long-enough",
  SESSION_SIGNING_SECRET: "s".repeat(64),
  AUTH_RATE_LIMITER: { limit: async () => ({ success: true }) },
  PROPOSAL_RATE_LIMITER: { limit: async () => ({ success: true }) },
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

async function beginLogin(configuration = env) {
  const response = await handleAuthRequest(new Request(ORIGIN + "/auth/login"), configuration);
  const location = new URL(response.headers.get("location"));
  return { response, location, stateCookie: setCookieFor(response, "__Host-rh_oauth") };
}

async function completeLogin({ configuration = env, returnedId = 123456, tamperState = false } = {}) {
  const started = await beginLogin(configuration);
  const state = started.location.searchParams.get("state");
  const callbackState = tamperState ? state + "x" : state;
  const callbackUrl = new URL(ORIGIN + "/auth/callback");
  callbackUrl.searchParams.set("code", "temporary-test-code");
  callbackUrl.searchParams.set("state", callbackState);
  const originalFetch = globalThis.fetch;
  let tokenRequestBody = "";
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === "https://github.com/login/oauth/access_token") {
      tokenRequestBody = String(init.body || "");
      return new Response(JSON.stringify({ access_token: "temporary-test-oauth-token", token_type: "bearer" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url === "https://api.github.com/user") {
      return new Response(JSON.stringify({ id: returnedId, login: "erfan8km" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error("Unexpected external request: " + url);
  };
  try {
    const response = await handleAuthRequest(new Request(callbackUrl, {
      headers: { cookie: cookiePair(started.stateCookie) },
    }), configuration);
    return { response, started, tokenRequestBody };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("login starts GitHub OAuth with state, PKCE S256, fixed callback and secure state cookie", async () => {
  const { response, location, stateCookie } = await beginLogin();
  assert.equal(response.status, 302);
  assert.equal(location.origin + location.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(location.searchParams.get("client_id"), env.GITHUB_OAUTH_CLIENT_ID);
  assert.equal(location.searchParams.get("redirect_uri"), ORIGIN + "/auth/callback");
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  assert.match(location.searchParams.get("code_challenge"), /^[A-Za-z0-9_-]{43}$/);
  assert.match(location.searchParams.get("state"), /^[A-Za-z0-9_-]{43}$/);
  assert.match(stateCookie, /; Secure/);
  assert.match(stateCookie, /; HttpOnly/);
  assert.match(stateCookie, /; SameSite=Lax/);
  assert.ok(stateCookie.includes("; Path=/"));
  assert.equal(location.searchParams.get("scope"), null);
  assert.equal(location.searchParams.get("allow_signup"), "false");
});

test("callback exchanges code with PKCE and creates a signed HttpOnly session only for the configured GitHub ID", async () => {
  const { response, started, tokenRequestBody } = await completeLogin();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), ORIGIN + "/");
  const tokenBody = new URLSearchParams(tokenRequestBody);
  assert.equal(tokenBody.get("client_id"), env.GITHUB_OAUTH_CLIENT_ID);
  assert.equal(tokenBody.get("client_secret"), env.GITHUB_OAUTH_CLIENT_SECRET);
  assert.equal(tokenBody.get("code"), "temporary-test-code");
  assert.equal(tokenBody.get("redirect_uri"), ORIGIN + "/auth/callback");
  const challenge = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenBody.get("code_verifier"))));
  let binary = "";
  for (const byte of challenge) binary += String.fromCharCode(byte);
  const expectedChallenge = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const authorizeChallenge = started.location.searchParams.get("code_challenge");
  assert.equal(expectedChallenge, authorizeChallenge);

  const sessionHeader = setCookieFor(response, "__Host-rh_session");
  assert.ok(sessionHeader);
  assert.match(sessionHeader, /; Secure/);
  assert.match(sessionHeader, /; HttpOnly/);
  assert.match(sessionHeader, /; SameSite=Lax/);
  assert.ok(sessionHeader.includes("; Path=/"));
  assert.doesNotMatch(sessionHeader, /temporary-test-oauth-token/);
  assert.ok(setCookieFor(response, "__Host-rh_oauth").includes("Max-Age=0"));

  const request = new Request(ORIGIN + "/", { headers: { cookie: cookiePair(sessionHeader) } });
  const session = await readAdminSession(request, env);
  assert.deepEqual(Object.keys(session).sort(), ["expiresAt", "id", "login"]);
  assert.equal(session.id, "123456");
  assert.equal(session.login, "erfan8km");
});

test("callback rejects a state mismatch without making a network request", async () => {
  const started = await beginLogin();
  const callbackUrl = new URL(ORIGIN + "/auth/callback");
  callbackUrl.searchParams.set("code", "code");
  callbackUrl.searchParams.set("state", started.location.searchParams.get("state") + "bad");
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not fetch"); };
  try {
    const response = await handleAuthRequest(new Request(callbackUrl, {
      headers: { cookie: cookiePair(started.stateCookie) },
    }), env);
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("callback refuses an authenticated GitHub account whose numeric ID is not allowlisted", async () => {
  const { response } = await completeLogin({ returnedId: 999999 });
  assert.equal(response.status, 403);
  assert.equal(setCookieFor(response, "__Host-rh_session"), "");
  assert.match(await response.text(), /not authorized/);
});

test("session endpoint accepts a valid session and rejects tampering", async () => {
  const { response } = await completeLogin();
  const header = setCookieFor(response, "__Host-rh_session");
  const validRequest = new Request(ORIGIN + "/api/session", { headers: { cookie: cookiePair(header), origin: ORIGIN } });
  const status = await handleAuthRequest(validRequest, env);
  assert.equal(status.status, 200);
  assert.deepEqual((await status.json()).user, { id: "123456", login: "erfan8km" });

  const pair = cookiePair(header);
  const value = pair.slice(pair.indexOf("=") + 1);
  const tampered = value.slice(0, -1) + (value.endsWith("a") ? "b" : "a");
  const rejected = await handleAuthRequest(new Request(ORIGIN + "/api/session", {
    headers: { cookie: "__Host-rh_session=" + tampered, origin: ORIGIN },
  }), env);
  assert.equal(rejected.status, 200);
  assert.deepEqual(await rejected.json(), { authenticated: false });
});

test("logout requires exact same origin and clears the session cookie", async () => {
  const denied = await handleAuthRequest(new Request(ORIGIN + "/auth/logout", {
    method: "POST", headers: { origin: "https://attacker.example.test" },
  }), env);
  assert.equal(denied.status, 403);

  const loggedOut = await handleAuthRequest(new Request(ORIGIN + "/auth/logout", {
    method: "POST", headers: { origin: ORIGIN },
  }), env);
  assert.equal(loggedOut.status, 303);
  assert.equal(loggedOut.headers.get("location"), ORIGIN + "/");
  assert.match(setCookieFor(loggedOut, "__Host-rh_session"), /Max-Age=0/);
  assert.match(setCookieFor(loggedOut, "__Host-rh_oauth"), /Max-Age=0/);
});

test("missing or weak authentication configuration fails closed", async () => {
  const response = await handleAuthRequest(new Request(ORIGIN + "/auth/login"), {
    ...env,
    SESSION_SIGNING_SECRET: "too-short",
  });
  assert.equal(response.status, 503);
});

test("authentication routes reject unsupported methods", async () => {
  const response = await handleAuthRequest(new Request(ORIGIN + "/auth/login", { method: "POST" }), env);
  assert.equal(response.status, 405);
});


test("login fails closed when the rate limiter is missing", async () => {
  const { AUTH_RATE_LIMITER, ...withoutLimiter } = env;
  const response = await handleAuthRequest(new Request(ORIGIN + "/auth/login"), withoutLimiter);
  assert.equal(response.status, 503);
  assert.match(await response.text(), /protection is unavailable/);
});

test("login rate limit blocks OAuth redirects", async () => {
  const limitedEnv = { ...env, AUTH_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const response = await handleAuthRequest(new Request(ORIGIN + "/auth/login", {
    headers: { "cf-connecting-ip": "192.0.2.10" },
  }), limitedEnv);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.get("location"), null);
});

test("placeholder OAuth configuration fails closed", async () => {
  const response = await handleAuthRequest(new Request(ORIGIN + "/auth/login"), {
    ...env,
    GITHUB_OAUTH_CLIENT_ID: "REPLACE_AFTER_REGISTERING_OAUTH_APP",
  });
  assert.equal(response.status, 503);
});
