import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    return NextResponse.json({
      authenticated: true,
      email: session.email,
      role: session.role,
      regional: session.regional ?? null,
      siteArea: session.siteArea ?? null,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
