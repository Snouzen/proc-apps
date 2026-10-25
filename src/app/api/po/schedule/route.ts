import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { parseYmdOrIsoToUtcNoon } from "@/lib/utils/dates";
import { auditUpdatePO } from "@/lib/audit";
import { checkPOOwnership } from "@/lib/utils/regional";
import { hasPermission } from "@/lib/accessControl";
import { withTransactionRetry, ensureInvoiceNumber } from "@/lib/generatePoInvoiceNumber";

export async function PATCH(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session: sessionObj, email, dbUser, safeRole } = auth;

    const allowed = (await hasPermission(safeRole, "sched_edit")) || (await hasPermission(safeRole, "po_edit"));
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengatur jadwal pengiriman (sched_edit / po_edit)" },
        { status: 403 }
      );
    }

    const { id, tglKirim, namaSupir, platNomor } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID PO wajib diisi" }, { status: 400 });
    }

    // Get existing PO first and verify ownership
    const existingPo = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { UnitProduksi: true }
    });
    if (!existingPo) {
      return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
    }

    const userRegional = dbUser?.regional || (sessionObj as any)?.regional || null;
    const userSiteArea = dbUser?.siteArea || (sessionObj as any)?.siteArea || null;
    const check = checkPOOwnership(existingPo, safeRole, userRegional, userSiteArea);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason || "Forbidden: Di luar wewenang Anda" }, { status: 403 });
    }

    const parsedDate = parseYmdOrIsoToUtcNoon(tglKirim);
    
    const updateData: any = {
      tglkirim: parsedDate,
      namaSupir: namaSupir || null,
      platNomor: platNomor || null,
    };

    // Satukan lock-baca-simpan dalam transaksi atomik dengan retry
    const updated = await withTransactionRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        // 1. Acquire PostgreSQL advisory transaction lock to serialize concurrent updates for this PO
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'po_sched_' + id}))`;

        // 2. Re-read the PO state INSIDE the transaction after the lock is acquired
        const lockedPo = await tx.purchaseOrder.findUnique({
          where: { id },
          include: { UnitProduksi: true }
        });
        if (!lockedPo) {
          throw new Error("PO tidak ditemukan");
        }

        const txUpdateData: any = { ...updateData };

        // 3. Only generate noFaktur if the freshly locked PO does NOT already have one
        if (parsedDate && !lockedPo.noFaktur) {
          const noFaktur = await ensureInvoiceNumber(tx, lockedPo, parsedDate);
          if (noFaktur) {
            txUpdateData.noFaktur = noFaktur;
          }
        }

        return await auditUpdatePO(tx as any, { id }, txUpdateData, { 
          id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown", 
          name: getProfileName(sessionObj, dbUser),
          role: safeRole
        });
      });
    });

    const { invalidatePoCache } = await import("@/lib/ttl-cache");
    invalidatePoCache();

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/po/schedule error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
