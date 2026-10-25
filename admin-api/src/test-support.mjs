import { OAuthStateStore } from "./oauth-state-store.mjs";

export class MemoryStateStorage {
  constructor() {
    this.values = new Map();
    this.alarm = null;
    this.queue = Promise.resolve();
  }

  async get(key) {
    return this.values.get(key);
  }

  async put(key, value) {
    this.values.set(key, value);
  }

  async delete(keys) {
    if (Array.isArray(keys)) {
      let count = 0;
      for (const key of keys) if (this.values.delete(key)) count++;
      return count;
    }
    return this.values.delete(keys);
  }

  async list({ prefix = "" } = {}) {
    return new Map([...this.values.entries()].filter(([key]) => key.startsWith(prefix)));
  }

  async getAlarm() {
    return this.alarm;
  }

  async setAlarm(value) {
    this.alarm = value;
  }

  async deleteAlarm() {
    this.alarm = null;
  }

  transaction(callback) {
    const pending = this.queue.then(() => callback(this));
    this.queue = pending.then(() => undefined, () => undefined);
    return pending;
  }
}

export function createOAuthStateStoreBinding() {
  const store = new OAuthStateStore({ storage: new MemoryStateStorage() });
  const stub = {
    fetch(input, init) {
      const request = input instanceof Request ? input : new Request(input, init);
      return store.fetch(request);
    },
  };
  return {
    idFromName(name) { return name; },
    get() { return stub; },
  };
}
