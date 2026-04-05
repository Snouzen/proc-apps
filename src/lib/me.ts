"use client";

type Me = {
  authenticated: boolean;
  email?: string;
  role?: "pusat" | "rm" | "spb_dki";
  regional?: string | null;
  siteArea?: string | null;
};

let meCache: Me | null = null;
let mePromise: Promise<Me> | null = null;

export function setMeCache(data: Me) {
  meCache = data;
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("__me__", JSON.stringify(data));
      (window as any).__me__ = data;
    }
  } catch {}
}

export function clearMeCache() {
  meCache = null;
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("__me__");
      delete (window as any).__me__;
    }
  } catch {}
}

export function getMeSync(): Me | null {
  if (meCache) return meCache;
  try {
    if (typeof window !== "undefined") {
      const w = (window as any).__me__;
      if (w) {
        meCache = w as Me;
        return meCache;
      }
      const raw = sessionStorage.getItem("__me__");
      if (raw) {
        meCache = JSON.parse(raw) as Me;
        (window as any).__me__ = meCache;
        return meCache;
      }
    }
  } catch {}
  return null;
}

export async function getMe(force = false): Promise<Me> {
  if (force) {
    meCache = null;
  }
  const sync = getMeSync();
  if (sync && !force) return sync;

  if (mePromise) return mePromise;
  console.log("Fetching user profile...");
  mePromise = fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then(async (r) => {
      let d: any = null;
      try {
        d = await r.json();
      } catch {
        d = null;
      }
      if (r.status === 401 || d?.authenticated === false) {
        clearMeCache();
        const data: Me = { authenticated: false };
        setMeCache(data);
        return data;
      }
      const data: Me = d?.authenticated
        ? {
            authenticated: true,
            email: d.email,
            role: d.role,
            regional: d.regional ?? null,
            siteArea: d.siteArea ?? null,
          }
        : { authenticated: false };
      setMeCache(data);
      return data;
    })
    .catch(() => {
      clearMeCache();
      const data: Me = { authenticated: false };
      setMeCache(data);
      return data;
    })
    .finally(() => {
      mePromise = null;
    });
  return mePromise;
}
