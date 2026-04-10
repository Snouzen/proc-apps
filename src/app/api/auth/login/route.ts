import { NextResponse } from "next/server";
import { authenticate, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = await authenticate(email, password);
    if (!result.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = signSession(result.payload);
    // Minimal server-side log for troubleshooting (email + role only)
    try {
      console.info(
        "[auth/login] user:",
        (email || "").toString().toLowerCase(),
        "role:",
        result.payload.role,
        "regional:",
        result.payload.regional || "-",
      );
    } catch {}
    const res = NextResponse.json({
      ok: true,
      role: result.payload.role,
      regional: result.payload.regional ?? null,
    });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
