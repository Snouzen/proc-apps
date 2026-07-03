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

    return NextResponse.json({ data: activities });
  } catch (error: any) {
    console.error("GET Activities Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
