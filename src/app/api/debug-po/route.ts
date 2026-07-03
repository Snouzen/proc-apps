import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const noPo = searchParams.get("noPo");
    
    if (!noPo) return NextResponse.json({ error: "noPo is required" }, { status: 400 });

    const po = await prisma.purchaseOrder.findFirst({
      where: { noPo }
    });

    if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });

    const rekons = await prisma.reconcile.findMany({
      where: {
        invoices: {
          has: po.noInvoice
        }
      }
    });

    return NextResponse.json({ 
      po,
      usedInRekons: rekons.map(r => ({
        id: r.id,
        noRekonsiliasi: r.noRekonsiliasi,
        status: r.status,
        ritelId: r.ritelId
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
