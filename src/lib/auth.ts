import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type Role = "pusat" | "rm" | "spb_dki" | "sitearea";

export interface SessionPayload {
  email: string;
  role: Role;
  regional?: string | null;
  siteArea?: string | null;
  exp: number;
  jti: string;
}

// [SECURITY] Production MUST have AUTH_SECRET set; dev gets insecure default with warning
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: AUTH_SECRET is not set in production.");
    }
    console.warn("WARNING: AUTH_SECRET is not set. Using insecure dev default.");
    return "dev-secret-change-me";
  }
  return secret;
}

// [SECURITY] No default credentials — env-only
function getExpectedCredentials(): { email?: string; password?: string } {
  return {
    email: process.env.AUTH_EMAIL,
    password: process.env.AUTH_PASSWORD,
  };
}

// [SECURITY] Session TTL from env, default 7 days
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 7 * 24 * 60 * 60 * 1000;

export function authenticate(
  email: string,
  password: string,
): { ok: true; payload: SessionPayload } | { ok: false } {
  // Normalize email
  let lower = email.toLowerCase().trim();
  if (!lower.includes("@")) {
    lower = `${lower}@bulog.co.id`;
  }

  // [SECURITY] Password MUST come from env, never hardcoded in source
  const SUPER_PASS = process.env.AUTH_SUPER_PASSWORD;

  const map: Record<
    string,
    { role: Role; regional: string | null; siteArea?: string | null }
  > = {
    "gmi_27001@bulog.co.id": { role: "pusat", regional: null },
    "rmi_27001@bulog.co.id": { role: "rm", regional: "Regional 1 Bandung" },
    "rmii_27001@bulog.co.id": { role: "rm", regional: "Regional 2 Surabaya" },
    "rmiii_27001@bulog.co.id": { role: "rm", regional: "Regional 3 Makassar" },
    "spbdki@bulog.co.id": {
      role: "spb_dki",
      regional: "Regional 1 Bandung",
      siteArea: "SPB DKI",
    },
  };

  const entry = map[lower];
  // [SECURITY] Only allow mapped-user login if SUPER_PASS is set in env
  if (entry && SUPER_PASS && password === SUPER_PASS) {
    return {
      ok: true,
      payload: {
        email: lower,
        role: entry.role,
        regional: entry.regional,
        siteArea: entry.siteArea,
        exp: Date.now() + SESSION_TTL_MS,
        jti: randomBytes(8).toString("hex"),
      },
    };
  }

  // Fallback: env administrative credentials
  const expected = getExpectedCredentials();
  if (
    expected.email &&
    expected.password &&
    lower === expected.email.toLowerCase() &&
    password === expected.password
  ) {
    return {
      ok: true,
      payload: {
        email: lower,
        role: "pusat",
        regional: null,
        exp: Date.now() + SESSION_TTL_MS,
        jti: randomBytes(8).toString("hex"),
      },
    };
  }
  return { ok: false };
}

export function signSession(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(base).digest("base64url");
  return `${base}.${sig}`;
}

// [SECURITY] Use timingSafeEqual to prevent timing-based signature attacks
export function verifySession(
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;
  const secret = getAuthSecret();
  const expectedSig = createHmac("sha256", secret)
    .update(base)
    .digest("base64url");
  // timingSafeEqual requires same-length buffers
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(base, "base64url").toString("utf8"),
    );
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Edge-runtime compatible helpers using Web Crypto API
function toBase64UrlFromBytes(bytes: ArrayBuffer): string {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+/g, "");
}

async function hmacSHA256Edge(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64UrlFromBytes(signature);
}

export async function verifySessionEdge(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;
  try {
    const expected = await hmacSHA256Edge(getAuthSecret(), base);
    if (sig !== expected) return null;
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      ),
    );
    const payload: SessionPayload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
