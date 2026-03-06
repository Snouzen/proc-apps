import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const list = Array.isArray(body?.noPoList) ? body.noPoList : [];
    if (!list.length) {
      return NextResponse.json({ exists: [] });
    }

    try {
      const rows = await prisma.purchaseOrder.findMany({
        where: { noPo: { in: list.map((s: any) => String(s)) } },
        select: { noPo: true },
      });
      return NextResponse.json({ exists: rows.map((r) => r.noPo) });
    } catch (e: any) {
      // Fallback raw SQL if Prisma client shape mismatches
      const sql = `SELECT "noPo" FROM "PurchaseOrder" WHERE "noPo" = ANY($1::text[])`;
      const rows: Array<{ noPo: string }> = (await prisma.$queryRawUnsafe(
        sql,
        list,
      )) as any;
      return NextResponse.json({ exists: rows.map((r) => r.noPo) });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

