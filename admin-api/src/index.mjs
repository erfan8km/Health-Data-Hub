import { validateRegistryPayload } from "./validate.mjs";

const API_VERSION = "2022-11-28";
const DATA_PATH = "artifacts/iedr/public/data";
const MAX_BODY_BYTES = 2_000_000;

async function readBodyLimited(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      const error = new Error("request too large");
      error.status = 413;
      throw error;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function json(data, status = 200, origin = "") {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function b64urlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function decodePart(value) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(value)));
}

async function verifyAccessJwt(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid access token");
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("invalid access token algorithm");
  const team = String(env.CF_ACCESS_TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!team || !env.CF_ACCESS_AUD) throw new Error("Access configuration missing");
  const issuer = "https://" + team;
  if (claims.iss !== issuer) throw new Error("invalid issuer");
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new Error("invalid audience");
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(claims.exp) || claims.exp <= now || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now))) throw new Error("invalid token time claims");
  if (typeof claims.email !== "string" || claims.email.toLowerCase() !== String(env.ADMIN_EMAIL || "").toLowerCase()) {
    throw new Error("administrator not allowed");
  }
  const jwksResponse = await fetch(issuer + "/cdn-cgi/access/certs", { headers: { accept: "application/json" } });
  if (!jwksResponse.ok) throw new Error("could not verify access token");
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new Error("unknown access signing key");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!valid) throw new Error("invalid access signature");
  return claims;
}

async function githubRequest(env, path, options = {}) {
  const response = await fetch("https://api.github.com" + path, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: "Bearer " + env.GITHUB_TOKEN,
      "x-github-api-version": API_VERSION,
      "user-agent": "RegistryHub-Admin-API",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const error = new Error("GitHub API request failed with status " + response.status);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function decodeGithubFile(content) {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeGithubFile(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function readDataFile(env, repo, filename) {
  const file = await githubRequest(env, "/repos/" + repo + "/contents/" + DATA_PATH + "/" + filename + "?ref=main");
  return { sha: file.sha, data: JSON.parse(decodeGithubFile(file.content)) };
}

async function createProposal(env, registries, email) {
  const repo = String(env.GITHUB_REPOSITORY || "erfan8km/Health-Data-Hub");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("invalid configured repository");
  const [current, categories, countries, mainRef] = await Promise.all([
    readDataFile(env, repo, "registries.json"),
    readDataFile(env, repo, "categories.json"),
    readDataFile(env, repo, "countries.json"),
    githubRequest(env, "/repos/" + repo + "/git/ref/heads/main"),
  ]);
  const validation = validateRegistryPayload(registries, categories.data, countries.data);
  if (!validation.ok) return { validation };
  const branch = "admin/registry-update-" + crypto.randomUUID().slice(0, 8);
  await githubRequest(env, "/repos/" + repo + "/git/refs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref: "refs/heads/" + branch, sha: mainRef.object.sha }),
  });
  const serialized = JSON.stringify(registries, null, 2) + "\n";
  await githubRequest(env, "/repos/" + repo + "/contents/" + DATA_PATH + "/registries.json", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "Propose registry catalogue update via RegistryHub admin",
      content: encodeGithubFile(serialized),
      sha: current.sha,
      branch,
    }),
  });
  const pr = await githubRequest(env, "/repos/" + repo + "/pulls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Registry catalogue update",
      head: branch,
      base: "main",
      body: "Automated proposal submitted by the RegistryHub admin API.\n\n- Submitted by: " + email + "\n- Validated against current country/category IDs.\n- This PR must be reviewed and merged manually; the API never merges or deploys.",
    }),
  });
  return { pullRequest: { number: pr.number, url: pr.html_url, branch } };
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") {
    if (request.method === "GET") return json({ ok: true, service: "registryhub-admin-api" });
    return json({ error: "method not allowed" }, 405);
  }
  if (!url.pathname.startsWith("/api/")) {
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") return env.ASSETS.fetch(request);
    return json({ error: "not found" }, 404);
  }
  if (url.pathname !== "/api/proposals") return json({ error: "not found" }, 404);

  const expectedOrigin = String(env.ADMIN_ORIGIN || "").replace(/\/$/, "");
  const origin = request.headers.get("origin") || "";
  if (!expectedOrigin || origin !== expectedOrigin) return json({ error: "origin not allowed" }, 403);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": expectedOrigin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
      vary: "Origin",
    } });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405, expectedOrigin);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return json({ error: "application/json required" }, 415, expectedOrigin);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return json({ error: "request too large" }, 413, expectedOrigin);

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return json({ error: "authentication required through Cloudflare Access" }, 401, expectedOrigin);
  let claims;
  try {
    claims = await verifyAccessJwt(token, env);
  } catch {
    return json({ error: "authentication failed" }, 401, expectedOrigin);
  }
  if (!env.GITHUB_TOKEN || !env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAIL || !env.ADMIN_ORIGIN) {
    return json({ error: "admin API is not configured" }, 503, expectedOrigin);
  }
  let payload;
  try {
    payload = JSON.parse(await readBodyLimited(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error?.status === 413) return json({ error: "request too large" }, 413, expectedOrigin);
    return json({ error: "invalid JSON body" }, 400, expectedOrigin);
  }
  if (!payload || !Array.isArray(payload.registries)) return json({ error: "body must contain a registries array" }, 400, expectedOrigin);
  try {
    const result = await createProposal(env, payload.registries, claims.email);
    if (result.validation) return json({ error: "validation failed", details: result.validation.errors }, 422, expectedOrigin);
    return json({ ok: true, ...result }, 201, expectedOrigin);
  } catch {
    return json({ error: "could not create proposal; check server configuration and GitHub permissions" }, 502, expectedOrigin);
  }
}

export default { fetch: handleRequest };
