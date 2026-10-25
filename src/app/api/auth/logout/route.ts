import { NextResponse } from "next/server";
import { verifySessionSignature, revokeSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Extract token from cookie (or header fallback)
    let token: string | undefined;
    try {
      const { cookies } = await import("next/headers");
      const bag = await cookies();
      token = bag.get("session")?.value;
    } catch {}

    if (!token) {
      const hdr = req.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }

    // 2. If token is present, verify its cryptographic signature
    // (Allow revoking even if token expired or inactive, as long as signature is authentic)
    if (token) {
      const payload = verifySessionSignature(token, true);
      if (payload?.jti) {
        await revokeSession(payload.jti, payload.email, payload.role);
      }
    }

    // 3. Clear session cookie
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[AUTH] Error revoking session on logout:", err);
    return NextResponse.json(
      { error: "Gagal mencatat revokasi sesi pada sistem." },
      { status: 500 },
    );
  }
}
