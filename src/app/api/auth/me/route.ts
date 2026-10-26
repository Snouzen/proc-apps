import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSessionWithRole } from "@/lib/auth";
import { readPermissionsConfigWithVersion } from "@/lib/accessControl";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) return NextResponse.json({ authenticated: false }, { headers });
    const { session, dbUser, role } = auth;
    const { config } = await readPermissionsConfigWithVersion();
    const permissions = config?.[role];
    if (!permissions) return NextResponse.json({ error: "Konfigurasi akses tidak tersedia" }, { status: 503, headers });
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    return NextResponse.json({
      authenticated: true, userId: dbUser?.id || session.userId,
      email: dbUser?.email || session.email, role,
      regional: dbUser ? dbUser.regional : session.regional ?? null,
      siteArea: dbUser ? dbUser.siteArea : session.siteArea ?? null,
      expiresAt: session.exp,
      sessionRevision: hash("session-recovery:" + session.jti),
      permissionsHash: hash(JSON.stringify({ menus: [...permissions.enabledMenus].sort(), actions: [...permissions.enabledActions].sort() })),
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Layanan verifikasi sesi belum tersedia. Coba lagi." }, { status: 503, headers });
  }
}
