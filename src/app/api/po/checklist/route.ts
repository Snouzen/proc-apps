import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import { cacheGet, cacheSet, cacheClearPrefix } from "@/lib/ttl-cache";
import { getRegionalSynonyms } from "@/lib/utils/regional";

export async function GET(req: NextRequest) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;

    const { searchParams } = new URL(req.url);

    // --- RBAC LOGIC ---
    let overrideRegional: string | null = null;
    let overrideSiteArea: string | null = null;
    if (safeRole === 'sitearea') {
      overrideRegional = dbUser?.regional || (session as any)?.user_metadata?.regional || null;
      overrideSiteArea = dbUser?.siteArea || (session as any)?.user_metadata?.siteArea || null;
    } else if (safeRole === 'rm') {
      overrideRegional = dbUser?.regional || (session as any)?.regional || null;
    }
    const limit = Number(searchParams.get("limit") || "10");
    const offset = Number(searchParams.get("offset") || "0");
    const q = searchParams.get("q") || "";
    
    // NEW FILTERS
    const ritel = searchParams.get("ritel") || "";
    const inisial = searchParams.get("inisial") || "";
    const tujuan = searchParams.get("tujuan") || "";
    const tglFrom = searchParams.get("tglFrom") || "";
    const tglTo = searchParams.get("tglTo") || "";

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

    const pendingKirimCondition = {
      OR: [
        { statusKirim: false },
        { buktiKirim: null },
        { buktiKirim: "" }
      ]
    };

    const completedKirimCondition = {
      AND: [
        { statusKirim: true },
        { buktiKirim: { not: null } },
        { buktiKirim: { not: "" } }
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

    const baseConditions: any[] = [];
    if (q) baseConditions.push(searchCondition);
    if (ritel) baseConditions.push({ RitelModern: { namaPt: ritel } });
    if (inisial) baseConditions.push({ RitelModern: { inisial } });
    if (tujuan) baseConditions.push({ RitelModern: { tujuan } });
    if (tglFrom && tglTo) {
      baseConditions.push({
        tglPo: {
          gte: new Date(tglFrom),
          lte: new Date(tglTo),
        },
      });
    } else if (tglFrom) {
      baseConditions.push({ tglPo: { gte: new Date(tglFrom) } });
    } else if (tglTo) {
      baseConditions.push({ tglPo: { lte: new Date(tglTo) } });
    }

    // Apply RBAC filters
    if (safeRole === "rm" && overrideRegional) {
      const syn = getRegionalSynonyms(overrideRegional);
      baseConditions.push({
        OR: [
          ...syn.map((s) => ({ regional: { contains: s, mode: "insensitive" as const } })),
          { UnitProduksi: { OR: syn.map((s) => ({ namaRegional: { contains: s, mode: "insensitive" as const } })) } }
        ]
      });
    }

    if (safeRole === "sitearea" && overrideSiteArea) {
      const sa = overrideSiteArea.trim();
      baseConditions.push({
        UnitProduksi: { siteArea: { contains: sa, mode: "insensitive" as const } }
      });
      if (overrideRegional) {
        const syn = getRegionalSynonyms(overrideRegional);
        baseConditions.push({
          OR: [
            ...syn.map((s) => ({ regional: { contains: s, mode: "insensitive" as const } })),
            { UnitProduksi: { OR: syn.map((s) => ({ namaRegional: { contains: s, mode: "insensitive" as const } })) } }
          ]
        });
      }
    }

    const wherePending: any = { AND: [pendingCondition, ...baseConditions] };
    const whereCompleted: any = { AND: [completedCondition, ...baseConditions] };
    const wherePendingKirim: any = { AND: [pendingKirimCondition, ...baseConditions] };
    const whereCompletedKirim: any = { AND: [completedKirimCondition, ...baseConditions] };
    const wherePendingBayar: any = { AND: [pendingBayarCondition, ...baseConditions] };
    const whereCompletedBayar: any = { AND: [completedBayarCondition, ...baseConditions] };
    const whereTotal: any = baseConditions.length > 0 ? { AND: baseConditions } : {};

    const filter = searchParams.get("filter") || "pending";
    const activeWhere = filter === "completed" ? whereCompleted : 
                        filter === "pending_kirim" ? wherePendingKirim : 
                        filter === "completed_kirim" ? whereCompletedKirim : 
                        filter === "pending_bayar" ? wherePendingBayar : 
                        filter === "completed_bayar" ? whereCompletedBayar : 
                        filter === "total" ? whereTotal : wherePending;

    const totalCacheKey = `checklist_summary:${safeRole}:${overrideRegional || "all"}:${overrideSiteArea || "all"}:${q}:${ritel}:${inisial}:${tujuan}:${tglFrom}:${tglTo}`;
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
        buktiKirim: true,
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
      const [totalPo, pendingTagih, completedTagih, pendingKirim, completedKirim, pendingBayar, completedBayar, fetchedData] = await Promise.all([
        prisma.purchaseOrder.count({ where: whereTotal }),
        prisma.purchaseOrder.count({ where: wherePending }),
        prisma.purchaseOrder.count({ where: whereCompleted }),
        prisma.purchaseOrder.count({ where: wherePendingKirim }),
        prisma.purchaseOrder.count({ where: whereCompletedKirim }),
        prisma.purchaseOrder.count({ where: wherePendingBayar }),
        prisma.purchaseOrder.count({ where: whereCompletedBayar }),
        findManyPromise
      ]);
      summary = { totalPo, pendingTagih, completedTagih, pendingKirim, completedKirim, pendingBayar, completedBayar };
      data = fetchedData;
      cacheSet(totalCacheKey, summary, 60000); // 1 minute cache
    }

    let activeTotal = summary.pendingTagih;
    if (filter === "completed") activeTotal = summary.completedTagih;
    else if (filter === "total") activeTotal = summary.totalPo;
    else if (filter === "pending_kirim") activeTotal = summary.pendingKirim;
    else if (filter === "completed_kirim") activeTotal = summary.completedKirim;
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
        if (update.statusKirim !== undefined) dataToUpdate.statusKirim = update.statusKirim;
        if (update.buktiKirim !== undefined) dataToUpdate.buktiKirim = update.buktiKirim;
        
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
