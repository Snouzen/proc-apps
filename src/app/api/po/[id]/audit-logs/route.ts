import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only pusat can view audit logs
    if (auth.role !== "pusat") {
      return NextResponse.json({ error: "Forbidden: Pusat role required" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "PO ID is required" }, { status: 400 });
    }

    // Ambil log untuk PO dan item-item PO tersebut
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: id, entity: "PurchaseOrder" },
          { 
            entity: "PurchaseOrderItem",
            // Karena kita butuh log POItem, kita ambil item terkait dari PO ini
            entityId: {
              in: (await prisma.purchaseOrderItem.findMany({
                where: { purchaseOrderId: id },
                select: { id: true }
              })).map(item => item.id)
            }
          }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: logs });
  } catch (error: any) {
    console.error("Audit Logs GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
