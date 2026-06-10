import { useState, useCallback, useRef, useEffect } from "react";

export function useGlobalSearch() {
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<any[] | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  
  const globalCtrlRef = useRef<AbortController | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(e.target as Node)) {
        setGlobalResults(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleGlobalSearch = useCallback((value: string) => {
    setGlobalQuery(value);
    if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
    if (globalCtrlRef.current) globalCtrlRef.current.abort();

    const q = value.trim();
    if (q.length < 2) {
      setGlobalResults(null);
      setGlobalLoading(false);
      return;
    }

    setGlobalLoading(true);
    globalTimerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      globalCtrlRef.current = ctrl;
      try {
        const url = `/api/po?q=${encodeURIComponent(q)}&summary=true&limit=15`;
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.data || [];
        setGlobalResults(list);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error(e);
          setGlobalResults([]);
        }
      } finally {
        setGlobalLoading(false);
      }
    }, 400);
  }, []);

  const closeGlobalSearch = useCallback(() => {
    setGlobalResults(null);
    setGlobalQuery("");
  }, []);

  return {
    globalQuery,
    setGlobalQuery,
    globalResults,
    setGlobalResults,
    globalLoading,
    globalSearchRef,
    handleGlobalSearch,
    closeGlobalSearch,
  };
}
