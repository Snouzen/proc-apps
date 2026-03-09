import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    // Next 15+ dynamic APIs are async — must await cookies()
    const bag = await cookies();
    let token = bag.get("session")?.value;
    if (!token) {
      // Fallback: parse from request headers (robust in dev/edge)
      const hdr = req.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    return NextResponse.json({
      authenticated: true,
      email: session.email,
      role: session.role,
      regional: session.regional ?? null,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
