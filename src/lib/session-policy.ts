// Server session and cookie lifetime: four hours from login, not an idle timer.
export const SESSION_TTL_SECONDS = 4 * 60 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
export const SESSION_CHANGE_KEY = "proc_session_change";
export const SESSION_CHANGE_EVENT = "proc-session-change";
export const SESSION_VERIFIED_EVENT = "proc-session-verified";
