import { useState, useCallback, useEffect } from "react";
import { getMe } from "@/lib/me";

export type RoleType = "pusat" | "rm" | "sitearea" | null;

export function useAuthData() {
  const [role, setRole] = useState<RoleType>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [siteArea, setSiteArea] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    setAuthLoading(true);
    try {
      const me = await getMe();
      setRole(me?.role as RoleType);
      setRegional(me?.regional || null);
      setSiteArea((me as any)?.siteArea || null);
      setRoleReady(true);
    } catch {
      setRole("pusat");
      setRegional(null);
      setSiteArea(null);
      setRoleReady(true);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (!mounted) return;
      fetchMe();
    };
    
    // Defer execution if document is not focused
    if (typeof document !== "undefined" && !document.hasFocus()) {
      window.addEventListener("focus", run, { once: true });
      return () => {
        mounted = false;
        window.removeEventListener("focus", run);
      };
    }
    
    run();
    return () => {
      mounted = false;
    };
  }, [fetchMe]);

  return { role, regional, siteArea, roleReady, authLoading, fetchMe };
}
