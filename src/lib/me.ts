"use client";
import { SESSION_CHANGE_EVENT, SESSION_CHANGE_KEY } from "@/lib/session-policy";
export type Me = {
  authenticated: boolean;
  email?: string;
  role?: "pusat" | "rm" | "sitearea" | "magang" | "spb_dki";
  userId?: string; regional?: string | null; siteArea?: string | null;
  expiresAt?: number; sessionRevision?: string; permissionsHash?: string;
};
let meCache: Me | null = null;
let generation = 0;
let pending: { generation: number; promise: Promise<Me> } | null = null;
export function setMeCache(data: Me) {
  generation++;
  meCache = data;
  try { if (typeof window !== "undefined") {
    sessionStorage.setItem("__me__", JSON.stringify(data));
    (window as any).__me__ = data;
  } } catch {}
}
export function clearMeCache() {
  generation++;
  meCache = null;
  try { if (typeof window !== "undefined") {
    sessionStorage.removeItem("__me__"); delete (window as any).__me__;
  } } catch {}
}
export function getMeSync(): Me | null {
  if (meCache) return meCache;
  try { if (typeof window !== "undefined") {
    const raw = sessionStorage.getItem("__me__");
    const value = (window as any).__me__ || (raw ? JSON.parse(raw) : null);
    if (value) meCache = value;
  } } catch {}
  return meCache;
}
export async function getMe(force = false): Promise<Me> {
  if (force) clearMeCache();
  const cached = getMeSync();
  if (cached && !force) return cached;
  if (pending?.generation === generation) return pending.promise;
  const requestGeneration = generation;
  const promise: Promise<Me> = fetch("/api/auth/me", {
    cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" },
  }).then(async response => {
    if (!response.ok && response.status !== 401) throw new Error("Verifikasi sesi belum tersedia");
    const json = await response.json();
    const value: Me = response.status === 401 ? { authenticated: false } : json;
    if (typeof value.authenticated !== "boolean") throw new Error("Respons sesi tidak valid");
    // An old /me response must never overwrite a newer login or logout.
    if (requestGeneration !== generation) return getMe();
    setMeCache(value);
    return value;
  }).finally(() => { if (pending?.promise === promise) pending = null; });
  pending = { generation: requestGeneration, promise };
  return promise;
}
export type SessionChangeKind = "login" | "logout" | "changed";
export function announceSessionChange(kind: SessionChangeKind = "changed") {
  if (typeof window === "undefined") return;
  const message = { kind, nonce: crypto.randomUUID() };
  try { localStorage.setItem(SESSION_CHANGE_KEY, JSON.stringify(message)); } catch {}
  window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT, { detail: message }));
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.key !== SESSION_CHANGE_KEY) return;
    let kind: SessionChangeKind = "changed";
    try { const parsed = JSON.parse(event.newValue || "null");
      if (["login", "logout", "changed"].includes(parsed?.kind)) kind = parsed.kind;
    } catch {}
    clearMeCache();
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT, { detail: { kind } }));
  });
}
