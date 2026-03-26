"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AutoRefreshContext = createContext<number>(0);

export function AutoRefreshProvider({
  children,
  intervalMs = 60000,
}: {
  children: React.ReactNode;
  intervalMs?: number;
}) {
  const [tick, setTick] = useState(0);
  const lastTickAtRef = useRef<number>(0);
  const safeIntervalMs = Math.max(30000, Number(intervalMs) || 0);

  useEffect(() => {
    if (!safeIntervalMs || safeIntervalMs <= 0) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastTickAtRef.current < 30000) return;
      lastTickAtRef.current = now;
      console.log("Auto-refresh tick triggered");
      setTick((t) => t + 1);
    }, safeIntervalMs);
    return () => window.clearInterval(id);
  }, [safeIntervalMs]);

  useEffect(() => {
    const trigger = () => {
      if (document.hidden || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastTickAtRef.current < 30000) return;
      lastTickAtRef.current = now;
      console.log("Auto-refresh tick triggered");
      setTick((t) => t + 1);
    };
    const onFocus = () => trigger();
    const onVis = () => {
      if (document.visibilityState === "visible") trigger();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const value = useMemo(() => tick, [tick]);

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  );
}

export function useAutoRefreshTick() {
  return useContext(AutoRefreshContext);
}
