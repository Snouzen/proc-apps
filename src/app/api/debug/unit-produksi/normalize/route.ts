import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST() {
  try {
    const target = await prisma.unitProduksi.findFirst({
      where: { siteArea: { equals: "SPB DKI JAKARTA", mode: "insensitive" } },
      select: { idRegional: true, namaRegional: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    const synonyms = [
      "SPB DKI",
      "SPB DKI JKT",
      "SPB DKI (JAKARTA)",
      "SPB DKI JAKARTA",
    ];
    const whereOr = synonyms.map((s) => ({
      tujuanDetail: { equals: s, mode: "insensitive" as const },
    }));
    const r1 = await prisma.purchaseOrder.updateMany({
      where: { OR: whereOr, unitProduksiId: "UNKNOWN" },
      data: {
        unitProduksiId: target.idRegional,
        regional: target.namaRegional,
      },
    });
    const r2 = await prisma.purchaseOrder.updateMany({
      where: {
        tujuanDetail: { startsWith: "SPB DKI", mode: "insensitive" },
        unitProduksiId: "UNKNOWN",
      },
      data: {
        unitProduksiId: target.idRegional,
        regional: target.namaRegional,
      },
    });
    return NextResponse.json({
      updatedEquals: r1.count,
      updatedStartsWith: r2.count,
      idRegional: target.idRegional,
      namaRegional: target.namaRegional,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
