"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AutoRefreshContext = createContext<number>(0);

export function AutoRefreshProvider({
  children,
  intervalMs = 60000,
}: {
  children: React.ReactNode;
  intervalMs?: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    const onVis = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
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

