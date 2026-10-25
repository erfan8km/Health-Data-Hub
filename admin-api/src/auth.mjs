const encoder = new TextEncoder();
const decoder = new TextDecoder();
const STATE_COOKIE = "__Host-rh_oauth";
const SESSION_COOKIE = "__Host-rh_session";
const STATE_TTL_SECONDS = 600;
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

function base64url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid encoded value");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(decoder.decode(decodeBase64url(value)));
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  let diff = left.length ^ right.length;
  const size = Math.max(left.length, right.length);
  for (let i = 0; i < size; i++) {
    diff |= (left.charCodeAt(i % (left.length || 1)) || 0) ^ (right.charCodeAt(i % (right.length || 1)) || 0);
  }
  return diff === 0;
}

function validSecret(secret) {
  return typeof secret === "string" && encoder.encode(secret).byteLength >= 32;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

async function signJson(payload, secret) {
  const encodedPayload = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = base64url(await hmac(secret, encodedPayload));
  return encodedPayload + "." + signature;
}

async function verifyJson(token, secret) {
  if (!validSecret(secret) || typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const expected = base64url(await hmac(secret, parts[0]));
    if (!constantTimeEqual(expected, parts[1])) return null;
    const payload = decodeJson(parts[0]);
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

function randomToken(size = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}

async function pkceChallenge(verifier) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
}

function cookies(request) {
  const result = new Map();
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    result.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return result;
}

function cookie(name, value, maxAge) {
  return name + "=" + value + "; Max-Age=" + maxAge + "; Path=/; Secure; HttpOnly; SameSite=Lax";
}

function expiredCookie(name) {
  return cookie(name, "", 0);
}

function response(body, status = 200, headers = {}, setCookies = []) {
  const resultHeaders = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  for (const value of setCookies) resultHeaders.append("set-cookie", value);
  return new Response(body, { status, headers: resultHeaders });
}

function json(data, status = 200) {
  return response(JSON.stringify(data), status, { "content-type": "application/json; charset=utf-8" });
}

function textError(message, status, setCookies = []) {
  return response(message, status, { "content-type": "text/plain; charset=utf-8" }, setCookies);
}

function originFromEnv(env) {
  if (typeof env.ADMIN_ORIGIN !== "string") return null;
  const supplied = env.ADMIN_ORIGIN.trim().replace(/\/$/, "");
  try {
    const parsed = new URL(supplied);
    if (parsed.protocol !== "https:" || parsed.origin !== supplied || parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function configReady(env) {
  return Boolean(
    originFromEnv(env) &&
    typeof env.GITHUB_OAUTH_CLIENT_ID === "string" && env.GITHUB_OAUTH_CLIENT_ID.length > 0 &&
    typeof env.GITHUB_OAUTH_CLIENT_SECRET === "string" && env.GITHUB_OAUTH_CLIENT_SECRET.length > 0 &&
    validSecret(env.SESSION_SIGNING_SECRET) &&
    typeof env.ADMIN_GITHUB_USER_ID === "string" && /^\d{1,20}$/.test(env.ADMIN_GITHUB_USER_ID),
  );
}

async function issueSession(login, userId, env) {
  const now = Math.floor(Date.now() / 1000);
  const token = await signJson({
    sub: String(userId),
    login,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }, env.SESSION_SIGNING_SECRET);
  return cookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS);
}

export async function readAdminSession(request, env) {
  if (!validSecret(env.SESSION_SIGNING_SECRET) ||
      typeof env.ADMIN_GITHUB_USER_ID !== "string" ||
      !/^\d{1,20}$/.test(env.ADMIN_GITHUB_USER_ID)) return null;

  const token = cookies(request).get(SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyJson(token, env.SESSION_SIGNING_SECRET);
  if (!payload) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.sub !== "string" || payload.sub !== env.ADMIN_GITHUB_USER_ID) return null;
  if (typeof payload.login !== "string" || !/^[A-Za-z0-9-]{1,39}$/.test(payload.login)) return null;
  if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return null;
  if (payload.iat > now + 30 || payload.exp <= now || payload.exp <= payload.iat ||
      payload.exp - payload.iat > SESSION_TTL_SECONDS) return null;
  return { id: payload.sub, login: payload.login, expiresAt: payload.exp };
}

async function beginLogin(env) {
  if (!configReady(env)) return textError("Admin authentication is not configured.", 503);
  const origin = originFromEnv(env);
  const state = randomToken(32);
  const verifier = randomToken(48);
  const signedState = await signJson({
    state,
    verifier,
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  }, env.SESSION_SIGNING_SECRET);
  const challenge = await pkceChallenge(verifier);
  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", origin + "/auth/callback");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("allow_signup", "false");
  return response(null, 302, { location: authorize.toString() }, [
    cookie(STATE_COOKIE, signedState, STATE_TTL_SECONDS),
  ]);
}

async function completeLogin(request, env) {
  const clearState = expiredCookie(STATE_COOKIE);
  if (!configReady(env)) return textError("Admin authentication is not configured.", 503, [clearState]);
  const url = new URL(request.url);
  if (url.searchParams.has("error")) {
    return textError("GitHub sign-in was not completed.", 401, [clearState]);
  }
  const code = url.searchParams.get("code") || "";
  const returnedState = url.searchParams.get("state") || "";
  if (!code || code.length > 2048 || !returnedState || returnedState.length > 256) {
    return textError("Invalid sign-in response.", 400, [clearState]);
  }
  const signedState = cookies(request).get(STATE_COOKIE);
  const state = await verifyJson(signedState, env.SESSION_SIGNING_SECRET);
  const now = Math.floor(Date.now() / 1000);
  if (!state || typeof state.state !== "string" || typeof state.verifier !== "string" ||
      typeof state.exp !== "number" || state.exp <= now ||
      !constantTimeEqual(state.state, returnedState)) {
    return textError("Sign-in state is invalid or expired. Please start again.", 400, [clearState]);
  }

  let accessToken;
  let githubUser;
  try {
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: originFromEnv(env) + "/auth/callback",
        code_verifier: state.verifier,
      }),
    });
    if (!tokenResponse.ok) return textError("GitHub sign-in could not be completed.", 502, [clearState]);
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string" || !tokenData.access_token ||
        (tokenData.token_type && String(tokenData.token_type).toLowerCase() !== "bearer")) {
      return textError("GitHub sign-in could not be completed.", 502, [clearState]);
    }
    accessToken = tokenData.access_token;

    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer " + accessToken,
        "x-github-api-version": "2022-11-28",
        "user-agent": "RegistryHub-Admin",
      },
    });
    if (!userResponse.ok) return textError("GitHub identity could not be verified.", 502, [clearState]);
    githubUser = await userResponse.json();
  } catch {
    return textError("GitHub sign-in could not be completed.", 502, [clearState]);
  } finally {
    // The temporary OAuth token is never stored, returned to the browser, or logged.
    accessToken = undefined;
  }

  if (!githubUser || !Number.isSafeInteger(githubUser.id) ||
      String(githubUser.id) !== env.ADMIN_GITHUB_USER_ID ||
      typeof githubUser.login !== "string" ||
      !/^[A-Za-z0-9-]{1,39}$/.test(githubUser.login)) {
    return textError("This GitHub account is not authorized for RegistryHub administration.", 403, [clearState]);
  }

  const sessionCookie = await issueSession(githubUser.login, githubUser.id, env);
  return response(null, 303, { location: originFromEnv(env) + "/" }, [
    sessionCookie,
    clearState,
  ]);
}

async function sessionStatus(request, env) {
  const expectedOrigin = originFromEnv(env);
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && (!expectedOrigin || requestOrigin !== expectedOrigin)) {
    return json({ authenticated: false }, 403);
  }
  const session = await readAdminSession(request, env);
  if (!session) return json({ authenticated: false });
  return json({
    authenticated: true,
    user: { id: session.id, login: session.login },
    expiresAt: session.expiresAt,
  });
}

function logout(request, env) {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  const expectedOrigin = originFromEnv(env);
  if (!expectedOrigin || request.headers.get("origin") !== expectedOrigin) {
    return json({ error: "origin not allowed" }, 403);
  }
  return response(null, 303, { location: expectedOrigin + "/" }, [
    expiredCookie(SESSION_COOKIE),
    expiredCookie(STATE_COOKIE),
  ]);
}

export async function handleAuthRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/auth/login") {
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
    return beginLogin(env);
  }
  if (url.pathname === "/auth/callback") {
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405, {}, [expiredCookie(STATE_COOKIE)]);
    return completeLogin(request, env);
  }
  if (url.pathname === "/api/session") {
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
    return sessionStatus(request, env);
  }
  if (url.pathname === "/auth/logout") return logout(request, env);
  return null;
}
