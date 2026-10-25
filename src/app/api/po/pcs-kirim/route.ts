import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePoCache } from "@/lib/ttl-cache";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { checkPOOwnership } from "@/lib/utils/regional";
import { auditActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/accessControl";

function parseStrictNonNegativeInteger(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (!Number.isFinite(val) || !Number.isInteger(val) || val < 0) return null;
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) return null;
    const num = Number(trimmed);
    if (!Number.isSafeInteger(num) || num < 0) return null;
    return num;
  }
  return null;
}

export async function PATCH(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;
    const userRegional = dbUser?.regional || session?.regional || null;
    const userSiteArea = dbUser?.siteArea || session?.siteArea || null;

    const body = await request.json();
    const { id, itemId, pcsKirim, items } = body;

    // Enforce exact access control action based on matrix:
    // Batch update requires sched_batch; single item update requires sched_edit
    const isBatch = Array.isArray(items) && items.length > 0;
    const requiredAction = isBatch ? "sched_batch" : "sched_edit";
    const allowed = await hasPermission(safeRole, requiredAction);
    if (!allowed) {
      return NextResponse.json(
        { error: `Forbidden: Akun Anda tidak memiliki izin '${requiredAction}' untuk mengubah alokasi pengiriman` },
        { status: 403 }
      );
    }

    // [ACTION 1] Batch Update (Multi Item per PO)
    if (Array.isArray(items) && items.length > 0) {
      const itemIds = items
        .map((it: any) => it.itemId || it.id)
        .filter(Boolean);

      if (itemIds.length === 0) {
        return NextResponse.json({ error: "Daftar itemId tidak valid" }, { status: 400 });
      }

      const dbItems = await prisma.purchaseOrderItem.findMany({
        where: { id: { in: itemIds } },
        include: {
          PurchaseOrder: {
            include: { UnitProduksi: true }
          }
        },
      });

      if (dbItems.length === 0) {
        return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
      }

      // Verifikasi wewenang regional / sitearea untuk setiap item & validasi jumlah
      for (const item of dbItems) {
        if (!item.PurchaseOrder) {
          return NextResponse.json({ error: "Purchase Order terkait tidak ditemukan" }, { status: 404 });
        }
        const check = checkPOOwnership(item.PurchaseOrder, safeRole, userRegional, userSiteArea);
        if (!check.allowed) {
          return NextResponse.json({ error: `Forbidden: ${check.reason}` }, { status: 403 });
        }

        const payloadItem = items.find((it: any) => (it.itemId || it.id) === item.id);
        const val = parseStrictNonNegativeInteger(payloadItem?.pcsKirim);
        if (val === null) {
          return NextResponse.json({ error: `Jumlah pcs kirim item ${item.id} tidak valid (wajib berupa bilangan bulat >= 0)` }, { status: 400 });
        }
        const orderPcs = Number(item.pcs) || 0;
        if (val > orderPcs) {
          return NextResponse.json({ error: `Pcs kirim (${val}) tidak boleh melebihi jumlah pesanan (${orderPcs})` }, { status: 400 });
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const dbItem of dbItems) {
          const payloadItem = items.find(
            (it: any) => (it.itemId || it.id) === dbItem.id
          );
          const val = Math.max(0, Number(payloadItem?.pcsKirim) || 0);
          const orderPcs = Number(dbItem.pcs) || 1;
          const actualDiscount = (Number(dbItem.discount || 0) / orderPcs) * val;
          const rpTagih = Math.max(0, val * dbItem.hargaPcs - actualDiscount);

          await tx.purchaseOrderItem.update({
            where: { id: dbItem.id },
            data: {
              pcsKirim: val,
              rpTagih: rpTagih,
              updatedAt: new Date(),
            },
          });

          await auditActivity(tx as any, dbItem.id, "PurchaseOrderItem", "UPDATE", {
            id: dbUser?.id || (session as any)?.user?.id || "unknown",
            name: getProfileName(session, dbUser),
            role: safeRole
          }, {
            field: "pcsKirim",
            oldPcsKirim: dbItem.pcsKirim,
            newPcsKirim: val,
            poId: dbItem.purchaseOrderId
          });
        }
      });

      invalidatePoCache();

      return NextResponse.json({ ok: true, count: dbItems.length });
    }

    if (!id && !itemId) {
      return NextResponse.json({ error: "id PO atau itemId wajib diisi" }, { status: 400 });
    }

    const value = parseStrictNonNegativeInteger(pcsKirim);
    if (value === null) {
      return NextResponse.json({ error: "Jumlah Pcs Kirim tidak valid (wajib berupa bilangan bulat >= 0)" }, { status: 400 });
    }

    // [ACTION 2] Update Granular (Per Item)
    if (itemId) {
      const item = await prisma.purchaseOrderItem.findUnique({
        where: { id: itemId },
        include: {
          PurchaseOrder: {
            include: { UnitProduksi: true }
          }
        }
      });
      
      if (!item) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
      if (!item.PurchaseOrder) return NextResponse.json({ error: "Purchase Order terkait tidak ditemukan" }, { status: 404 });
      
      const check = checkPOOwnership(item.PurchaseOrder, safeRole, userRegional, userSiteArea);
      if (!check.allowed) {
        return NextResponse.json({ error: `Forbidden: ${check.reason}` }, { status: 403 });
      }

      const orderPcs = Number(item.pcs) || 0;
      if (value > orderPcs) {
        return NextResponse.json({ error: `Pcs kirim (${value}) tidak boleh melebihi jumlah pesanan (${orderPcs})` }, { status: 400 });
      }

      const actualDiscount = (Number(item.discount || 0) / (orderPcs || 1)) * value;
      const rpTagih = Math.max(0, (value * item.hargaPcs) - actualDiscount);

      await prisma.$transaction(async (tx) => {
        await tx.purchaseOrderItem.update({
          where: { id: itemId },
          data: { 
            pcsKirim: value,
            rpTagih: rpTagih,
            updatedAt: new Date()
          }
        });

        await auditActivity(tx as any, itemId, "PurchaseOrderItem", "UPDATE", {
          id: dbUser?.id || (session as any)?.user?.id || "unknown",
          name: getProfileName(session, dbUser),
          role: safeRole
        }, {
          field: "pcsKirim",
          oldPcsKirim: item.pcsKirim,
          newPcsKirim: value,
          poId: item.purchaseOrderId
        });
      });
    } else {
      // [ACTION 3] Update ALL items in PO (Legacy/Global method)
      const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          UnitProduksi: true,
          Items: { select: { id: true, hargaPcs: true, discount: true, pcs: true, pcsKirim: true } }
        }
      });

      if (!po) return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });

      const check = checkPOOwnership(po, safeRole, userRegional, userSiteArea);
      if (!check.allowed) {
        return NextResponse.json({ error: `Forbidden: ${check.reason}` }, { status: 403 });
      }

      const items = po.Items || [];

      // Validate that value <= pcs for all items
      for (const it of items) {
        const orderPcs = Number(it.pcs) || 0;
        if (value > orderPcs) {
          return NextResponse.json({ error: `Pcs kirim (${value}) tidak boleh melebihi jumlah pesanan (${orderPcs}) pada salah satu item PO` }, { status: 400 });
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const it of items) {
          const orderPcs = Number(it.pcs) || 1;
          const actualDiscount = (Number(it.discount || 0) / orderPcs) * value;
          const rpTagih = Math.max(0, (value * it.hargaPcs) - actualDiscount);
          
          await tx.purchaseOrderItem.update({
            where: { id: it.id },
            data: { 
              pcsKirim: value, 
              rpTagih: rpTagih,
              updatedAt: new Date() 
            }
          });

          await auditActivity(tx as any, it.id, "PurchaseOrderItem", "UPDATE", {
            id: dbUser?.id || (session as any)?.user?.id || "unknown",
            name: getProfileName(session, dbUser),
            role: safeRole
          }, {
            field: "pcsKirim",
            oldPcsKirim: it.pcsKirim,
            newPcsKirim: value,
            poId: po.id
          });
        }
      });
    }

    invalidatePoCache();
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PATCH /api/po/pcs-kirim error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
