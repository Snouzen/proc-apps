import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "pusat") {
      return NextResponse.json(
        { error: "Forbidden: Hanya Pusat yang dapat mengakses debug PO" },
        { status: 403 }
      );
    }

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
