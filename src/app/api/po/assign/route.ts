import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const noPo: string | undefined = body?.noPo;
    const regionalPayload: string | null | undefined = body?.regional;
    const siteArea: string | null | undefined = body?.siteArea;

    if (!noPo) {
      return NextResponse.json({ error: "noPo wajib diisi" }, { status: 400 });
    }

    if (!regionalPayload && !siteArea) {
      return NextResponse.json({ error: "Regional atau Site Area wajib diisi" }, { status: 400 });
    }

    let unitProduksiId: string | undefined = undefined;
    let finalRegional: string | undefined = regionalPayload || undefined;

    // Jika ada siteArea, cari detail unit-nya (Pusat/Regional flow)
    if (siteArea) {
      const unit = await prisma.unitProduksi.findFirst({
        where: { siteArea: { equals: siteArea, mode: "insensitive" } },
      });
      if (!unit) {
        return NextResponse.json(
          { error: `UnitProduksi dengan Site Area '${siteArea}' tidak ditemukan` },
          { status: 404 },
        );
      }
      unitProduksiId = unit.idRegional;
      finalRegional = unit.namaRegional;
    }

    const po = await prisma.purchaseOrder.update({
      where: { noPo },
      data: {
        unitProduksiId: unitProduksiId || undefined,
        regional: finalRegional || undefined,
        updatedAt: new Date(),
      },
      select: { id: true, noPo: true, unitProduksiId: true, regional: true },
    });

    // Invalidation: Clear cache agar stats dan list di dashboard update
    cacheClearPrefix("po_stats:");
    cacheClearPrefix("po:");

    return NextResponse.json({ ok: true, po });
  } catch (e: any) {
    console.error("Assign API Error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
