import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePoCache } from "@/lib/ttl-cache";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { auditUpdatePO } from "@/lib/audit";
import { isInvoiceEmpty } from "@/lib/utils/invoice";
import { checkPOOwnership } from "@/lib/utils/regional";

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session, role: rawRole, dbUser } = auth;
    const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const userRegional = dbUser?.regional || (session as any)?.regional || null;
    const userSiteArea = dbUser?.siteArea || (session as any)?.siteArea || null;

    if (safeRole !== "pusat" && safeRole !== "rm" && safeRole !== "sitearea") {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki wewenang untuk menolak PO" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    const remarks: string | undefined = body?.remarks;

    if (!id) {
      return NextResponse.json({ error: "id PO wajib diisi" }, { status: 400 });
    }

    const po = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${id} FOR UPDATE`;
      const existingPo = await tx.purchaseOrder.findUnique({ where: { id }, include: { UnitProduksi: true } });
      if (!existingPo) throw Object.assign(new Error("PO tidak ditemukan"), { statusCode: 404 });
      const check = checkPOOwnership(existingPo, safeRole, userRegional, userSiteArea);
      if (!check.allowed) throw Object.assign(new Error(check.reason || "Forbidden"), { statusCode: 403 });
      if (!isInvoiceEmpty(existingPo.noInvoice) || existingPo.statusBayar) {
        throw Object.assign(new Error("PO berinvoice atau sudah dibayar tidak dapat di-reject"), { statusCode: 409 });
      }
      return auditUpdatePO(tx as any, { id }, {
        statusPo: false, unitProduksiId: "UNKNOWN",
        regional: safeRole === "sitearea" ? existingPo.UnitProduksi?.namaRegional || existingPo.regional : null,
        tglkirim: null, namaSupir: null, platNomor: null,
        remarks: remarks || null, updatedAt: new Date(),
      }, { id: dbUser?.id || session.userId || "unknown", name: getProfileName(session, dbUser), role: safeRole });
    });

    console.log(`[REJECT PO] Success: ${po.noPo} (ID: ${po.id})`);

    // Invalidation: Clear cache agar stats dan list di dashboard/schedule update
    invalidatePoCache();

    return NextResponse.json({ ok: true, po });
  } catch (e: any) {
    console.error("Reject PO API Error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: e?.statusCode || 500 },
    );
  }
}
