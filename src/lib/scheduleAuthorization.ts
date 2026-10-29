import { canonicalizeRole } from "@/lib/auth";
import { readPermissionsConfigWithVersion } from "@/lib/accessControl";

/** Diagnose a Schedule permission denial without bypassing ownership or stored permissions. */
export async function checkSchedulePermission(role: string, actions: string[]) {
  const canonicalRole = canonicalizeRole(role);
  if (!canonicalRole) return { allowed: false, status: 403, code: "SCHEDULE_ROLE_INVALID" };
  const { config, failure } = await readPermissionsConfigWithVersion({ retryTransient: true });
  if (!config) return {
    allowed: false, status: 503,
    code: failure === "CONFIG_INVALID" ? "PERMISSIONS_CONFIG_INVALID" : "PERMISSIONS_UNAVAILABLE",
  };
  const entry = config[canonicalRole];
  if (!entry) return { allowed: false, status: 503, code: "PERMISSIONS_ROLE_UNCONFIGURED" };
  return entry.enabledActions.some(action => actions.includes(action))
    ? { allowed: true, status: 200, code: "OK" }
    : { allowed: false, status: 403, code: "SCHEDULE_PERMISSION_DENIED" };
}
