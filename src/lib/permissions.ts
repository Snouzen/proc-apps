"use client";

import { applyCreditLimitAccessRules } from "@/lib/roleAccessPolicy";
import { useState, useEffect } from "react";
import { DEFAULT_ROLE_CONFIGS } from "@/app/access-control/constants/accessControlData";

export type RolePermissionsMap = Record<
  string,
  {
    enabledMenus: string[];
    enabledActions: string[];
  }
>;

export const PERMISSIONS_STORAGE_KEY = "proc_role_permissions_v1";
export const PERMISSIONS_UPDATED_EVENT = "proc-permissions-updated";

/**
 * Get cached permissions from localStorage, fallback to DEFAULT_ROLE_CONFIGS
 */
export function getStoredPermissions(): RolePermissionsMap {
  if (typeof window === "undefined") {
    return applyCreditLimitAccessRules(DEFAULT_ROLE_CONFIGS);
  }
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return applyCreditLimitAccessRules(DEFAULT_ROLE_CONFIGS);
    const parsed = JSON.parse(raw);
    const merged: RolePermissionsMap = { ...DEFAULT_ROLE_CONFIGS, ...parsed };
    if (merged.sitearea) {
      const menus = Array.isArray(merged.sitearea.enabledMenus) ? [...merged.sitearea.enabledMenus] : [];
      if (!menus.includes("retur")) menus.push("retur");
      const actions = Array.isArray(merged.sitearea.enabledActions) ? [...merged.sitearea.enabledActions] : [];
      for (const act of ["retur_view", "retur_create", "retur_edit", "retur_export"]) {
        if (!actions.includes(act)) actions.push(act);
      }
      merged.sitearea = { enabledMenus: menus, enabledActions: actions };
    }
    return applyCreditLimitAccessRules(merged);
  } catch {
    return applyCreditLimitAccessRules(DEFAULT_ROLE_CONFIGS);
  }
}

/**
 * Save permissions to localStorage and broadcast live event to other components
 */
export function saveStoredPermissions(map: RolePermissionsMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(map));
    setTimeout(() => {
      window.dispatchEvent(new Event(PERMISSIONS_UPDATED_EVENT));
    }, 0);
  } catch {}
}

/**
 * Fetch latest permissions from /api/access-control and update localStorage
 */
export const PERMISSIONS_VERSION_STORAGE_KEY = "proc_role_permissions_version";

/**
 * Get cached permissions version from localStorage
 */
export function getStoredPermissionsVersion(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(PERMISSIONS_VERSION_STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Save permissions version to localStorage
 */
export function saveStoredPermissionsVersion(version: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERMISSIONS_VERSION_STORAGE_KEY, String(version));
  } catch {}
}

/**
 * Fetch latest permissions and version from /api/access-control and update localStorage
 */
export async function fetchPermissionsWithVersionFromServer(): Promise<{ map: RolePermissionsMap; version: number }> {
  try {
    const res = await fetch("/api/access-control", { cache: "no-store" });
    if (!res.ok) return { map: getStoredPermissions(), version: getStoredPermissionsVersion() };
    const json = await res.json();
    if (json.ok && json.data) {
      saveStoredPermissions(json.data);
      const v = typeof json.version === "number" ? json.version : 0;
      saveStoredPermissionsVersion(v);
      return { map: json.data, version: v };
    }
  } catch {}
  return { map: getStoredPermissions(), version: getStoredPermissionsVersion() };
}

/**
 * Fetch latest permissions from /api/access-control and update localStorage
 */
export async function fetchPermissionsFromServer(): Promise<RolePermissionsMap> {
  const { map } = await fetchPermissionsWithVersionFromServer();
  return map;
}

/**
 * Save a single role's permissions to server with optimistic concurrency version control
 */
export async function saveRolePermissionsToServer(
  roleCode: string,
  config: { enabledMenus: string[]; enabledActions: string[] },
  expectedVersion?: number
): Promise<{ ok: boolean; data: RolePermissionsMap; version: number; error?: string }> {
  const current = getStoredPermissions();
  const versionToSend = typeof expectedVersion === "number" ? expectedVersion : getStoredPermissionsVersion();
  const updated: RolePermissionsMap = {
    ...current,
    [roleCode]: config,
  };

  try {
    const res = await fetch("/api/access-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleCode, config, expectedVersion: versionToSend }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok && json.data) {
      saveStoredPermissions(json.data);
      const newV = typeof json.version === "number" ? json.version : versionToSend + 1;
      saveStoredPermissionsVersion(newV);
      return { ok: true, data: json.data, version: newV };
    }
    const errMsg = json.error || `HTTP ${res.status}`;
    return { ok: false, data: current, version: versionToSend, error: errMsg };
  } catch (e: any) {
    console.error("Failed to save permissions to server:", e);
    return { ok: false, data: current, version: versionToSend, error: e?.message || "Network error" };
  }
}

/**
 * Reset a role's permissions on server with optimistic concurrency version control
 */
export async function resetRolePermissionsOnServer(
  roleCode: string,
  expectedVersion?: number
): Promise<{ ok: boolean; data: RolePermissionsMap; version: number; error?: string }> {
  const current = getStoredPermissions();
  const versionToSend = typeof expectedVersion === "number" ? expectedVersion : getStoredPermissionsVersion();

  try {
    const res = await fetch("/api/access-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", roleCode, expectedVersion: versionToSend }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok && json.data) {
      saveStoredPermissions(json.data);
      const newV = typeof json.version === "number" ? json.version : versionToSend + 1;
      saveStoredPermissionsVersion(newV);
      return { ok: true, data: json.data, version: newV };
    }
    const errMsg = json.error || `HTTP ${res.status}`;
    return { ok: false, data: current, version: versionToSend, error: errMsg };
  } catch (e: any) {
    console.error("Failed to reset permissions on server:", e);
    return { ok: false, data: current, version: versionToSend, error: e?.message || "Network error" };
  }
}

/**
 * Check if a menu is permitted for a role
 */
export function isMenuAllowedForRole(
  role: string | null | undefined,
  menuId: string,
  customMap?: RolePermissionsMap
): boolean {
  if (!role) return false;
  const normalizedRole = role === "spb_dki" ? "sitearea" : role;
  if (menuId === "credit_limit_approval" && normalizedRole !== "pusat") return false;
  const map = applyCreditLimitAccessRules(customMap || getStoredPermissions());
  const roleConfig = map[normalizedRole] || DEFAULT_ROLE_CONFIGS[normalizedRole] || DEFAULT_ROLE_CONFIGS.pusat;
  return roleConfig?.enabledMenus?.includes(menuId) ?? true;
}

/**
 * React hook for consuming dynamic permissions with real-time reactive updates
 */
export function usePermissions(currentRole?: string | null) {
  const [permissions, setPermissions] = useState<RolePermissionsMap>(DEFAULT_ROLE_CONFIGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 1. Immediately hydrate with cached localStorage permissions after mount
    setPermissions(getStoredPermissions());

    // 2. Sync from server on mount
    fetchPermissionsFromServer().then((data) => {
      setPermissions(data);
      setLoaded(true);
    });

    // 2. Listen for real-time updates from other parts of the app
    const handleUpdate = () => {
      setTimeout(() => {
        setPermissions(getStoredPermissions());
      }, 0);
    };

    window.addEventListener(PERMISSIONS_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PERMISSIONS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const normalizedRole = currentRole === "spb_dki" ? "sitearea" : currentRole || "pusat";
  const effectivePermissions = applyCreditLimitAccessRules(permissions);
  const roleConfig = effectivePermissions[normalizedRole] || DEFAULT_ROLE_CONFIGS[normalizedRole] || DEFAULT_ROLE_CONFIGS.pusat;

  const isMenuAllowed = (menuId: string): boolean => {
    if (!currentRole) return false;
    if (menuId === "credit_limit_approval" && normalizedRole !== "pusat") return false;
    return roleConfig?.enabledMenus?.includes(menuId) ?? false;
  };

  const isActionAllowed = (actionId: string): boolean => {
    if (!currentRole) return false;
    if (/^cl_(appr_|batch_)/.test(actionId) && normalizedRole !== "pusat") return false;
    if (/(^|_)delete($|_)/.test(actionId) && normalizedRole !== "pusat") return false;
    return roleConfig?.enabledActions?.includes(actionId) ?? false;
  };

  return {
    permissions,
    loaded,
    isMenuAllowed,
    isActionAllowed,
    roleConfig,
  };
}
