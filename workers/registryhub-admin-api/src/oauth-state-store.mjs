const STATE_PREFIX = "oauth-state:";
const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Strongly consistent, one-time OAuth state storage.
 * All OAuth states are serialized through one Durable Object so consumption
 * is atomic and a callback cannot reuse an already-consumed state.
 */
export class OAuthStateStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

    const url = new URL(request.url);
    if (url.pathname !== "/reserve" && url.pathname !== "/consume") {
      return jsonResponse({ error: "not found" }, 404);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "invalid JSON" }, 400);
    }

    const state = payload?.state;
    if (typeof state !== "string" || !STATE_PATTERN.test(state)) {
      return jsonResponse({ error: "invalid state" }, 400);
    }

    const key = STATE_PREFIX + state;
    const now = Math.floor(Date.now() / 1000);

    if (url.pathname === "/reserve") {
      const expiresAt = payload?.expiresAt;
      if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + 600) {
        return jsonResponse({ error: "invalid state expiry" }, 400);
      }

      const reserved = await this.ctx.storage.transaction(async (txn) => {
        const existing = await txn.get(key);
        if (Number.isSafeInteger(existing) && existing > now) return false;
        await txn.put(key, expiresAt);
        return true;
      });

      if (!reserved) return jsonResponse({ reserved: false }, 409);

      const currentAlarm = await this.ctx.storage.getAlarm();
      const nextAlarm = expiresAt * 1000;
      if (currentAlarm === null || currentAlarm > nextAlarm) {
        await this.ctx.storage.setAlarm(nextAlarm);
      }
      return jsonResponse({ reserved: true }, 201);
    }

    let consumed = false;
    await this.ctx.storage.transaction(async (txn) => {
      const expiresAt = await txn.get(key);
      if (Number.isSafeInteger(expiresAt) && expiresAt > now) {
        await txn.delete(key);
        consumed = true;
      } else if (expiresAt !== undefined) {
        await txn.delete(key);
      }
    });

    return jsonResponse({ consumed }, consumed ? 200 : 409);
  }

  async alarm() {
    const now = Math.floor(Date.now() / 1000);
    const entries = await this.ctx.storage.list({ prefix: STATE_PREFIX });
    const expiredKeys = [];
    let nextExpiry = null;

    for (const [key, expiresAt] of entries) {
      if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
        expiredKeys.push(key);
      } else if (nextExpiry === null || expiresAt < nextExpiry) {
        nextExpiry = expiresAt;
      }
    }

    if (expiredKeys.length) await this.ctx.storage.delete(expiredKeys);
    if (nextExpiry !== null) await this.ctx.storage.setAlarm(nextExpiry * 1000);
    else await this.ctx.storage.deleteAlarm();
  }
}
