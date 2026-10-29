import { createScheduleResponder } from "@/lib/scheduleErrorReference";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionEdge } from "@/lib/auth-edge";
import { sanitizeInternalRedirect } from "@/lib/utils/redirect";

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
  if (pathname.startsWith("/img")) return true;
  if (pathname.startsWith("/static")) return true;
  if (pathname.startsWith("/fonts")) return true;
  if (pathname.startsWith("/logo-")) return true;
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
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return true; // can't validate without host

  // If no Origin or Referer header, allow
  if (!origin && !referer) return true;

  const expectedProto = (
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(/:$/, "")
  ).toLowerCase();
  const isDev = process.env.NODE_ENV !== "production";

  const target = origin || referer;
  if (!target) return true;

  try {
    const u = new URL(target);
    const targetProto = u.protocol.replace(/:$/, "").toLowerCase();
    const targetHost = u.host.toLowerCase();
    const expectedHost = host.toLowerCase();

    // Check full origin (protocol, host with port)
    const matchesHost =
      targetHost === expectedHost ||
      (isDev && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
    const matchesProto =
      targetProto === expectedProto ||
      (isDev && (targetProto === "http" || targetProto === "https"));

    return matchesHost && matchesProto;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isScheduleMutation = ["/api/po/pcs-kirim", "/api/po/schedule"].includes(pathname);
  const respond = isScheduleMutation ? createScheduleResponder(req) : NextResponse.json;
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
        return respond(
          { error: "Terlalu banyak percobaan login. Coba lagi dalam 1 menit." },
          { status: 429 },
        );
      }
    }

    // CSRF origin check for all mutating requests
    const method = req.method.toUpperCase();
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      if (!isValidOrigin(req)) {
        return respond(
          { error: "Forbidden: invalid origin", ...(isScheduleMutation ? { code: "REQUEST_ORIGIN_REJECTED" } : {}) },
          { status: 403 },
        );
      }
    }

    // Allow public API routes (login, logout, etc.)
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    // All other API routes require authentication
    if (!session) {
      return respond({ error: "Unauthorized" }, { status: 401 });
    }

    // Content-Type enforcement: strictly for mutating methods that submit a body (POST, PUT, PATCH)
    // Also skip file upload endpoints that use multipart/form-data
    if ((method === "POST" || method === "PUT" || method === "PATCH") && !pathname.endsWith("/upload")) {
      const ct = req.headers.get("content-type") || "";
      const isJson = ct.toLowerCase().includes("application/json");
      if (!isJson) {
        return respond(
          { error: "Content-Type harus application/json" },
          { status: 415 },
        );
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
      sanitizeInternalRedirect(`${req.nextUrl.pathname}${req.nextUrl.search}`),
    );
    return NextResponse.redirect(url);
  }

  // ── Role-based Access Control ──
  if ((pathname === "/credit-limit/approval" || pathname.startsWith("/credit-limit/approval/")) && session.role !== "pusat") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith("/tools/nota-dinas") && session.role !== "pusat") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next|favicon.ico|images|img|static|fonts|logo-).*)",
  ],
};
