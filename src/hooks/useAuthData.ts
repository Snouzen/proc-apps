import { useState, useCallback, useEffect, useRef } from "react";
import { withReadDeadline } from "@/lib/readDeadline";
import { getMe, getMeSync } from "@/lib/me";

export type RoleType = "pusat" | "rm" | "sitearea" | "magang" | null;

export function useAuthData({ loadingDeadline = false }: { loadingDeadline?: boolean } = {}) {
  const [role, setRole] = useState<RoleType>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [siteArea, setSiteArea] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const requestId = useRef(0);
  const invalidateRequests = useCallback(() => { requestId.current++; }, []);

  const fetchMe = useCallback(async (force = false) => {
    const id = ++requestId.current;
    setAuthError(null);
    const syncMe = !force ? getMeSync() : null;
    if (syncMe) {
      setRole(syncMe.authenticated ? (syncMe.role as RoleType) : null);
      setRegional(syncMe.regional || null);
      setSiteArea((syncMe as any)?.siteArea || null);
      setEmail(syncMe.email || null);
      setRoleReady(true);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      const me = await (loadingDeadline ? withReadDeadline(getMe(force)) : getMe(force));
      if (id !== requestId.current) return;
      setRole(me?.authenticated ? (me.role as RoleType) : null);
      setRegional(me?.regional || null);
      setSiteArea((me as any)?.siteArea || null);
      setEmail(me?.email || null);
      setRoleReady(true);
    } catch (error) {
      if (id !== requestId.current) return;
      setRole(null);
      setRegional(null);
      setSiteArea(null);
      setEmail(null);
      setRoleReady(!loadingDeadline);
      setAuthError(error instanceof Error ? error.message : "Gagal memuat sesi");
    } finally {
      if (id === requestId.current) setAuthLoading(false);
    }
  }, [loadingDeadline]);

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (!mounted) return;
      fetchMe(false);
    };

    // Auth must load even while DevTools or another tab has focus.
    run();
    return () => {
      mounted = false;
      invalidateRequests();
    };
  }, [fetchMe, invalidateRequests]);

  return { role, regional, siteArea, email, roleReady, authLoading, authError, fetchMe };
}
