import { validateRegistryPayload } from "./validate.mjs";
import { checkRateLimit, handleAuthRequest, readAdminSession } from "./auth.mjs";
export { OAuthStateStore } from "./oauth-state-store.mjs";

const API_VERSION = "2022-11-28";
const DATA_PATH = "artifacts/iedr/public/data";
const MAX_BODY_BYTES = 2_000_000;

export async function readBodyLimited(request, limit) {
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

async function serveAdminAssets(request, env) {
  const url = new URL(request.url);
  let asset;
  if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
    asset = await env.ASSETS.fetch(request);
  } else if (typeof env.ADMIN_HTML === "string" && (url.pathname === "/" || url.pathname === "/index.html")) {
    asset = new Response(env.ADMIN_HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } else {
    return json({ error: "not found" }, 404);
  }
  const headers = new Headers(asset.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
}

export function isAllowedGithubWrite(repo, path, method, bodyText) {
  const verb = String(method || "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD") return true;
  let body;
  try {
    body = JSON.parse(bodyText || "");
  } catch {
    return false;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;

  const branchPattern = /^admin\/registry-update-[0-9a-f]{8}$/;
  const objectShaPattern = /^[0-9a-f]{40}$/;

  if (verb === "POST" && path === "/repos/" + repo + "/git/refs") {
    return typeof body.ref === "string" &&
      /^refs\/heads\/admin\/registry-update-[0-9a-f]{8}$/.test(body.ref) &&
      typeof body.sha === "string" && objectShaPattern.test(body.sha);
  }

  if (verb === "PUT" && path === "/repos/" + repo + "/contents/" + DATA_PATH + "/registries.json") {
    return typeof body.branch === "string" && branchPattern.test(body.branch) &&
      typeof body.sha === "string" && objectShaPattern.test(body.sha) &&
      body.message === "Propose registry catalogue update via RegistryHub admin" &&
      typeof body.content === "string" && body.content.length > 0;
  }

  if (verb === "POST" && path === "/repos/" + repo + "/pulls") {
    return typeof body.head === "string" && branchPattern.test(body.head) &&
      body.base === "main" &&
      body.title === "Registry catalogue update" &&
      typeof body.body === "string" && body.body.includes("must be reviewed and merged manually");
  }

  return false;
}

async function githubRequest(env, path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const repo = String(env.GITHUB_REPOSITORY || "erfan8km/Health-Data-Hub");
  if (!isAllowedGithubWrite(repo, path, method, options.body || "")) {
    throw new Error("GitHub write blocked by RegistryHub path and branch allowlist");
  }
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
  const authResponse = await handleAuthRequest(request, env);
  if (authResponse) return authResponse;
  const url = new URL(request.url);
  if (url.pathname === "/health") {
    if (request.method === "GET") return json({ ok: true, service: "registryhub-admin-api" });
    return json({ error: "method not allowed" }, 405);
  }
  if (!url.pathname.startsWith("/api/")) {
    if ((env.ASSETS && typeof env.ASSETS.fetch === "function") || typeof env.ADMIN_HTML === "string") return serveAdminAssets(request, env);
    return json({ error: "not found" }, 404);
  }
  if (url.pathname === "/api/catalogue") {
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
    const session = await readAdminSession(request, env);
    if (!session) return json({ error: "authentication required" }, 401);
    const configuredRepo = String(env.GITHUB_REPOSITORY || "erfan8km/Health-Data-Hub");
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuredRepo) ||
        typeof env.GITHUB_TOKEN !== "string" || !env.GITHUB_TOKEN ||
        /^replace[_ -]?/i.test(env.GITHUB_TOKEN) || !env.ADMIN_ORIGIN) {
      return json({ error: "admin API is not configured" }, 503);
    }
    const origin = request.headers.get("origin") || "";
    const expectedOrigin = String(env.ADMIN_ORIGIN || "").replace(/\/$/, "");
    if (origin && origin !== expectedOrigin) return json({ error: "origin not allowed" }, 403);
    const limited = await checkRateLimit(env, "PROPOSAL_RATE_LIMITER", "catalogue:" + session.id);
    if (limited) return limited;
    try {
      const [registries, categories, countries] = await Promise.all([
        readDataFile(env, configuredRepo, "registries.json"),
        readDataFile(env, configuredRepo, "categories.json"),
        readDataFile(env, configuredRepo, "countries.json"),
      ]);
      return json({
        ok: true,
        source: "main",
        loadedAt: new Date().toISOString(),
        registries: registries.data,
        categories: categories.data,
        countries: countries.data,
      });
    } catch {
      return json({ error: "could not load current catalogue; check admin API configuration and GitHub read permissions" }, 502);
    }
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

  const session = await readAdminSession(request, env);
  if (!session) return json({ error: "authentication required" }, 401, expectedOrigin);
  if (typeof env.GITHUB_TOKEN !== "string" || !env.GITHUB_TOKEN ||
      /^replace[_ -]?/i.test(env.GITHUB_TOKEN) ||
      !env.GITHUB_REPOSITORY || !env.ADMIN_ORIGIN) {
    return json({ error: "admin API is not configured" }, 503, expectedOrigin);
  }
  const limited = await checkRateLimit(env, "PROPOSAL_RATE_LIMITER", "admin:" + session.id);
  if (limited) return limited;
  let payload;
  try {
    payload = JSON.parse(await readBodyLimited(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error?.status === 413) return json({ error: "request too large" }, 413, expectedOrigin);
    return json({ error: "invalid JSON body" }, 400, expectedOrigin);
  }
  if (!payload || !Array.isArray(payload.registries)) return json({ error: "body must contain a registries array" }, 400, expectedOrigin);
  try {
    const result = await createProposal(env, payload.registries, session.login);
    if (result.validation) return json({ error: "validation failed", details: result.validation.errors }, 422, expectedOrigin);
    return json({ ok: true, ...result }, 201, expectedOrigin);
  } catch {
    return json({ error: "could not create proposal; check server configuration and GitHub permissions" }, 502, expectedOrigin);
  }
}

export default { fetch: handleRequest };
