"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { clearMeCache, getMeSync, setMeCache, type Me } from "@/lib/me";
import { ACTIVITY_KEY, SESSION_TTL_MS, SESSION_CHANGE_EVENT, SESSION_GATE_EVENT, SESSION_VERIFIED_EVENT, SessionRecovery, type GateReason } from "@/lib/session-policy";

export default function IdleTimeoutDetector() {
  const isLogin = usePathname() === "/login";
  const [reason, setReason] = useState<GateReason>("active");
  const [checking, setChecking] = useState(false);
  const verifyRef = useRef<() => void>(() => {});
  const dialogRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isLogin) return;
    const recovery = new SessionRecovery(getMeSync());
    let alive = true, verification = 0, lastWrite = 0, lastVerifyAt = 0;
    let lastActivity = Date.now();
    let controller: AbortController | null = null;
    const nativeFetch = window.fetch.bind(window);
    const previousFetch = window.fetch;
    const app = document.getElementById("session-workspace");
    const readActivity = () => {
      try { const value = Number(localStorage.getItem(ACTIVITY_KEY));
        return value > 0 && value <= Date.now() ? value : lastActivity;
      } catch { return lastActivity; }
    };
    lastActivity = readActivity();
    const isBlockingReason = (r: GateReason) => r === "expired" || r === "idle" || r === "logout";
    const publish = () => {
      if (!alive) return;
      const locked = isBlockingReason(recovery.reason);
      if (app) app.inert = locked;
      setReason(recovery.reason);
      window.dispatchEvent(new CustomEvent(SESSION_GATE_EVENT, { detail: { locked } }));
    };
    const recordActivity = () => {
      if (isBlockingReason(recovery.reason)) return;
      lastActivity = Date.now();
      // Separate last interaction from last storage write: frequent typing still syncs.
      if (lastActivity - lastWrite >= 10000) {
        lastWrite = lastActivity;
        try { localStorage.setItem(ACTIVITY_KEY, String(lastActivity)); } catch {}
      }
    };
    const verify = async () => {
      const request = ++verification;
      lastVerifyAt = Date.now();
      controller?.abort();
      controller = new AbortController();
      const requestController = controller;
      const timeout = window.setTimeout(() => requestController.abort(), 15000);
      setChecking(true);
      try {
        const response = await nativeFetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (!response.ok && response.status !== 401) return;
        const next: Me = response.status === 401 ? { authenticated: false } : await response.json();
        if (!alive || request !== verification) return;
        const wasLocked = isBlockingReason(recovery.reason);
        const oldRevision = recovery.baseline?.sessionRevision;
        if (recovery.observe(next)) {
          setMeCache(next);
          if (wasLocked || oldRevision !== next.sessionRevision) {
            lastActivity = Date.now(); lastWrite = lastActivity;
            try { localStorage.setItem(ACTIVITY_KEY, String(lastActivity)); } catch {}
          }
          window.dispatchEvent(new CustomEvent(SESSION_VERIFIED_EVENT, { detail: next }));
        } else clearMeCache();
        publish();
      } catch {
        // Ignore transient network/abort errors during multi-tab usage so active tabs are never interrupted
      } finally {
        window.clearTimeout(timeout);
        if (alive && request === verification) setChecking(false);
      }
    };
    verifyRef.current = () => { void verify(); };
    const onChange = (event: Event) => {
      const kind = (event as CustomEvent).detail?.kind;
      if (kind === "logout") {
        recovery.lock("logout");
        publish();
      }
      void verify();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_KEY) lastActivity = readActivity();
    };
    const onFocus = () => {
      if (document.hidden) return;
      if (Date.now() - Math.max(lastActivity, readActivity()) >= SESSION_TTL_MS) {
        recovery.lock("idle");
        publish();
      }
      if (isBlockingReason(recovery.reason) || Date.now() - lastVerifyAt >= 30000) {
        void verify();
      }
    };
    const wrappedFetch: typeof fetch = async (input, init) => {
      let url: URL | null = null;
      try { url = new URL(input instanceof Request ? input.url : String(input), window.location.origin); } catch {}
      const api = url?.origin === window.location.origin && url.pathname.startsWith("/api/");
      const auth = api && url!.pathname.startsWith("/api/auth/");
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (api && !auth && isBlockingReason(recovery.reason) && !["GET", "HEAD", "OPTIONS"].includes(method)) {
        return Response.json({ error: "Sesi telah berakhir. Login kembali, lalu simpan ulang setelah sesi aktif." }, { status: 401 });
      }
      const epoch = recovery.epoch;
      const response = await nativeFetch(input, init);
      if (api && !auth && response.status === 401 && alive && epoch === recovery.epoch) {
        recovery.lock("expired"); publish(); void verify();
      }
      // Never retry a mutation: callers retain responsibility for explicit Save.
      return response;
    };
    window.fetch = wrappedFetch;
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach(name => window.addEventListener(name, recordActivity, { passive: true }));
    window.addEventListener(SESSION_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (!isBlockingReason(recovery.reason) && Date.now() - Math.max(lastActivity, readActivity()) >= SESSION_TTL_MS) {
        recovery.lock("idle"); publish();
      }
      void verify();
    }, 60000);
    if (Date.now() - lastActivity >= SESSION_TTL_MS) recovery.lock("idle");
    publish(); void verify();
    return () => {
      alive = false; verification++; controller?.abort(); window.clearInterval(timer);
      if (window.fetch === wrappedFetch) window.fetch = previousFetch;
      events.forEach(name => window.removeEventListener(name, recordActivity));
      window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      if (app) app.inert = false;
      window.dispatchEvent(new CustomEvent(SESSION_GATE_EVENT, { detail: { locked: false } }));
    };
  }, [isLogin]);

  const locked = !isLogin && (reason === "expired" || reason === "idle" || reason === "logout");
  useEffect(() => {
    if (!locked) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    loginRef.current?.focus();
    const onFocus = (event: FocusEvent) => {
      if (!dialogRef.current?.contains(event.target as Node)) loginRef.current?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || []);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("focusin", onFocus); document.removeEventListener("keydown", onKey, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [locked]);
  if (!locked) return null;
  const descriptions: Record<GateReason, string> = {
    active: "", checking: "Memverifikasi sesi Anda...",
    expired: "Sesi berakhir. Login dengan akun yang sama di tab lain; halaman ini akan terbuka kembali tanpa menghapus isian.",
    idle: "Tidak ada aktivitas selama 4 jam. Login kembali dengan akun yang sama untuk melanjutkan.",
    logout: "Akun telah logout. Login kembali dengan akun yang sama untuk melanjutkan pekerjaan ini.",
    changed: "Akun atau hak akses berubah. Isian tetap dipertahankan dan belum dikirim. Login kembali dengan akun semula, atau muat ulang setelah memastikan isian sudah diamankan.",
    unavailable: "Sesi belum dapat diverifikasi karena jaringan atau layanan bermasalah. Isian tetap tersimpan di tab ini. Coba periksa sesi kembali.",
  };
  return <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="session-title" aria-describedby="session-description" className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
      <h2 id="session-title" className="text-lg font-bold">Pekerjaan dijeda</h2>
      <p id="session-description" className="text-sm text-slate-600 dark:text-slate-300">{descriptions[reason]}</p>
      <p className="text-xs text-slate-500">Jangan refresh atau tutup tab ini agar isian belum tersimpan tetap ada. Setelah sesi aktif, klik Simpan sendiri.</p>
      <a ref={loginRef} href="/login?reauth=1" target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-blue-700 text-white p-3 text-center font-semibold">Login di tab baru</a>
      <button type="button" disabled={checking} onClick={() => verifyRef.current()} className="w-full rounded-xl border p-3 disabled:opacity-50">{checking ? "Memeriksa..." : "Saya sudah login — Periksa sesi"}</button>
    </div>
  </div>;
}
