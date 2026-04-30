import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS) || 7;

function parseDate(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  
  // 1. Cek format standar YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    // Set ke Jam 12 Siang UTC agar aman saat ditarik ke zona waktu manapun
    return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0));
  }
  
  // 2. Fallback jika menerima format ISO Full (2026-04-13T12:00:00Z)
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0)
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

    // SECURITY CHECK: picsite (spbdki), pusat, sitearea, or rm only
    if (safeRole !== 'picsite' && safeRole !== 'spbdki' && safeRole !== 'pusat' && safeRole !== 'sitearea' && safeRole !== 'rm') {
      return NextResponse.json({ error: "Forbidden: Unauthorized role for scheduling" }, { status: 403 });
    }

    const { id, tglKirim, namaSupir, platNomor } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID PO wajib diisi" }, { status: 400 });
    }

    const parsedDate = parseDate(tglKirim);
    
    const updateData: any = {
      tglkirim: parsedDate,
      namaSupir: namaSupir || null,
      platNomor: platNomor || null,
    };

    if (parsedDate) {
      // Get existing PO first
      const existingPo = await prisma.purchaseOrder.findUnique({
        where: { id }
      });
      if (existingPo) {
        const { ensureInvoiceNumber } = await import("@/lib/generatePoInvoiceNumber");
        const noFaktur = await ensureInvoiceNumber(prisma, existingPo, parsedDate);
        if (noFaktur && !existingPo.noFaktur) {
          updateData.noFaktur = noFaktur;
        }
      }
    }

    // Update Prisma: Note the field name is 'tglkirim' as per schema.prisma
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData
    });

    const { cacheClearPrefix } = await import("@/lib/ttl-cache");
    cacheClearPrefix("po:");
    cacheClearPrefix("po_total:");
    cacheClearPrefix("po_stats:");

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/po/schedule error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
