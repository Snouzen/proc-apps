type Entry = {
  expiresAt: number;
  value: unknown;
};

const MAX_CACHE_ENTRIES = 5000;

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  // Move to end to simulate LRU
  store.delete(key);
  store.set(key, hit);
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  if (store.size >= MAX_CACHE_ENTRIES) {
    cachePrune();
    if (store.size >= MAX_CACHE_ENTRIES) {
      // Evict oldest (first item in Map)
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
    }
  }
  // Remove existing to update insertion order
  store.delete(key);
  store.set(key, { value, expiresAt: Date.now() + Math.max(1, ttlMs) });
}

export function cacheDel(key: string) {
  store.delete(key);
}

export function cacheClearPrefix(prefix: string) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function cachePrune() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expiresAt) store.delete(k);
  }
}

export async function singleFlight<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = inflight.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p as Promise<unknown>);
  return p as Promise<T>;
}
