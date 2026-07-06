import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-cleanup: Hapus log yang umurnya lebih dari 7 hari (memasuki hari ke-8)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Fire and forget (or await if you want to ensure it finishes before query)
    await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo }
      }
    });

    // Ambil 15 aktivitas terbaru
    const activities = await prisma.auditLog.findMany({
      where: {
        entity: {
          in: ["PurchaseOrder", "Reconcile", "DataRetur", "CreditLimitBatch"]
        },
        action: "CREATE"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 15
    });

    const enrichedActivities = await Promise.all(activities.map(async (act) => {
      let refNumber = null;
      if (act.entity === "PurchaseOrder") {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: act.entityId }, select: { noPo: true } });
        refNumber = po?.noPo;
      } else if (act.entity === "Reconcile") {
        const rekon = await prisma.reconcile.findUnique({ where: { id: act.entityId }, select: { noRekonsiliasi: true } });
        refNumber = rekon?.noRekonsiliasi;
      } else if (act.entity === "DataRetur" && !act.entityId.startsWith("batch-")) {
        const retur = await prisma.dataRetur.findUnique({ where: { id: act.entityId }, select: { rtvCn: true } });
        refNumber = retur?.rtvCn;
      }
      
      return {
        ...act,
        refNumber
      };
    }));

    return NextResponse.json({ data: enrichedActivities });
  } catch (error: any) {
    console.error("GET Activities Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
