import { useState, useCallback, useEffect, useMemo } from "react";
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
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    inProgressCount: 0,
    needAssignCount: 0,
    almostExpiredCount: 0,
    expiredCount: 0,
    completedCount: 0,
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
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/po/stats?${statsParams}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error("Gagal mengambil statistik PO");
      const s = json as any;
      setStats({
        totalCount: Number(s?.cAll) || 0,
        activeCount: Number(s?.cActive) || 0,
        inProgressCount: 0,
        needAssignCount: Number(s?.cAssign) || 0,
        almostExpiredCount: Number(s?.cAlmost) || 0,
        expiredCount: Number(s?.cExpired) || 0,
        completedCount: Number(s?.cCompleted) || 0,
      });
    } catch (err) {
      if ((err as any)?.name === "AbortError") return;
    } finally {
      setStatsLoading(false);
    }
  }, [statsParams]);

  useEffect(() => {
    if (!roleReady) return;
    let mounted = true;
    const controller = new AbortController();
    
    const run = () => {
      if (mounted) fetchStats(controller.signal);
    };
    
    if (typeof document !== "undefined" && !document.hasFocus()) {
      window.addEventListener("focus", run, { once: true });
      return () => {
        mounted = false;
        window.removeEventListener("focus", run);
        controller.abort();
      };
    }
    
    const timer = window.setTimeout(run, 100);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [roleReady, fetchStats]);

  return { stats, statsLoading, fetchStats };
}
