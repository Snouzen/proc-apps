"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getMe, getMeSync } from "@/lib/me";
import { SESSION_CHANGE_EVENT, SESSION_VERIFIED_EVENT } from "@/lib/session-policy";

// Passive profile sync only. Authentication/expiry is enforced by server cookies.
export default function SessionSync() {
  const isLogin = usePathname() === "/login";
  useEffect(() => {
    if (isLogin) return;
    let alive = true, request = 0, lastCheck = 0;
    let previous = getMeSync();
    const sync = async () => {
      const currentRequest = ++request;
      lastCheck = Date.now();
      try {
        const next = await getMe(true);
        if (!alive || request !== currentRequest) return;
        // A different account/scope must receive its own page data. Same-account
        // login leaves every mounted form intact and needs no verification dialog.
        if (next.authenticated && previous?.authenticated && (
          previous.email !== next.email || previous.role !== next.role ||
          previous.regional !== next.regional || previous.siteArea !== next.siteArea
        )) {
          window.location.reload();
          return;
        }
        if (next.authenticated) previous = next;
        window.dispatchEvent(new CustomEvent(SESSION_VERIFIED_EVENT, { detail: next }));
      } catch {
        // Network/service failures do not trigger login prompts or discard work.
      }
    };
    const onChange = () => { void sync(); };
    const onFocus = () => {
      if (!document.hidden && Date.now() - lastCheck >= 30000) void sync();
    };
    window.addEventListener(SESSION_CHANGE_EVENT, onChange);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    void sync();
    return () => {
      alive = false; request++;
      window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [isLogin]);
  return null;
}
