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

export function invalidatePoCache(): void {
  cacheClearPrefix("po:");
  cacheClearPrefix("po_total:");
  cacheClearPrefix("po_stats:");
  cacheClearPrefix("po_stats_v2:");
  cacheClearPrefix("po_stats_group:");
  cacheClearPrefix("checklist_summary:");
  cacheClearPrefix("checklist_total:");
  cacheClearPrefix("ritel:");
  cacheClearPrefix("company");

  try {
    // Invalidate Next.js unstable_cache tags
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { revalidateTag } = require("next/cache");
    if (typeof revalidateTag === "function") {
      try {
        (revalidateTag as any)("po_stats", "max");
      } catch (innerErr: any) {
        // Only fallback to single-arg if "max" was an unrecognized argument error in older Next
        if (innerErr && typeof innerErr.message === "string" && !innerErr.message.includes("static generation store")) {
          revalidateTag("po_stats");
        }
      }
    }
  } catch (err: any) {
    if (err && typeof err.message === "string" && !err.message.includes("static generation store")) {
      console.warn("Failed to invalidate Next.js cache tag 'po_stats':", err);
    }
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
