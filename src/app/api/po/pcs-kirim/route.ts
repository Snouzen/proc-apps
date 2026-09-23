import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, itemId, pcsKirim, items } = body;

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
        select: { id: true, hargaPcs: true, discount: true, pcs: true },
      });

      if (dbItems.length === 0) {
        return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
      }

      const updates = dbItems.map((dbItem) => {
        const payloadItem = items.find(
          (it: any) => (it.itemId || it.id) === dbItem.id
        );
        const val = Math.max(0, Number(payloadItem?.pcsKirim) || 0);
        const orderPcs = Number(dbItem.pcs) || 1;
        const actualDiscount = (Number(dbItem.discount || 0) / orderPcs) * val;
        const rpTagih = Math.max(0, val * dbItem.hargaPcs - actualDiscount);

        return prisma.purchaseOrderItem.update({
          where: { id: dbItem.id },
          data: {
            pcsKirim: val,
            rpTagih: rpTagih,
            updatedAt: new Date(),
          },
        });
      });

      await prisma.$transaction(updates);

      cacheClearPrefix("po:");
      cacheClearPrefix("po_total:");

      return NextResponse.json({ ok: true, count: updates.length });
    }

    if (!id && !itemId) {
      return NextResponse.json({ error: "id PO atau itemId wajib diisi" }, { status: 400 });
    }

    const value = Number(pcsKirim);
    if (isNaN(value) || value < 0) {
      return NextResponse.json({ error: "Jumlah Pcs Kirim tidak valid" }, { status: 400 });
    }

    // [ACTION 2] Update Granular (Per Item) atau Global (Per PO)
    if (itemId) {
      // Update specific item
      const item = await prisma.purchaseOrderItem.findUnique({
        where: { id: itemId },
        select: { hargaPcs: true, discount: true, pcs: true }
      });
      
      if (!item) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
      
      const orderPcs = Number(item.pcs) || 1;
      const actualDiscount = (Number(item.discount || 0) / orderPcs) * value;
      const rpTagih = Math.max(0, (value * item.hargaPcs) - actualDiscount);

      await prisma.purchaseOrderItem.update({
        where: { id: itemId },
        data: { 
          pcsKirim: value,
          rpTagih: rpTagih,
          updatedAt: new Date()
        }
      });
    } else {
      // Update ALL items in PO (Legacy/Global method)
      const items = await prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
        select: { id: true, hargaPcs: true, discount: true, pcs: true }
      });

      // Update one by one to ensure Rp Tagih recalculated per item price
      await prisma.$transaction(items.map(it => {
        const orderPcs = Number(it.pcs) || 1;
        const actualDiscount = (Number(it.discount || 0) / orderPcs) * value;
        const rpTagih = Math.max(0, (value * it.hargaPcs) - actualDiscount);
        return prisma.purchaseOrderItem.update({
          where: { id: it.id },
          data: { 
            pcsKirim: value, 
            rpTagih: rpTagih,
            updatedAt: new Date() 
          }
        });
      }));
    }

    cacheClearPrefix("po:");
    cacheClearPrefix("po_total:");
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PATCH /api/po/pcs-kirim error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
