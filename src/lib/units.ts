"use client";

export type UnitProduksi = {
  idRegional?: string;
  namaRegional?: string;
  siteArea?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
};

let unitsCache: UnitProduksi[] | null = null;
let unitsPromise: Promise<UnitProduksi[]> | null = null;

export function setUnitsCache(data: UnitProduksi[]) {
  unitsCache = data;
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("__units__", JSON.stringify(data));
      (window as any).__units__ = data;
    }
  } catch {}
}

export function clearUnitsCache() {
  unitsCache = null;
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("__units__");
      delete (window as any).__units__;
    }
  } catch {}
}

export function getUnitsSync(): UnitProduksi[] | null {
  if (unitsCache) return unitsCache;
  try {
    if (typeof window !== "undefined") {
      const w = (window as any).__units__;
      if (Array.isArray(w)) {
        unitsCache = w as UnitProduksi[];
        return unitsCache;
      }
      const raw = sessionStorage.getItem("__units__");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          unitsCache = parsed as UnitProduksi[];
          (window as any).__units__ = unitsCache;
          return unitsCache;
        }
      }
    }
  } catch {}
  return null;
}

export async function getUnits(force = false): Promise<UnitProduksi[]> {
  if (force) unitsCache = null;
  const sync = getUnitsSync();
  if (sync && !force) return sync;

  if (unitsPromise) return unitsPromise;
  unitsPromise = fetch("/api/unit-produksi", {
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })
    .then((r) => r.json().catch(() => null))
    .then((json) => {
      let list: any[] = [];
      if (Array.isArray(json)) list = json;
      else if (Array.isArray((json as any)?.data)) list = (json as any).data;
      else if (Array.isArray((json as any)?.rows)) list = (json as any).rows;
      else if (Array.isArray((json as any)?.items)) list = (json as any).items;
      setUnitsCache(list as UnitProduksi[]);
      return list as UnitProduksi[];
    })
    .catch(() => {
      clearUnitsCache();
      setUnitsCache([]);
      return [];
    })
    .finally(() => {
      unitsPromise = null;
    });
  return unitsPromise;
}

