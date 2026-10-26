import { SESSION_TTL_SECONDS } from "@/lib/session-policy";
import { NextResponse } from "next/server";
import { authenticate, signSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { email, password } = await req.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const normalizedEmail = (email || "").toLowerCase().trim();
    const ipKey = `ratelimit:${ip}`;
    const emailKey = `ratelimit:email:${normalizedEmail}`;
    const windowStart = new Date(Date.now() - 60_000);

    // ── Distributed Rate Limiting with Atomic Advisory Transaction Lock ──
    const authResult = await prisma.$transaction(async (tx) => {
      // 1. Transaction-level advisory lock serializes concurrent attempts for this IP and target email
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ipKey}))`;
      if (normalizedEmail) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${emailKey}))`;
      }

      // 2. Count failed attempts within the 60-second window (by IP and by target account)
      const [failedIpAttempts, failedEmailAttempts] = await Promise.all([
        tx.auditLog.count({
          where: {
            entity: "RateLimit",
            entityId: ip,
            action: "LOGIN_FAILED",
            createdAt: { gte: windowStart },
          },
        }),
        normalizedEmail
          ? tx.auditLog.count({
              where: {
                entity: "RateLimitAccount",
                entityId: normalizedEmail,
                action: "LOGIN_FAILED",
                createdAt: { gte: windowStart },
              },
            })
          : 0,
      ]);

      if (failedIpAttempts >= 5 || failedEmailAttempts >= 5) {
        return { rateLimited: true } as const;
      }

      // 3. Attempt authentication within transaction client
      const result = await authenticate(email, password, tx);
      if (!result.ok) {
        // Record failed attempt atomically within the same lock scope
        await tx.auditLog.create({
          data: {
            entity: "RateLimit",
            entityId: ip,
            action: "LOGIN_FAILED",
            newData: {
              email: normalizedEmail,
              timestamp: new Date().toISOString(),
            },
            userId: null,
            userName: normalizedEmail,
            userRole: null,
          },
        });
        if (normalizedEmail) {
          await tx.auditLog.create({
            data: {
              entity: "RateLimitAccount",
              entityId: normalizedEmail,
              action: "LOGIN_FAILED",
              newData: {
                ip,
                timestamp: new Date().toISOString(),
              },
              userId: null,
              userName: normalizedEmail,
              userRole: null,
            },
          });
        }
        return { ok: false } as const;
      }

      return { ok: true, payload: result.payload } as const;
    });

    if ("rateLimited" in authResult && authResult.rateLimited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi dalam 1 menit." },
        { status: 429 },
      );
    }

    if (!authResult.ok) {
      // Cleanup stale rate limit logs asynchronously
      prisma.auditLog
        .deleteMany({
          where: {
            entity: "RateLimit",
            createdAt: { lt: new Date(Date.now() - 3600_000) },
          },
        })
        .catch(() => {});

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = signSession(authResult.payload);
    // Minimal server-side log for troubleshooting (email + role only)
    try {
      console.info(
        "[auth/login] user:",
        (email || "").toString().toLowerCase(),
        "role:",
        authResult.payload.role,
        "regional:",
        authResult.payload.regional || "-",
      );
    } catch {}
    const res = NextResponse.json({
      ok: true,
      role: authResult.payload.role,
      regional: authResult.payload.regional ?? null,
      siteArea: authResult.payload.siteArea ?? null,
    });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
