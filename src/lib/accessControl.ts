import fs from "fs/promises";
import path from "path";
import { canonicalizeRole } from "@/lib/auth";
import { DEFAULT_ROLE_CONFIGS } from "@/app/access-control/constants/accessControlData";

import prisma from "@/lib/prisma";

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "role-permissions.json");

let memoryCachedConfig: Record<string, { enabledMenus: string[]; enabledActions: string[] }> | null = null;
let cachedVersion = 0;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10s memory cache for performance

/**
 * Shared structural schema validator for role permissions configuration.
 * Validates root object, each role entry, and that enabledMenus/enabledActions are string arrays.
 */
export function validatePermissionsStructure(
  parsed: any
): parsed is Record<string, { enabledMenus: string[]; enabledActions: string[] }> {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }

  for (const [roleKey, roleVal] of Object.entries(parsed)) {
    if (!roleVal || typeof roleVal !== "object" || Array.isArray(roleVal)) {
      return false;
    }
    const val = roleVal as any;
    if (!Array.isArray(val.enabledMenus) || !Array.isArray(val.enabledActions)) {
      return false;
    }
    if (!val.enabledMenus.every((m: any) => typeof m === "string")) {
      return false;
    }
    if (!val.enabledActions.every((a: any) => typeof a === "string")) {
      return false;
    }
  }

  return true;
}

/**
 * Read permissions config with version.
 * Prioritizes database audit log snapshot as source of truth, then falls back to file.
 */
/**
 * Read and validate the bootstrap configuration from file or default constants.
 * Used exclusively for bootstrap initialization when DB has no existing snapshot.
 */
export async function getValidatedBootstrapConfig(): Promise<Record<string, { enabledMenus: string[]; enabledActions: string[] }> | null> {
  let content: string;
  try {
    content = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
  } catch (err: any) {
    // Hanya fallback ke default jika file benar-benar tidak ada (ENOENT)
    if (err && err.code === "ENOENT") {
      if (validatePermissionsStructure(DEFAULT_ROLE_CONFIGS)) {
        return JSON.parse(JSON.stringify(DEFAULT_ROLE_CONFIGS));
      }
      return null;
    }
    // File system error selain ENOENT (EACCES, EPERM, dll) -> fail-closed!
    console.error("[AccessControl] Gagal membaca bootstrap file (fail-closed):", err?.message || err);
    return null;
  }

  // Jika file fisik ada, parse JSON dan validasi struktur:
  try {
    const parsed = JSON.parse(content);
    if (validatePermissionsStructure(parsed)) {
      return parsed;
    }
    console.error("[AccessControl] Bootstrap file failed structural validation (fail-closed)");
    return null;
  } catch (jsonErr: any) {
    // File ada tetapi JSON rusak / parse error -> FAIL-CLOSED! JANGAN fallback ke default!
    console.error("[AccessControl] Bootstrap file JSON rusak / parse error (fail-closed):", jsonErr?.message || jsonErr);
    return null;
  }
}

/**
 * Update in-memory cached config and version together.
 * MONOTONIC VERSION GUARD: Strictly rejects any downgrade of cachedVersion.
 * If incoming version is less than or equal to current cachedVersion, this update is discarded
 * and the current authoritative cached snapshot is returned.
 */
export function updateMemoryPermissionsCache(
  config: Record<string, { enabledMenus: string[]; enabledActions: string[] }> | null,
  version: number
): { config: Record<string, { enabledMenus: string[]; enabledActions: string[] }> | null; version: number } {
  // Cegah penulisan/pembacaan lama menurunkan versi cache yang sudah lebih baru!
  if (config && version <= cachedVersion && memoryCachedConfig !== null) {
    return { config: memoryCachedConfig, version: cachedVersion };
  }
  memoryCachedConfig = config;
  cachedVersion = version;
  lastCacheTime = Date.now();
  return { config: memoryCachedConfig, version: cachedVersion };
}

/**
 * Invalidate in-memory cache.
 */
export function invalidateMemoryPermissionsCache(): void {
  memoryCachedConfig = null;
  cachedVersion = 0;
  lastCacheTime = 0;
}

/**
 * Read permissions config with version.
 * Prioritizes database audit log snapshot as the authoritative source of truth.
 * - If DB query fails: strictly fails closed (returns null, 0); NEVER falls back to stale file.
 * - Only if DB query succeeds with 0 records (initial bootstrap condition): falls back to bootstrap file/default.
 */
export async function readPermissionsConfigWithVersion(): Promise<{
  config: Record<string, { enabledMenus: string[]; enabledActions: string[] }> | null;
  version: number;
}> {
  const now = Date.now();
  if (memoryCachedConfig && now - lastCacheTime < CACHE_TTL_MS) {
    return { config: memoryCachedConfig, version: cachedVersion };
  }

  // 1. Otoritas Utama: Database AuditLog
  let dbQueriedSuccessfully = false;
  let latestAudit: any = null;

  try {
    latestAudit = await prisma.auditLog.findFirst({
      where: {
        entity: "AccessControl",
        entityId: "role-permissions",
        action: { in: ["UPDATE", "RESET"] },
      },
      orderBy: { createdAt: "desc" },
    });
    dbQueriedSuccessfully = true;
  } catch (dbErr: any) {
    // Database error: JANGAN fallback ke file fisik lama yang bisa mengembalikan izin yang sudah dicabut!
    console.error("[AccessControl] DB query error (fail-closed, file fallback blocked):", dbErr?.message || dbErr);
    invalidateMemoryPermissionsCache();
    return { config: null, version: 0 };
  }

  // Jika snapshot DB ditemukan, DB adalah satu-satunya sumber kebenaran
  if (latestAudit) {
    const dbConfig = (latestAudit.newData as any)?.config;
    const dbVersion = ((latestAudit.newData as any)?.version as number) || 0;
    if (validatePermissionsStructure(dbConfig)) {
      if (dbConfig.rm && Array.isArray(dbConfig.rm.enabledActions)) {
        for (const act of ["po_create", "po_edit"]) {
          if (!dbConfig.rm.enabledActions.includes(act)) {
            dbConfig.rm.enabledActions.push(act);
          }
        }
      }
      return updateMemoryPermissionsCache(dbConfig, dbVersion);
    }
    // Snapshot di DB korup secara struktural -> fail-closed (jangan gunakan default!)
    console.error("[AccessControl] DB audit snapshot exists but failed schema validation (fail-closed)");
    invalidateMemoryPermissionsCache();
    return { config: null, version: dbVersion };
  }

  // 2. Kondisi Bootstrap: DB terhubung normal tapi BELUM PERNAH ada snapshot (tabel audit kosong)
  if (dbQueriedSuccessfully && !latestAudit) {
    const bootstrap = await getValidatedBootstrapConfig();
    if (bootstrap) {
      return updateMemoryPermissionsCache(bootstrap, 0);
    }
  }

  invalidateMemoryPermissionsCache();
  return { config: null, version: 0 };
}

/**
 * Read and validate the permissions config.
 * Strictly fails closed (returns null) on missing config, corruption, or structural schema invalidity.
 */
export async function readPermissionsConfig(): Promise<Record<string, { enabledMenus: string[]; enabledActions: string[] }> | null> {
  const { config } = await readPermissionsConfigWithVersion();
  return config;
}

/**
 * Separate initialization utility: only called explicitly during setup/startup,
 * never invoked implicitly during runtime permission evaluation.
 */
export async function ensurePermissionsConfigInitialized(): Promise<void> {
  try {
    await fs.access(CONFIG_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(DEFAULT_ROLE_CONFIGS, null, 2), "utf-8");
  }
}

let fileWritePromiseChain = Promise.resolve();
let latestWrittenFileVersion = 0;

/**
 * Serialized atomic file writer: writes to a unique temporary file and renames atomically.
 * Enforces monotonic file version ordering to prevent stale delayed writes from overwriting newer versions.
 * NOTE: Decoupled from authorization cache (cache is solely managed by DB snapshots).
 */
export async function writePermissionsConfig(data: Record<string, any>, version?: number): Promise<void> {
  // Validate structure with the exact same validator before writing
  if (!validatePermissionsStructure(data)) {
    throw new Error("[AccessControl] Konfigurasi permission tidak valid secara struktural (fail-closed)");
  }

  return new Promise<void>((resolve, reject) => {
    fileWritePromiseChain = fileWritePromiseChain
      .then(async () => {
        // Cegah penulisan file versi lama menimpa file yang sudah lebih baru
        if (version !== undefined && typeof version === "number") {
          if (version <= latestWrittenFileVersion) {
            return;
          }
        }

        await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
        const tempPath = `${CONFIG_FILE_PATH}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
        await fs.rename(tempPath, CONFIG_FILE_PATH);

        if (version !== undefined && typeof version === "number") {
          latestWrittenFileVersion = Math.max(latestWrittenFileVersion, version);
        }
      })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Check if a role is permitted to perform a given action.
 * Evaluates configured permissions for all roles; fails closed if config cannot be verified or role is invalid.
 */
export async function hasPermission(role: string, actionId: string): Promise<boolean> {
  const canonicalRole = canonicalizeRole(role);
  if (!canonicalRole) return false;
  // Deletion is a non-delegable Pusat capability across all CRUD modules.
  if (/(^|_)delete($|_)/.test(actionId) && canonicalRole !== "pusat") return false;

  try {
    const config = await readPermissionsConfig();
    if (!config) {
      console.warn(`[AccessControl] Permissions config unavailable or malformed, denying '${actionId}' for '${canonicalRole}' (fail-closed)`);
      return false;
    }

    const roleConfig = config[canonicalRole];
    if (roleConfig && Array.isArray(roleConfig.enabledActions)) {
      return roleConfig.enabledActions.includes(actionId);
    }

    // Fail-closed if role is not configured in the permissions file
    console.warn(`[AccessControl] Role '${canonicalRole}' is not configured in permissions config (fail-closed)`);
    return false;
  } catch (e) {
    console.error("[AccessControl] Error checking permission (fail-closed):", e);
    return false;
  }
}
