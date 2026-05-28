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
    const whereTotal: any = q ? searchCondition : {};

    const filter = searchParams.get("filter") || "pending";
    const activeWhere = filter === "completed" ? whereCompleted : filter === "total" ? whereTotal : wherePending;

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
      const [totalPo, pendingTagih, completedTagih, fetchedData] = await Promise.all([
        prisma.purchaseOrder.count({ where: whereTotal }),
        prisma.purchaseOrder.count({ where: wherePending }),
        prisma.purchaseOrder.count({ where: whereCompleted }),
        findManyPromise
      ]);
      summary = { totalPo, pendingTagih, completedTagih };
      data = fetchedData;
      cacheSet(totalCacheKey, summary, 60000); // 1 minute cache
    }

    const activeTotal = filter === "completed" ? summary.completedTagih : filter === "total" ? summary.totalPo : summary.pendingTagih;

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
      updates.map((update: any) => 
        prisma.purchaseOrder.update({
          where: { id: update.id },
          data: {
            statusTagih: update.statusTagih,
            buktiTagih: update.buktiTagih,
            updatedAt: new Date(),
          }
        })
      )
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
