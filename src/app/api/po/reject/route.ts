import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id: string | undefined = body?.id;

    if (!id) {
      return NextResponse.json({ error: "id PO wajib diisi" }, { status: 400 });
    }

    // [DEBUG] Berdasarkan schema.prisma:
    // 1. Tidak ada kolom fisik 'siteArea' di PurchaseOrder (siteArea ditarik lewat relasi UnitProduksi).
    // 2. unitProduksiId di PurchaseOrder bersifat Mandatory (String, bukan String?).
    // 3. regional di PurchaseOrder bersifat Optional (String?).
    
    // [FIX] Agar statusPo balik ke 'Need to Assign' Dashboard:
    // - statusPo: false
    // - unitProduksiId: "UNKNOWN" (Reset ke dummy unit agar relasi tetap valid tapi data 'hilang' dari site area)
    // - regional: Tetap dipertahankan (seperti instruksi user)

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        statusPo: false,        // Balik ke antrean kebutuhan penetapan unit
        unitProduksiId: "UNKNOWN", // Reset ke unit dummy agar tidak terdeteksi milik site area manapun
        updatedAt: new Date(),
      },
      select: { id: true, noPo: true, regional: true },
    });

    console.log(`[REJECT PO] Success: ${po.noPo} (ID: ${po.id})`);

    // Invalidation: Clear cache agar stats dan list di dashboard/schedule update
    cacheClearPrefix("po_stats:");
    cacheClearPrefix("po:");

    return NextResponse.json({ ok: true, po });
  } catch (e: any) {
    console.error("Reject PO API Error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
