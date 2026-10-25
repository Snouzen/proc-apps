export type Role = "pusat" | "rm" | "sitearea" | "magang";

export interface SessionPayload {
  userId?: string;
  email: string;
  role: Role;
  regional?: string | null;
  siteArea?: string | null;
  exp: number;
  jti: string;
  sessionVersion?: number;
}

// [SECURITY] Production MUST throw if AUTH_SECRET is absent
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: AUTH_SECRET is not set in production.");
    }
    return "dev-secret-change-me";
  }
  return secret;
}

function toBase64UrlFromBytes(bytes: ArrayBuffer): string {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+/g, "");
}

async function hmacSHA256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64UrlFromBytes(signature);
}

export const VALID_ROLES = ["pusat", "rm", "sitearea", "magang"] as const;

export function canonicalizeRoleEdge(rawRole: unknown): Role | null {
  if (!rawRole || typeof rawRole !== "string") return null;
  const r = rawRole.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (r === "pusat") return "pusat";
  if (r === "rm") return "rm";
  if (r === "sitearea" || r === "picsite" || r === "site" || r === "spbdki") return "sitearea";
  if (r === "magang") return "magang";
  return null; // Reject unrecognized roles, DO NOT fallback to magang
}

export async function verifySessionEdge(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(getAuthSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(base),
    );
    if (!isValid) return null;
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      ),
    );
    const payload: SessionPayload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;

    const validRole = canonicalizeRoleEdge(payload.role);
    if (!validRole) return null; // Reject unrecognized role
    payload.role = validRole;

    // Strict JTI contract: must be a non-empty string
    if (!payload.jti || typeof payload.jti !== "string" || !payload.jti.trim()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
