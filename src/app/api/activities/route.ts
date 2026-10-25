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

    // Ambil 15 aktivitas terbaru untuk entitas operasional bisnis
    // (Mengecualikan log internal keamanan seperti RateLimit dan RevokedSession)
    const activities = await prisma.auditLog.findMany({
      where: {
        entity: {
          in: ["PurchaseOrder", "Reconcile", "DataRetur", "CreditLimitBatch"],
        },
        action: "CREATE",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 15,
    });

    if (activities.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Batch resolve reference numbers to eliminate N+1 queries
    const poIds = activities
      .filter((a) => a.entity === "PurchaseOrder")
      .map((a) => a.entityId);
    const rekonIds = activities
      .filter((a) => a.entity === "Reconcile")
      .map((a) => a.entityId);
    const returIds = activities
      .filter((a) => a.entity === "DataRetur" && !a.entityId.startsWith("batch-"))
      .map((a) => a.entityId);

    const [pos, rekons, returs] = await Promise.all([
      poIds.length > 0
        ? prisma.purchaseOrder.findMany({
            where: { id: { in: poIds } },
            select: { id: true, noPo: true },
          })
        : [],
      rekonIds.length > 0
        ? prisma.reconcile.findMany({
            where: { id: { in: rekonIds } },
            select: { id: true, noRekonsiliasi: true },
          })
        : [],
      returIds.length > 0
        ? prisma.dataRetur.findMany({
            where: { id: { in: returIds } },
            select: { id: true, rtvCn: true },
          })
        : [],
    ]);

    const poMap = new Map(pos.map((p) => [p.id, p.noPo]));
    const rekonMap = new Map(rekons.map((r) => [r.id, r.noRekonsiliasi]));
    const returMap = new Map(returs.map((r) => [r.id, r.rtvCn]));

    const enrichedActivities = activities.map((act) => {
      let refNumber: string | null = null;
      if (act.entity === "PurchaseOrder") {
        refNumber = poMap.get(act.entityId) || (act.newData as any)?.noPo || null;
      } else if (act.entity === "Reconcile") {
        refNumber = rekonMap.get(act.entityId) || (act.newData as any)?.noRekonsiliasi || null;
      } else if (act.entity === "DataRetur") {
        refNumber = returMap.get(act.entityId) || (act.newData as any)?.rtvCn || null;
      }

      return {
        ...act,
        refNumber,
      };
    });

    return NextResponse.json({ data: enrichedActivities });
  } catch (error: any) {
    console.error("GET Activities Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
