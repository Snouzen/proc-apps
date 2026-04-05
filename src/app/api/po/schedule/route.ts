import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS) || 7;

function parseDate(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
      return null;
    }
    return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0));
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
}

export async function PATCH(request: Request) {
  try {
    const bag = await cookies();
    let token = bag.get("session")?.value;
    if (!token) {
      const hdr = request.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    const sessionObj = await Promise.resolve(verifySession(token));
    if (!sessionObj) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Ekstrak Email Sekuat Tenaga (Anti-Undefined & Lowercase)
    const emailRaw = sessionObj?.email || (sessionObj as any)?.user?.email || (sessionObj as any)?.payload?.email || "";
    const email = String(emailRaw).toLowerCase().trim();

    // 2. Cari di DB (Abaikan Huruf Besar/Kecil dengan findFirst)
    let dbUser = null;
    if (email) {
      dbUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
      });
    }

    // 3. Ekstrak Role & Hard-Fallback
    let rawRole = dbUser?.role || (sessionObj as any)?.user_metadata?.role || sessionObj?.role || "";

    // Gembok paksa picsite jika email mengandung spbdki
    if (email.includes("spbdki") && !dbUser) {
      rawRole = "picsite"; 
    }

    const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    // SECURITY CHECK: picsite (spbdki) or pusat only
    if (safeRole !== 'picsite' && safeRole !== 'spbdki' && safeRole !== 'pusat') {
      return NextResponse.json({ error: "Forbidden: Unauthorized role for scheduling" }, { status: 403 });
    }

    const { id, tglKirim } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID PO wajib diisi" }, { status: 400 });
    }

    const parsedDate = parseDate(tglKirim);
    
    // Update Prisma: Note the field name is 'tglkirim' as per schema.prisma
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        tglkirim: parsedDate,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/po/schedule error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
