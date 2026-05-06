import { NextRequest, NextResponse } from "next/server";
import { verifySessionEdge } from "@/lib/auth-edge";

// ── P2-8: Rate Limiting (in-memory, per-IP) ──
const LOGIN_WINDOW_MS = 60_000; // 1 minute
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60_000;
  const key = "__rateLimitCleanup__";
  if (!(globalThis as any)[key]) {
    (globalThis as any)[key] = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of loginAttempts) {
        if (now > entry.resetAt) loginAttempts.delete(ip);
      }
    }, CLEANUP_INTERVAL);
  }
}

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/static")) return true;
  return false;
}

/** API paths that do NOT require authentication */
function isPublicApi(pathname: string) {
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

// ── P2-9: CSRF Origin Validation ──
function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return true; // can't validate without host

  // If no Origin header (e.g. same-origin GET), allow
  if (!origin && !referer) return true;

  const allowed = host.split(":")[0]; // strip port
  if (origin) {
    try {
      const u = new URL(origin);
      return u.hostname === allowed || u.hostname === "localhost";
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      const u = new URL(referer);
      return u.hostname === allowed || u.hostname === "localhost";
    } catch {
      return false;
    }
  }
  return true;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const session = await verifySessionEdge(token);

  // ── API route protection ──
  if (pathname.startsWith("/api/")) {
    // Rate limit login endpoint
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";
      if (isRateLimited(ip)) {
        return NextResponse.json(
          { error: "Terlalu banyak percobaan login. Coba lagi dalam 1 menit." },
          { status: 429 },
        );
      }
    }

    // Allow public API routes (login, logout, etc.)
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    // All other API routes require authentication
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enforce Content-Type + CSRF check for mutating requests
    const method = req.method.toUpperCase();
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      // CSRF: validate Origin header
      if (!isValidOrigin(req)) {
        return NextResponse.json(
          { error: "Forbidden: invalid origin" },
          { status: 403 },
        );
      }

      // Content-Type enforcement (skip DELETE which typically has no body)
      if (method !== "DELETE") {
        const ct = req.headers.get("content-type") || "";
        const isJson = ct.toLowerCase().includes("application/json");
        if (!isJson) {
          return NextResponse.json(
            { error: "Content-Type harus application/json" },
            { status: 415 },
          );
        }
      }
    }

    return NextResponse.next();
  }

  // ── Page route protection ──
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set(
      "next",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next|favicon.ico|images|static).*)",
  ],
};
