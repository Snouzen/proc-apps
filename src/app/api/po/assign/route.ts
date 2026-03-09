import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const noPo: string | undefined = body?.noPo;
    const siteArea: string | undefined = body?.siteArea;
    if (!noPo || !siteArea) {
      return NextResponse.json(
        { error: "noPo dan siteArea wajib diisi" },
        { status: 400 },
      );
    }
    const unit = await prisma.unitProduksi.findFirst({
      where: { siteArea: { equals: siteArea, mode: "insensitive" } },
    });
    if (!unit) {
      return NextResponse.json(
        { error: "UnitProduksi (siteArea) tidak ditemukan" },
        { status: 404 },
      );
    }
    const po = await prisma.purchaseOrder.update({
      where: { noPo },
      data: {
        unitProduksiId: unit.idRegional,
        regional: unit.namaRegional,
        updatedAt: new Date(),
      },
      select: { id: true, noPo: true, unitProduksiId: true, regional: true },
    });
    return NextResponse.json({ ok: true, po });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
