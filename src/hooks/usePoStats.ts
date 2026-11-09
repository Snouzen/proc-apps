import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { withReadDeadline } from "@/lib/readDeadline";
import { RoleType } from "./useAuthData";

interface PoStatsProps {
  roleReady: boolean;
  role: RoleType;
  regional: string | null;
  siteArea: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function usePoStats({ roleReady, role, regional, siteArea, dateFrom, dateTo }: PoStatsProps) {
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const activeRequest = useRef<{ id: number; controller?: AbortController }>({ id: 0 });
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    inProgressCount: 0,
    needAssignCount: 0,
    almostExpiredCount: 0,
    expiredCount: 0,
    completedCount: 0,
    topSiteAreas: [] as {name: string, po: number}[],
  });

  const statsParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("includeUnknown", "true");
    if ((role === "rm" || role === "sitearea") && regional) {
      params.set("regional", regional);
    }
    if (role === "sitearea" && siteArea) {
      params.set("siteArea", siteArea);
    }
    if (dateFrom) params.set("tglFrom", dateFrom);
    if (dateTo) params.set("tglTo", dateTo);
    return params.toString();
  }, [role, regional, siteArea, dateFrom, dateTo]);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    activeRequest.current.controller?.abort();
    const controller = new AbortController();
    const id = activeRequest.current.id + 1;
    activeRequest.current = { id, controller };
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) controller.abort();
    setStatsLoading(true);
    setStatsError(null);
    try {
      const json = await withReadDeadline((async () => {
        const res = await fetch(`/api/po/stats?${statsParams}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) throw new Error("Gagal mengambil statistik PO");
        return json;
      })());
      if (id !== activeRequest.current.id || controller.signal.aborted) return;
      const s = json as any;
      setStats({
        totalCount: Number(s?.cAll) || 0,
        activeCount: Number(s?.cActive) || 0,
        inProgressCount: 0,
        needAssignCount: Number(s?.cAssign) || 0,
        almostExpiredCount: Number(s?.cAlmost) || 0,
        expiredCount: Number(s?.cExpired) || 0,
        completedCount: Number(s?.cCompleted) || 0,
        topSiteAreas: Array.isArray(s?.topSiteAreas) ? s.topSiteAreas : [],
      });
    } catch (err) {
      if (id !== activeRequest.current.id || controller.signal.aborted) return;
      setStatsError(err instanceof Error ? err.message : "Gagal mengambil statistik PO");
      controller.abort();
    } finally {
      signal?.removeEventListener("abort", cancel);
      if (id === activeRequest.current.id && !signal?.aborted) setStatsLoading(false);
    }
  }, [statsParams]);

  useEffect(() => {
    if (!roleReady) return;
    let mounted = true;
    const controller = new AbortController();
    
    const run = () => {
      if (mounted) fetchStats(controller.signal);
    };
    
    run();
    return () => {
      mounted = false;
      controller.abort();
      activeRequest.current.controller?.abort();
    };
  }, [roleReady, fetchStats]);

  return { stats, statsLoading, statsError, fetchStats };
}
