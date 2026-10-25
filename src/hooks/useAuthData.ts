import { useState, useCallback, useEffect } from "react";
import { getMe, getMeSync } from "@/lib/me";

export type RoleType = "pusat" | "rm" | "sitearea" | "magang" | null;

export function useAuthData() {
  const [role, setRole] = useState<RoleType>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [siteArea, setSiteArea] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchMe = useCallback(async (force = false) => {
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
      const me = await getMe(force);
      setRole(me?.authenticated ? (me.role as RoleType) : null);
      setRegional(me?.regional || null);
      setSiteArea((me as any)?.siteArea || null);
      setEmail(me?.email || null);
      setRoleReady(true);
    } catch {
      setRole(null);
      setRegional(null);
      setSiteArea(null);
      setEmail(null);
      setRoleReady(true);
    } finally {
      setAuthLoading(false);
    }
  }, []);

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
    };
  }, [fetchMe]);

  return { role, regional, siteArea, email, roleReady, authLoading, fetchMe };
}
