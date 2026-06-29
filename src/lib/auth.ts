import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";


export type Role = "pusat" | "rm" | "sitearea" | "magang";

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
    console.warn(
      "WARNING: AUTH_SECRET is not set. Using insecure dev default.",
    );
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

// [SECURITY] Session TTL from env, default 1 hour
const SESSION_TTL_MS =
  Number(process.env.SESSION_TTL_MS) || 1 * 60 * 60 * 1000;




export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; payload: SessionPayload } | { ok: false }> {
  // Normalize email
  let lower = email.toLowerCase().trim();
  if (!lower.includes("@")) {
    lower = `${lower}@bulog.co.id`;
  }

  // 1. Database User Query
  try {
    const dbUser = await prisma.user.findFirst({ where: { email: lower } });

    if (dbUser) {
      const storedPw = (dbUser as any).password;
      if (storedPw) {
        // Support both bcrypt-hashed and legacy plaintext passwords
        const isHashed = storedPw.startsWith("$2");
        const match = isHashed
          ? await bcrypt.compare(password, storedPw)
          : (() => {
              // Constant-time comparison for plaintext passwords
              const a = Buffer.from(password);
              const b = Buffer.from(storedPw);
              return a.length === b.length && timingSafeEqual(a, b);
            })();

        if (match) {
          // Auto-upgrade: hash plaintext password on successful login
          if (!isHashed) {
            const hashed = await bcrypt.hash(password, 12);
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { password: hashed } as any,
            }).catch(() => {}); // non-fatal
          }

          return {
            ok: true,
            payload: {
              email: lower,
              role: dbUser.role as Role,
              regional: dbUser.regional,
              siteArea: dbUser.siteArea,
              exp: Date.now() + SESSION_TTL_MS,
              jti: randomBytes(8).toString("hex"),
            },
          };
        }
      }
    }
  } catch (err) {
    console.error("🚨 [AUTH ERROR] Prisma gagal nge-query:", err);
  }

  // Fallback: env administrative credentials
  const expected = getExpectedCredentials();
  if (
    expected.email &&
    expected.password &&
    lower === expected.email.toLowerCase() &&
    (() => {
      const a = Buffer.from(password);
      const b = Buffer.from(expected.password!);
      return a.length === b.length && timingSafeEqual(a, b);
    })()
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
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
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

// ────────────────────────────────────────────
// Shared API Route Helpers
// ────────────────────────────────────────────

/**
 * Extract and verify session from request cookies.
 * Use this in API routes instead of copy-pasting the cookie extraction logic.
 */
export async function getSession(request: Request): Promise<SessionPayload | null> {
  // Try Next.js cookies() first, then fallback to raw header parsing
  let token: string | undefined;
  try {
    const { cookies } = await import("next/headers");
    const bag = await cookies();
    token = bag.get("session")?.value;
  } catch {
    // cookies() may fail outside of Server Component/Route context
  }

  // Fallback: parse cookie from raw headers
  if (!token) {
    const hdr = request.headers.get("cookie") || "";
    const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
    if (m && m[1]) token = decodeURIComponent(m[1]);
  }

  return verifySession(token);
}

/**
 * Get session + resolve user role from database.
 * Returns { session, role, email, dbUser } or null if unauthorized.
 */
export async function getSessionWithRole(request: Request): Promise<{
  session: SessionPayload;
  role: string;
  email: string;
  dbUser: any;
} | null> {
  const session = await getSession(request);
  if (!session) return null;

  const email = String(
    session.email || (session as any)?.user?.email || ""
  ).toLowerCase().trim();

  let dbUser = null;
  if (email) {
    dbUser = await prisma.user.findFirst({ where: { email } });
  }

  const rawRole = dbUser?.role || session.role || "";
  const role = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");

  return { session, role, email, dbUser };
}

export function getProfileName(session: SessionPayload | any, dbUser?: any): string {
  if (!session && !dbUser) return "System";
  const role = String(dbUser?.role || session?.role || "").toLowerCase();
  const email = String(dbUser?.email || session?.email || "");
  const regional = String(dbUser?.regional || session?.regional || "");

  if (role === "magang") return "ADMIN SALES 1";
  if (role === "sitearea" || role.includes("site")) {
    return email ? email.split("@")[0].toUpperCase() : "ADMIN CABANG";
  }
  if (role === "rm") {
    return regional ? regional.toUpperCase() : "REGIONAL MANAGER";
  }
  if (role === "pusat") return "ADMIN PUSAT";
  return email ? email.split("@")[0].toUpperCase() : "UNKNOWN";
}
