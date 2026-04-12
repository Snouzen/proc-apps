import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";

export async function PATCH(request: Request) {
  try {
    const { id, pcsKirim } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID PO wajib diisi" }, { status: 400 });
    }

    const value = Number(pcsKirim);
    if (isNaN(value) || value < 0) {
      return NextResponse.json({ error: "Jumlah Pcs Kirim tidak valid" }, { status: 400 });
    }

    // [ACTION] Update pcsKirim pada tabel PurchaseOrder (sebagai denormalisasi summary)
    // dan update semua item terkait (opsional, tergantung kebutuhan bisnis apakah per-item atau total)
    // Berdasarkan request User, kita fokus update pcsKirim di PurchaseOrder utama.
    
    // Namun, di schema.prisma pcsKirim ada di PurchaseOrderItem.
    // Jika ada field pcsKirim di PurchaseOrder, kita update. Jika tidak, kita update semua items-nya.
    
    // Mari kita cek schema.prisma lagi: 
    // PurchaseOrderItem memiliki pcsKirim. PurchaseOrder TIDAK memiliki pcsKirim fisik.
    // Maka kita harus mengupdate semua item milik PO tersebut jika ingin 'inline update global'
    // ATAU user ingin update per item (namun UI yang diminta adalah 1 baris per PO).
    
    // Keputusan: Mengupdate semua PurchaseOrderItem milik PurchaseOrder tersebut.
    
    await prisma.purchaseOrderItem.updateMany({
      where: { purchaseOrderId: id },
      data: {
        pcsKirim: value,
        updatedAt: new Date()
      }
    });

    cacheClearPrefix("po:");
    cacheClearPrefix("po_total:");
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PATCH /api/po/pcs-kirim error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
