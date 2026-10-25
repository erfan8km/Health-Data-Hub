import test from "node:test";
import assert from "node:assert/strict";
import { OAuthStateStore } from "./oauth-state-store.mjs";
import { MemoryStateStorage } from "./test-support.mjs";

const STATE = "A".repeat(43);

function makeStore() {
  const storage = new MemoryStateStorage();
  return { store: new OAuthStateStore({ storage }), storage };
}

async function call(store, path, payload) {
  return store.fetch(new Request("https://state.example.test" + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }));
}

test("reserves a state then consumes it only once", async () => {
  const { store } = makeStore();
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  const reserved = await call(store, "/reserve", { state: STATE, expiresAt });
  assert.equal(reserved.status, 201);
  assert.deepEqual(await reserved.json(), { reserved: true });

  const consumed = await call(store, "/consume", { state: STATE });
  assert.equal(consumed.status, 200);
  assert.deepEqual(await consumed.json(), { consumed: true });

  const replay = await call(store, "/consume", { state: STATE });
  assert.equal(replay.status, 409);
  assert.deepEqual(await replay.json(), { consumed: false });
});

test("concurrent consumes are atomic: exactly one request succeeds", async () => {
  const { store } = makeStore();
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  assert.equal((await call(store, "/reserve", { state: STATE, expiresAt })).status, 201);

  const results = await Promise.all([
    call(store, "/consume", { state: STATE }),
    call(store, "/consume", { state: STATE }),
  ]);
  const bodies = await Promise.all(results.map((result) => result.json()));
  assert.equal(bodies.filter((body) => body.consumed === true).length, 1);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
});

test("rejects expired, overlong-lifetime, and malformed state reservations", async () => {
  const { store } = makeStore();
  const now = Math.floor(Date.now() / 1000);

  assert.equal((await call(store, "/reserve", { state: STATE, expiresAt: now })).status, 400);
  assert.equal((await call(store, "/reserve", { state: STATE, expiresAt: now + 601 })).status, 400);
  assert.equal((await call(store, "/reserve", { state: "bad", expiresAt: now + 60 })).status, 400);
});

test("cleanup alarm removes expired state records and reschedules the next expiry", async () => {
  const { store, storage } = makeStore();
  const now = Math.floor(Date.now() / 1000);
  await storage.put("oauth-state:expired", now - 1);
  await storage.put("oauth-state:live", now + 20);
  await store.alarm();

  assert.equal(await storage.get("oauth-state:expired"), undefined);
  assert.equal(await storage.get("oauth-state:live"), now + 20);
  assert.equal(await storage.getAlarm(), (now + 20) * 1000);
});
