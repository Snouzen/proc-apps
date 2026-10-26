// One policy for signed sessions, cookies and the browser idle gate (four hours).
export const SESSION_TTL_SECONDS = 4 * 60 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
export const SESSION_CHANGE_KEY = "proc_session_change";
export const SESSION_CHANGE_EVENT = "proc-session-change";
export const SESSION_GATE_EVENT = "proc-session-gate";
export const SESSION_VERIFIED_EVENT = "proc-session-verified";
export const ACTIVITY_KEY = "proc_last_activity_time";
export type SessionSnapshot = {
  authenticated: boolean; userId?: string; email?: string; role?: string;
  regional?: string | null; siteArea?: string | null; expiresAt?: number;
  sessionRevision?: string; permissionsHash?: string;
};
export type GateReason = "active" | "checking" | "expired" | "idle" | "logout" | "changed" | "unavailable";
const normalized = (value?: string | null) => (value || "").trim().toLowerCase();
export function sameSessionOwner(a: SessionSnapshot, b: SessionSnapshot) {
  return Boolean(a.email && b.email) && normalized(a.email) === normalized(b.email)
    && (!a.userId || a.userId === b.userId);
}
export function sameSessionAccess(a: SessionSnapshot, b: SessionSnapshot) {
  return a.role === b.role && normalized(a.regional) === normalized(b.regional)
    && normalized(a.siteArea) === normalized(b.siteArea)
    && (!a.permissionsHash || a.permissionsHash === b.permissionsHash);
}
// Broadcasts are hints only: only a server snapshot can unlock the preserved form.
export class SessionRecovery {
  baseline: SessionSnapshot | null;
  reason: GateReason = "active";
  epoch = 0;
  private requireNewRevision = false;
  constructor(baseline: SessionSnapshot | null = null) {
    this.baseline = baseline?.authenticated ? baseline : null;
  }
  lock(reason: GateReason) {
    this.epoch++;
    this.reason = reason;
    if (reason === "idle" || reason === "logout") this.requireNewRevision = true;
  }
  observe(next: SessionSnapshot): boolean {
    if (!next.authenticated) { this.reason = "expired"; return false; }
    if (this.requireNewRevision && (!this.baseline?.sessionRevision || next.sessionRevision === this.baseline.sessionRevision)) {
      if (!this.baseline?.sessionRevision) this.baseline = next;
      this.reason = "idle"; return false;
    }
    if (this.baseline?.sessionRevision !== next.sessionRevision) this.epoch++;
    this.baseline = next;
    this.requireNewRevision = false;
    this.reason = "active";
    return true;
  }
}
