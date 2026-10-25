import { resolvePoScope } from "@/lib/resolvePoScope";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { cacheGet, cacheSet, cacheClearPrefix, invalidatePoCache } from "@/lib/ttl-cache";
import { getRegionalSynonyms, checkPOOwnership } from "@/lib/utils/regional";
import { hasPermission } from "@/lib/accessControl";
import { canonicalInvoiceNumber } from "@/lib/utils/invoice";
import { z } from "zod";

const ChecklistItemUpdateSchema = z.object({
  id: z.string().min(1, "ID PO wajib diisi"),
  statusTagih: z.boolean().optional(),
  buktiTagih: z.string().nullable().optional(),
  statusBayar: z.boolean().optional(),
  buktiBayar: z.string().nullable().optional(),
  statusKirim: z.boolean().optional(),
  buktiKirim: z.string().nullable().optional(),
  noInvoice: z.string().nullable().optional(),
});

const ChecklistBatchUpdateSchema = z.object({
  updates: z
    .array(ChecklistItemUpdateSchema)
    .min(1, "Daftar pembaruan checklist tidak boleh kosong")
    .max(100, "Batas maksimal pembaruan checklist adalah 100 PO per permintaan"),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;

    const canView =
      (await hasPermission(safeRole, "check_view")) ||
      (await hasPermission(safeRole, "po_view"));
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin melihat checklist dokumen (check_view)" },
        { status: 403 }
      );
    }

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
    if ((safeRole === "rm" && !overrideRegional?.trim()) ||
        (safeRole === "sitearea" && !overrideSiteArea?.trim())) {
      return NextResponse.json({ error: "Scope akun belum dikonfigurasi" }, { status: 403 });
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

    baseConditions.push(await resolvePoScope(auth));

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
    const userRegional = dbUser?.regional || session?.regional || null;
    const userSiteArea = dbUser?.siteArea || session?.siteArea || null;

    const canUpdate =
      (await hasPermission(safeRole, "check_update")) ||
      (await hasPermission(safeRole, "po_invoice")) ||
      (await hasPermission(safeRole, "po_edit"));
    if (!canUpdate) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengubah status dokumen checklist (check_update)" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = ChecklistBatchUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Format pembaruan dokumen tidak valid" },
        { status: 400 }
      );
    }
    const { updates } = parsed.data;

    // Perform transaction to update multiple rows with increased timeout and batching
    await prisma.$transaction(
      async (tx) => {
        const ids = updates.map((u) => u.id).filter(Boolean);
        if (ids.length === 0) return;

        // Kunci baris terlebih dahulu dengan urutan konsisten (ORDER BY id ASC FOR UPDATE)
        const sortedIds = Array.from(new Set(ids)).sort();
        await tx.$queryRaw`
          SELECT id FROM "PurchaseOrder" WHERE id = ANY(${sortedIds}::text[]) ORDER BY id ASC FOR UPDATE
        `;

        // 1. Batch fetch old records in a single query (now safely locked)
        const oldRecords = await tx.purchaseOrder.findMany({
          where: { id: { in: sortedIds } },
          include: { UnitProduksi: true },
        });

        const oldMap = new Map(oldRecords.map((r) => [r.id, r]));
        const missingIds = sortedIds.filter((id) => !oldMap.has(id));
        if (missingIds.length > 0) {
          throw new Error(`NOT_FOUND: PO dengan ID berikut tidak ditemukan: ${missingIds.join(", ")}`);
        }

        // Verifikasi kepemilikan dan wewenang wilayah untuk setiap PO
        for (const po of oldRecords) {
          const check = checkPOOwnership(po, safeRole, userRegional, userSiteArea);
          if (!check.allowed) {
            throw new Error(`FORBIDDEN: ${check.reason}`);
          }
        }

        const auditEntries: any[] = [];
        const updatePromises = updates.map(async (update) => {
          const oldData = oldMap.get(update.id);
          if (!oldData) return null;

          const dataToUpdate: any = { updatedAt: new Date() };
          if (update.statusTagih !== undefined) dataToUpdate.statusTagih = update.statusTagih;
          if (update.buktiTagih !== undefined) dataToUpdate.buktiTagih = update.buktiTagih;
          if (update.statusBayar !== undefined) dataToUpdate.statusBayar = update.statusBayar;
          if (update.buktiBayar !== undefined) {
            dataToUpdate.buktiBayar = update.buktiBayar;
            if (update.buktiBayar && update.buktiBayar.trim() !== "") {
              dataToUpdate.statusBayar = true;
            }
          }
          if (update.statusKirim !== undefined) dataToUpdate.statusKirim = update.statusKirim;
          if (update.buktiKirim !== undefined) dataToUpdate.buktiKirim = update.buktiKirim;
          if (update.noInvoice !== undefined) {
            dataToUpdate.noInvoice = canonicalInvoiceNumber(update.noInvoice);
          }

          const updated = await tx.purchaseOrder.update({
            where: { id: update.id },
            data: dataToUpdate,
          });

          auditEntries.push({
            entityId: oldData.id,
            entity: "PurchaseOrder",
            action: "UPDATE",
            oldData: oldData as any,
            newData: updated as any,
            userId: dbUser?.id || null,
            userName: getProfileName(session, dbUser) || null,
            userRole: safeRole || null,
          });

          return updated;
        });

        await Promise.all(updatePromises);

        // 2. Batch insert audit logs in a single query
        if (auditEntries.length > 0) {
          await tx.auditLog.createMany({
            data: auditEntries,
          });
        }
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    // Invalidate cache
    invalidatePoCache();
    
    return NextResponse.json({ success: true, message: "Data berhasil disimpan" });
  } catch (error: any) {
    console.error("Checklist Docs POST error:", error);
    const msg = error?.message || "Internal server error";
    const status = msg.includes("NOT_FOUND") ? 404 : msg.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json(
      { error: msg.replace(/^(?:Error:\s*)?(?:NOT_FOUND:\s*|FORBIDDEN:\s*)?/, "") },
      { status }
    );
  }
}
