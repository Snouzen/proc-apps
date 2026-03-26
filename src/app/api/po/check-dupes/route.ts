import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const list = Array.isArray(body?.noPoList) ? body.noPoList : [];
    if (!list.length) {
      return NextResponse.json({ exists: [] });
    }

    const rows = await prisma.purchaseOrder.findMany({
      where: { noPo: { in: list.map((s: any) => String(s)) } },
      select: { noPo: true },
    });
    return NextResponse.json({
      exists: rows.map((r: { noPo: string }) => r.noPo),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
