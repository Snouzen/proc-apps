import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";

export async function PATCH(request: Request) {
  try {
    const { id, itemId, pcsKirim } = await request.json();

    if (!id && !itemId) {
      return NextResponse.json({ error: "id PO atau itemId wajib diisi" }, { status: 400 });
    }

    const value = Number(pcsKirim);
    if (isNaN(value) || value < 0) {
      return NextResponse.json({ error: "Jumlah Pcs Kirim tidak valid" }, { status: 400 });
    }

    // [ACTION] Update Granular (Per Item) atau Global (Per PO)
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
      await Promise.all(items.map(it => {
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
