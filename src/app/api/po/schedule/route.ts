import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { verifySession } from "@/lib/auth";
import { parseYmdOrIsoToUtcNoon } from "@/lib/utils/dates";
import { auditUpdatePO } from "@/lib/audit";

export async function PATCH(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session: sessionObj, email, dbUser } = auth;
    let rawRole = auth.role;

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

    const parsedDate = parseYmdOrIsoToUtcNoon(tglKirim);
    
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
    const updated = await auditUpdatePO(prisma as any, { id }, updateData, { 
      id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown", 
      name: getProfileName(sessionObj, dbUser) 
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
