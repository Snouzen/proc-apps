"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ClockAlert, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { clearMeCache, announceSessionChange } from "@/lib/me";

// Idle duration: 1 hour (60 minutes = 3,600,000 ms)
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 10 * 1000; // Check every 10 seconds
const STORAGE_KEY = "proc_last_activity_time";

export default function IdleTimeoutDetector() {
  const pathname = usePathname();
  const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"idle" | "unauthorized">("idle");
  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  // Mark user activity (throttled to avoid performance hits)
  const recordActivity = useCallback(() => {
    if (isIdleModalOpen) return;
    const now = Date.now();
    // Only write to localStorage at most once every 10 seconds
    if (now - lastActivityRef.current > 10000) {
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, now.toString());
      } catch {}
    } else {
      lastActivityRef.current = now;
    }
  }, [isIdleModalOpen]);

  // Handle re-login button click
  const handleReLogin = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    clearMeCache();
                      announceSessionChange();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Redirect to login with current path saved for seamless return
    const currentTarget =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : pathname || "/";
    const loginUrl =
      currentTarget && currentTarget !== "/" && currentTarget !== "/login"
        ? `/login?next=${encodeURIComponent(currentTarget)}`
        : "/login";

    window.location.href = loginUrl;
  };

  useEffect(() => {
    if (pathname === "/login") return;

    // Initialize last activity time from storage or now
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (stored && !isNaN(stored) && Date.now() - stored < IDLE_TIMEOUT_MS) {
      lastActivityRef.current = stored;
    } else {
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {}
    }

    // 1. Activity event listeners
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleEvent = () => recordActivity();

    // Throttled mousemove
    let mouseMoveThrottle = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - mouseMoveThrottle > 5000) {
        mouseMoveThrottle = now;
        recordActivity();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleEvent, { passive: true }));
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 2. Multi-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = Number(e.newValue);
        if (val) lastActivityRef.current = val;
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Periodic timer to check for AFK / inactivity
    const interval = setInterval(() => {
      if (isIdleModalOpen) return;
      const now = Date.now();
      const last = Number(localStorage.getItem(STORAGE_KEY)) || lastActivityRef.current;

      if (now - last >= IDLE_TIMEOUT_MS) {
        setModalReason("idle");
        setIsIdleModalOpen(true);
      }
    }, CHECK_INTERVAL_MS);

    // 4. Intercept 401 Unauthorized globally from any API call
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args);
        if (res.status === 401) {
          const url =
            typeof args[0] === "string"
              ? args[0]
              : (args[0] as Request)?.url || "";

          // Do not trigger on login/logout calls
          if (!url.includes("/api/auth/login") && !url.includes("/api/auth/logout")) {
            setModalReason("unauthorized");
            setIsIdleModalOpen(true);
          }
        }
        return res;
      } catch (err) {
        throw err;
      }
    };

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleEvent));
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
      window.fetch = origFetch;
    };
  }, [pathname, recordActivity, isIdleModalOpen]);

  if (!isIdleModalOpen || pathname === "/login") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
        {/* Icon Header */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 shadow-xs">
          <ClockAlert size={34} className="stroke-[2.2]" />
        </div>

        {/* Title & Simple Message */}
        <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
          {modalReason === "idle" ? "Sesi Berakhir (AFK)" : "Sesi Telah Berakhir"}
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          {modalReason === "idle"
            ? "Anda telah tidak aktif selama lebih dari 1 jam. Demi keamanan, silakan login kembali untuk melanjutkan aktivitas."
            : "Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan."}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleReLogin}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl bg-[#004a87] hover:bg-[#003d70] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
        >
          <LogOut size={16} />
          <span>Login Kembali</span>
        </button>
      </div>
    </div>
  );
}
