import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";


export type Role = "pusat" | "rm" | "sitearea" | "magang";

export function canonicalizeRole(rawRole: string | null | undefined): Role | null {
  if (!rawRole) return null;
  const r = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (r === "pusat") return "pusat";
  if (r === "rm") return "rm";
  if (r === "sitearea" || r === "picsite" || r === "site" || r === "spbdki") return "sitearea";
  if (r === "magang") return "magang";
  return null; // Reject unrecognized role, do not fallback to magang
}

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
  client: any = prisma,
): Promise<{ ok: true; payload: SessionPayload } | { ok: false }> {
  // Normalize email
  let lower = email.toLowerCase().trim();
  if (!lower.includes("@")) {
    lower = `${lower}@bulog.co.id`;
  }

  // 1. Database User Query
  try {
    const dbUser = await client.user.findFirst({ where: { email: lower } });

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
          let updatedAt = dbUser.updatedAt;
          if (!isHashed) {
            const hashed = await bcrypt.hash(password, 12);
            const updated = await client.user.update({
              where: { id: dbUser.id },
              data: { password: hashed } as any,
            }).catch(() => null);
            if (updated?.updatedAt) {
              updatedAt = updated.updatedAt;
            }
          }

          const userRole = canonicalizeRole(dbUser.role);
          if (!userRole) {
            return { ok: false };
          }

          return {
            ok: true,
            payload: {
              userId: dbUser.id,
              email: lower,
              role: userRole,
              regional: dbUser.regional,
              siteArea: dbUser.siteArea,
              exp: Date.now() + SESSION_TTL_MS,
              jti: randomBytes(8).toString("hex"),
              sessionVersion: updatedAt ? updatedAt.getTime() : 0,
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
        userId: "env-superadmin",
        email: lower,
        role: "pusat",
        regional: null,
        siteArea: null,
        exp: Date.now() + SESSION_TTL_MS,
        jti: randomBytes(8).toString("hex"),
        sessionVersion: 1,
      },
    };
  }
  return { ok: false };
}

export class AuthServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export function isEnvAdmin(
  payload: { email?: string; role?: string; userId?: string } | null | undefined,
): boolean {
  if (!payload || !payload.email) return false;
  const expected = getExpectedCredentials();
  if (!expected.email || !expected.password) return false;
  const emailMatch =
    payload.email.toLowerCase().trim() === expected.email.toLowerCase().trim();
  const roleMatch = payload.role === "pusat";
  const userMatch = payload.userId === "env-superadmin" || !payload.userId;
  return emailMatch && roleMatch && userMatch;
}

export function signSession(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(base).digest("base64url");
  return `${base}.${sig}`;
}

/**
 * Verify cryptographic signature of a session token and validate structure & JTI.
 * @param ignoreExpiry If true, allows payload extraction for logout revocation even if expired.
 */
export function verifySessionSignature(
  token: string | undefined,
  ignoreExpiry = false,
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
    if (!ignoreExpiry && payload.exp < Date.now()) return null;
    const validRole = canonicalizeRole(payload.role);
    if (!validRole) return null;
    payload.role = validRole;

    // Strict JTI contract: every session must have a non-empty string JTI
    if (!payload.jti || typeof payload.jti !== "string" || !payload.jti.trim()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// [SECURITY] Use timingSafeEqual to prevent timing-based signature attacks
export function verifySession(
  token: string | undefined,
): SessionPayload | null {
  return verifySessionSignature(token, false);
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
    const validRole = canonicalizeRole(payload.role);
    if (!validRole) return null;
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

// ────────────────────────────────────────────
// Session Revocation & Versioning
// ───────────────────────────────────────────

const revokedTokensCache = new Map<string, number>(); // jti -> expiresAt ms
const activeSessionsCache = new Map<string, { result: AuthSessionResult; expiresAt: number }>();
const activeSessionInFlight = new Map<string, Promise<AuthSessionResult | null>>();
const ACTIVE_SESSION_CACHE_TTL_MS = 5_000; // 5 seconds deduplication/cache window for parallel page API requests

export function invalidateActiveSessionCache(jtiOrEmail?: string) {
  if (!jtiOrEmail) {
    activeSessionsCache.clear();
    activeSessionInFlight.clear();
    return;
  }
  const key = jtiOrEmail.trim();
  activeSessionsCache.delete(key);
  activeSessionInFlight.delete(key);
  const lower = key.toLowerCase();
  for (const [k, v] of activeSessionsCache.entries()) {
    if (v.result.email.toLowerCase() === lower || v.result.session.userId === key) {
      activeSessionsCache.delete(k);
    }
  }
}

export async function revokeSession(
  jti: string,
  email?: string,
  role?: string,
  client: any = prisma,
): Promise<void> {
  if (!jti || typeof jti !== "string" || !jti.trim()) {
    throw new Error("Invalid JTI for revocation");
  }
  const cleanJti = jti.trim();
  const lockKey = `revoke:${cleanJti}`;

  const runWithLock = async (tx: any) => {
    // 1. Transaction advisory lock serializes parallel revocation for this exact JTI
    if (typeof tx.$executeRaw === "function") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    }

    // 2. Idempotency check: see if already persisted in database
    const existing = await tx.auditLog.findFirst({
      where: {
        entity: "RevokedSession",
        entityId: cleanJti,
        action: "REVOKE",
      },
      select: { id: true },
    });

    if (!existing) {
      await tx.auditLog.create({
        data: {
          entity: "RevokedSession",
          entityId: cleanJti,
          action: "REVOKE",
          newData: { email: email || null, revokedAt: new Date().toISOString() },
          userId: email || "system",
          userName: email || "system",
          userRole: role || null,
        },
      });
    }
  };

  if (typeof client.$transaction === "function") {
    await client.$transaction(
      async (tx: any) => {
        await runWithLock(tx);
      },
      { maxWait: 10000, timeout: 10000 },
    );
  } else {
    await runWithLock(client);
  }

  // Populate cache ONLY after database persistence succeeds
  revokedTokensCache.set(cleanJti, Date.now() + 3600_000);
  invalidateActiveSessionCache(cleanJti);
}

export async function isSessionRevoked(
  jti: string,
  client: any = prisma,
): Promise<boolean> {
  if (!jti || typeof jti !== "string" || !jti.trim()) return true;
  const cleanJti = jti.trim();
  const now = Date.now();
  const cachedExp = revokedTokensCache.get(cleanJti);
  if (cachedExp) {
    if (now < cachedExp) return true;
    revokedTokensCache.delete(cleanJti);
  }
  // Query database - fail closed on database errors (do not swallow)
  try {
    const record = await client.auditLog.findFirst({
      where: {
        entity: "RevokedSession",
        entityId: cleanJti,
        action: "REVOKE",
      },
      select: { id: true },
    });
    if (record) {
      revokedTokensCache.set(cleanJti, now + 3600_000);
      return true;
    }
    return false;
  } catch (err) {
    throw new AuthServiceError(
      "Gagal memeriksa status revokasi sesi pada database",
      err,
    );
  }
}

// ────────────────────────────────────────────
// Centralized Active Session Validation
// ────────────────────────────────────────────

export interface AuthSessionResult {
  session: SessionPayload;
  role: Role;
  safeRole: Role;
  email: string;
  dbUser: any;
}

/**
 * Centralized active session validator.
 * Validates:
 * 1. Signature & Expiration
 * 2. Mandatory non-empty JTI
 * 3. Revocation status (blacklist check with fail-closed behavior & AuthServiceError propagation)
 * 4. User existence in DB (or explicit env admin whitelist)
 * 5. Exact sessionVersion match (rejects unversioned tokens and outdated sessions)
 * 6. Role canonicalization from database record
 */
export async function validateActiveSession(
  tokenOrRequest?: string | Request,
): Promise<AuthSessionResult | null> {
  let token: string | undefined;

  if (typeof tokenOrRequest === "string") {
    token = tokenOrRequest;
  } else {
    try {
      const { cookies } = await import("next/headers");
      const bag = await cookies();
      token = bag.get("session")?.value;
    } catch {
      // cookies() may fail outside of Server Component/Route context
    }

    if (!token && tokenOrRequest && typeof tokenOrRequest === "object" && "headers" in tokenOrRequest) {
      const hdr = tokenOrRequest.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
  }

  // 1. Signature & Expiration validation
  const session = verifySession(token);
  if (!session) return null;

  // 2. Strict JTI contract: must be a non-empty string before blacklist check
  if (!session.jti || typeof session.jti !== "string" || !session.jti.trim()) {
    return null;
  }

  const cleanJti = session.jti.trim();
  const now = Date.now();

  // Fast reject if already in local revoked cache
  const revokedExp = revokedTokensCache.get(cleanJti);
  if (revokedExp && now < revokedExp) {
    return null;
  }

  // Fast path: return recently validated active session within short TTL window
  const cachedActive = activeSessionsCache.get(cleanJti);
  if (cachedActive) {
    if (now < cachedActive.expiresAt && cachedActive.result.session.exp > now) {
      return cachedActive.result;
    }
    activeSessionsCache.delete(cleanJti);
  }

  // Single-flight deduplication for concurrent API requests from the same page load
  const existingFlight = activeSessionInFlight.get(cleanJti);
  if (existingFlight) {
    return existingFlight;
  }

  const validationPromise = (async (): Promise<AuthSessionResult | null> => {
    // 3. Blacklist / Revocation check (Fail-closed; throws AuthServiceError on DB failure)
    const revoked = await isSessionRevoked(cleanJti);
    if (revoked) return null;

    const email = String(
      session.email || (session as any)?.user?.email || ""
    ).toLowerCase().trim();

    // 4. Env administrative user handling
    if (session.userId === "env-superadmin") {
      if (!isEnvAdmin(session)) return null;
      if (typeof session.sessionVersion !== "number" || session.sessionVersion !== 1) return null;
      const envResult: AuthSessionResult = {
        session,
        role: "pusat",
        safeRole: "pusat",
        email: session.email,
        dbUser: null,
      };
      activeSessionsCache.set(cleanJti, { result: envResult, expiresAt: Date.now() + ACTIVE_SESSION_CACHE_TTL_MS });
      return envResult;
    }

    // 5. Database User Query
    let dbUser = null;
    try {
      if (session.userId) {
        dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
      }
      if (!dbUser && email) {
        dbUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
      }
    } catch (err) {
      throw new AuthServiceError(
        "Gagal memeriksa data pengguna pada database",
        err,
      );
    }

    if (!dbUser) {
      // Check fallback if it's env admin without explicit userId in token
      if (isEnvAdmin(session) && session.sessionVersion === 1) {
        const fallbackResult: AuthSessionResult = {
          session,
          role: "pusat",
          safeRole: "pusat",
          email: session.email,
          dbUser: null,
        };
        activeSessionsCache.set(cleanJti, { result: fallbackResult, expiresAt: Date.now() + ACTIVE_SESSION_CACHE_TTL_MS });
        return fallbackResult;
      }
      // Reject unknown / deleted user
      return null;
    }

    // 6. Strict Session Version Verification:
    // Must have numeric sessionVersion matching dbUser.updatedAt.getTime() exactly.
    // Rejects unversioned tokens and zero tolerance for changed credentials.
    if (
      typeof session.sessionVersion !== "number" ||
      !dbUser.updatedAt ||
      session.sessionVersion !== dbUser.updatedAt.getTime()
    ) {
      return null;
    }

    // 7. Strict Role Resolution from database record
    const role = canonicalizeRole(dbUser.role);
    if (!role) return null;

    const finalResult: AuthSessionResult = {
      session: {
        ...session,
        userId: dbUser.id,
        role,
        regional: dbUser.regional,
        siteArea: dbUser.siteArea,
      },
      role,
      safeRole: role,
      email: dbUser.email,
      dbUser,
    };

    activeSessionsCache.set(cleanJti, {
      result: finalResult,
      expiresAt: Date.now() + ACTIVE_SESSION_CACHE_TTL_MS,
    });
    return finalResult;
  })().finally(() => {
    activeSessionInFlight.delete(cleanJti);
  });

  activeSessionInFlight.set(cleanJti, validationPromise);
  return validationPromise;
}

/**
 * Extract and verify session from request cookies.
 * Routes using getSession automatically get full centralized validation.
 */
export async function getSession(request?: Request): Promise<SessionPayload | null> {
  const auth = await validateActiveSession(request);
  return auth?.session ?? null;
}

/**
 * Get session + resolve user role from database.
 * Returns { session, role, safeRole, email, dbUser } or null if unauthorized.
 */
export async function getSessionWithRole(request?: Request): Promise<AuthSessionResult | null> {
  return validateActiveSession(request);
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
