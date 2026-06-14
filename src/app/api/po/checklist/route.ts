import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import { cacheGet, cacheSet, cacheClearPrefix } from "@/lib/ttl-cache";

export async function GET(req: NextRequest) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;
    
    if (safeRole !== "magang" && safeRole !== "pusat") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "10");
    const offset = Number(searchParams.get("offset") || "0");
    const q = searchParams.get("q") || "";

    const pendingCondition = {
      OR: [
        { statusTagih: false },
        { buktiTagih: null },
        { buktiTagih: "" }
      ]
    };

    const completedCondition = {
      AND: [
        { statusTagih: true },
        { buktiTagih: { not: null } },
        { buktiTagih: { not: "" } }
      ]
    };

    const pendingBayarCondition = {
      OR: [
        { statusBayar: false },
        { buktiBayar: null },
        { buktiBayar: "" }
      ]
    };

    const completedBayarCondition = {
      AND: [
        { statusBayar: true },
        { buktiBayar: { not: null } },
        { buktiBayar: { not: "" } }
      ]
    };

    const searchCondition = q ? {
      OR: [
        { noPo: { contains: q, mode: "insensitive" } },
        { noInvoice: { contains: q, mode: "insensitive" } },
        { RitelModern: { namaPt: { contains: q, mode: "insensitive" } } },
        { UnitProduksi: { siteArea: { contains: q, mode: "insensitive" } } }
      ]
    } : {};

    const wherePending: any = { AND: [pendingCondition, ...(q ? [searchCondition] : [])] };
    const whereCompleted: any = { AND: [completedCondition, ...(q ? [searchCondition] : [])] };
    const wherePendingBayar: any = { AND: [pendingBayarCondition, ...(q ? [searchCondition] : [])] };
    const whereCompletedBayar: any = { AND: [completedBayarCondition, ...(q ? [searchCondition] : [])] };
    const whereTotal: any = q ? searchCondition : {};

    const filter = searchParams.get("filter") || "pending";
    const activeWhere = filter === "completed" ? whereCompleted : 
                        filter === "pending_bayar" ? wherePendingBayar : 
                        filter === "completed_bayar" ? whereCompletedBayar : 
                        filter === "total" ? whereTotal : wherePending;

    const totalCacheKey = `checklist_summary:${q}`;
    let summary = cacheGet<any>(totalCacheKey);
    let data;

    const findManyPromise = prisma.purchaseOrder.findMany({
      where: activeWhere,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        noPo: true,
        noInvoice: true,
        tglPo: true,
        expiredTgl: true,
        regional: true,
        statusTagih: true,
        buktiTagih: true,
        tglkirim: true,
        linkPo: true,
        statusKirim: true,
        statusSdif: true,
        statusPo: true,
        statusFp: true,
        statusKwi: true,
        statusInv: true,
        statusBayar: true,
        remarks: true,
        namaSupir: true,
        platNomor: true,
        tujuanDetail: true,
        buktiBayar: true,
        RitelModern: { select: { namaPt: true, inisial: true } },
        UnitProduksi: { select: { siteArea: true, namaRegional: true } }
      }
    });

    if (summary) {
      data = await findManyPromise;
    } else {
      const [totalPo, pendingTagih, completedTagih, pendingBayar, completedBayar, fetchedData] = await Promise.all([
        prisma.purchaseOrder.count({ where: whereTotal }),
        prisma.purchaseOrder.count({ where: wherePending }),
        prisma.purchaseOrder.count({ where: whereCompleted }),
        prisma.purchaseOrder.count({ where: wherePendingBayar }),
        prisma.purchaseOrder.count({ where: whereCompletedBayar }),
        findManyPromise
      ]);
      summary = { totalPo, pendingTagih, completedTagih, pendingBayar, completedBayar };
      data = fetchedData;
      cacheSet(totalCacheKey, summary, 60000); // 1 minute cache
    }

    let activeTotal = summary.pendingTagih;
    if (filter === "completed") activeTotal = summary.completedTagih;
    else if (filter === "total") activeTotal = summary.totalPo;
    else if (filter === "pending_bayar") activeTotal = summary.pendingBayar;
    else if (filter === "completed_bayar") activeTotal = summary.completedBayar;

    return NextResponse.json({ total: activeTotal, summary, data });
  } catch (error: any) {
    console.error("Checklist Docs GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;
    
    if (safeRole !== "magang" && safeRole !== "pusat") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    // Perform transaction to update multiple rows
    await prisma.$transaction(
      updates.map((update: any) => {
        const dataToUpdate: any = { updatedAt: new Date() };
        if (update.statusTagih !== undefined) dataToUpdate.statusTagih = update.statusTagih;
        if (update.buktiTagih !== undefined) dataToUpdate.buktiTagih = update.buktiTagih;
        if (update.statusBayar !== undefined) dataToUpdate.statusBayar = update.statusBayar;
        if (update.buktiBayar !== undefined) dataToUpdate.buktiBayar = update.buktiBayar;
        
        return prisma.purchaseOrder.update({
          where: { id: update.id },
          data: dataToUpdate
        });
      })
    );

    // Invalidate cache
    cacheClearPrefix("checklist_total:");
    
    return NextResponse.json({ success: true, message: "Data berhasil disimpan" });
  } catch (error: any) {
    console.error("Checklist Docs POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
