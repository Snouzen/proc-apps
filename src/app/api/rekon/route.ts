import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    
    // --- CASE 1: Fetch Single Reconcile by ID (For Edit/Draft) ---
    if (idParam) {
      const rekon = await prisma.reconcile.findUnique({
        where: { id: idParam },
        include: { RitelModern: true }
      });

      if (!rekon) return NextResponse.json({ error: "Data not found" }, { status: 404 });

      // Fetch Full Invoice Details
      const detailedInvoices = await prisma.purchaseOrder.findMany({
        where: { noInvoice: { in: rekon.invoices || [] } },
        include: { UnitProduksi: true, Items: { include: { Product: true } } }
      });

      // Calculate totals for invoices (preserve duplicates — user may have same invoice twice)
      const invoicesWithTotals = (rekon.invoices || []).map((invNo: string, idx: number) => {
        const p = detailedInvoices.find(x => x.noInvoice === invNo);
        const total = p?.Items?.reduce((sum: number, item: any) => {
          return sum + (Number(item.rpTagih) || (Number(item.hargaPcs) * Number(item.pcsKirim)) || 0);
        }, 0) || 0;
        const produkNames = (p?.Items || []).map((item: any) => item.Product?.name).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ");
        
        return { 
          id: (p?.id || invNo) + "-inv-" + idx, 
          noInvoice: invNo, 
          noPo: p?.noPo || "-", 
          companyId: p?.ritelId || "", 
          total: total,
          unitProduksi: p?.UnitProduksi?.namaRegional || "-",
          siteArea: p?.UnitProduksi?.siteArea || "-",
          produk: produkNames || "-"
        };
      });

      // Fetch Full RTV Details
      const detailedRtvs = await prisma.dataRetur.findMany({
        where: { rtvCn: { in: rekon.rtvs || [] } },
        include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true }
      });
      // Map RTVs (preserve duplicates — user may have same RTV number twice)
      const rtvCounts: Record<string, number> = {};
      const rtvsWithData = (rekon.rtvs || []).map((rtvNo: string, idx: number) => {
        const matches = detailedRtvs.filter(r => r.rtvCn === rtvNo);
        const count = rtvCounts[rtvNo] || 0;
        const rtvData = matches[count] || matches[matches.length - 1];
        rtvCounts[rtvNo] = count + 1;

        return {
          id: rtvData?.id,
          noRtv: rtvNo,
          total: Number(rtvData?.nominal || 0),
          qty: rtvData?.qtyReturn || 0,
          refInvoice: rtvData?.invoiceRekon || rtvData?.referensiPembayaran || "",
          pembebananRetur: rtvData?.PembebananReturn?.siteArea || "-",
          lokasiBarang: rtvData?.LokasiBarang?.siteArea || "-",
          produk: rtvData?.Product?.name || rtvData?.produk || "-",
          unitProduksi: rtvData?.LokasiBarang?.namaRegional || rtvData?.PembebananReturn?.namaRegional || "-",
          tujuan: rtvData?.namaCompany || rtvData?.RitelModern?.tujuan || "-",
          rpKg: Number(rtvData?.rpKg || 0),
          tanggalRtv: rtvData?.tanggalRtv || null,
        };
      });

      // Fetch Promos if exists
      let promoData: any[] = [];
      if (rekon.noPromo) {
        const promoNumbers = rekon.noPromo.split(',').map((n: string) => n.trim()).filter(Boolean);
        if (promoNumbers.length > 0) {
          promoData = await prisma.promo.findMany({ where: { nomor: { in: promoNumbers } } });
        }
      }

      // Normalize notes: support new array format + backward compat with legacy single fields
      let normalizedNotes: Array<{desc: string, nominal: number}> = [];
      if (Array.isArray(rekon.notes) && (rekon.notes as any[]).length > 0) {
        normalizedNotes = rekon.notes as any[];
      } else if (rekon.notesDesc || rekon.notesNominal) {
        normalizedNotes = [{ desc: rekon.notesDesc || "", nominal: rekon.notesNominal || 0 }];
      }

      return NextResponse.json({ 
        data: {
          ...rekon,
          notes: normalizedNotes,
          detailedInvoices: invoicesWithTotals,
          detailedRtvs: rtvsWithData,
          detailedPromos: promoData
        } 
      });
    }

    // --- CASE 2: List Data with Filtering ---
    const q = searchParams.get("q") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Filter Logic
    const where: any = {};
    
    if (q) {
      where.OR = [
        { noRekonsiliasi: { contains: q, mode: "insensitive" } },
        { RitelModern: { namaPt: { contains: q, mode: "insensitive" } } }
      ];
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    } else if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
    }

    // Fetch Count & Data
    const [total, reconciles] = await Promise.all([
      prisma.reconcile.count({ where }),
      prisma.reconcile.findMany({
        where,
        include: { RitelModern: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      })
    ]);

    // 2. Lookup SEMUA Detail sekaligus (Bulk) untuk performa
    const allInvNos = [...new Set(reconciles.flatMap(r => r.invoices || []))];
    const allRtvNos = [...new Set(reconciles.flatMap(r => r.rtvs || []))];
    const allPromoNos = [...new Set(reconciles.flatMap(r => (r.noPromo || "").split(",").map((p: string) => p.trim()).filter(Boolean)))];

      const [posData, retursData, promosData] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: { noInvoice: { in: allInvNos } },
          include: { UnitProduksi: true, Items: { include: { Product: true } } }
        }),
        prisma.dataRetur.findMany({
          where: { rtvCn: { in: allRtvNos } },
          include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true }
        }),
        prisma.promo.findMany({
          where: { nomor: { in: allPromoNos } }
        })
      ]);

      // Create lookup maps for O(1) speed
      const promoMap = new Map<string, any>();
      promosData.forEach((p: any) => promoMap.set(p.nomor, p));
      const poMap = new Map(posData.map((p: any) => {
        const total = p.Items?.reduce((sum: number, item: any) => {
          return sum + (Number(item.rpTagih) || (Number(item.hargaPcs) * Number(item.pcsKirim)) || 0);
        }, 0) || 0;
        const produkNames = (p.Items || []).map((item: any) => item.Product?.name).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ");
        return [p.noInvoice, { ...p, calculatedTotal: total, produkNames }];
      }));
      const returMap = new Map<string, any[]>();
      retursData.forEach((r: any) => {
        if (!returMap.has(r.rtvCn)) returMap.set(r.rtvCn, []);
        returMap.get(r.rtvCn)!.push(r);
      });

      // 3. Gabungkan Data
      const data = reconciles.map((rekon) => {
        const invoicesWithData = (rekon.invoices || []).map(invNo => {
          const po = poMap.get(invNo);
          return {
            noInvoice: invNo,
            nominal: po?.calculatedTotal || 0,
            unitProduksi: po?.UnitProduksi?.namaRegional || "-",
            siteArea: po?.UnitProduksi?.siteArea || "-",
            produk: po?.produkNames || "-",
          };
        });

        const rtvCounts: Record<string, number> = {};
        const rtvsWithData = (rekon.rtvs || []).map(rtvNo => {
          const matches = returMap.get(rtvNo) || [];
          const count = rtvCounts[rtvNo] || 0;
          const retur = matches[count] || matches[matches.length - 1];
          rtvCounts[rtvNo] = count + 1;
          
          return {
            id: retur?.id,
            noRtv: rtvNo,
            refInvoice: retur?.invoiceRekon || retur?.referensiPembayaran || "-",
            nominal: Number(retur?.nominal || 0),
            pembebananRetur: retur?.PembebananReturn?.siteArea || "-",
            unitProduksi: retur?.LokasiBarang?.namaRegional || retur?.PembebananReturn?.namaRegional || "-",
            lokasiBarang: retur?.LokasiBarang?.siteArea || "-",
            produk: retur?.Product?.name || retur?.produk || "-",
            tujuan: retur?.namaCompany || retur?.RitelModern?.tujuan || "-",
            rpKg: Number(retur?.rpKg || 0),
            qty: retur?.qtyReturn || retur?.qty || retur?.pcs || 1,
            tanggalRtv: retur?.tanggalRtv || null,
          };
        });

      // Normalize notes for this rekon
      let normalizedNotes: any[] = [];
      if (Array.isArray(rekon.notes) && (rekon.notes as any[]).length > 0) {
        normalizedNotes = rekon.notes as any[];
      } else if (rekon.notesDesc || rekon.notesNominal) {
        normalizedNotes = [{ desc: rekon.notesDesc || "", nominal: rekon.notesNominal || 0 }];
      }

      const promoNumbers = (rekon.noPromo || "").split(",").map((p: string) => p.trim()).filter(Boolean);
      const detailedPromos = promoNumbers.map((nomor: string) => promoMap.get(nomor)).filter(Boolean);

      return { ...rekon, notes: normalizedNotes, invoices: invoicesWithData, rtvs: rtvsWithData, promos: detailedPromos };
    });

    // ── BACKFILL: Sync buktiBayar on POs for finalized rekons ──
    // Runs efficiently — only updates POs where buktiBayar is still null/empty
    try {
      const finalRekons = reconciles.filter(r => r.status === "final" && r.noRekonsiliasi && (r.invoices || []).length > 0);
      if (finalRekons.length > 0) {
        const backfillOps = finalRekons.map(r =>
          prisma.purchaseOrder.updateMany({
            where: {
              noInvoice: { in: r.invoices || [] },
              OR: [
                { buktiBayar: null },
                { buktiBayar: "" },
                { buktiBayar: "-" },
              ],
            },
            data: { buktiBayar: r.noRekonsiliasi },
          })
        );
        // Fire-and-forget — don't block the response
        Promise.all(backfillOps).catch(err => console.error("Backfill buktiBayar error:", err));
      }
    } catch (e) {
      // Silently fail — backfill is best-effort
      console.error("Backfill buktiBayar setup error:", e);
    }

    return NextResponse.json({ data, total });
  } catch (error: any) {
    console.error("GET Rekon Data Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { 
      ritelId, 
      bankStatement, 
      biayaAdmin, 
      totalInvoices,
      totalRtvs,
      totalPromo,
      nominal, 
      invoices, 
      rtvs, 
      noPromo,
      notes,
      buktiBayarUrl,
      rincianBayarUrl,
      tglBayar,
      status = "final",
      id // Cek apakah ini edit/update dari draft
    } = body;

    // Compute backward-compat fields from notes array
    const notesArray: Array<{desc: string, nominal: number}> = Array.isArray(notes) ? notes : [];
    const computedNotesDesc = notesArray.map((n: any) => n.desc).filter(Boolean).join(' | ') || null;
    const computedNotesNominal = notesArray.reduce((sum: number, n: any) => sum + (Number(n.nominal) || 0), 0);
    let GeneratedNoRekon = "";
    let finalId = id;

    // 1. Generate No. Rekonsiliasi Only for NEW records
    if (!finalId) {
      // Wrap in transaction to prevent race condition on concurrent requests
      const { generatedNo, generatedId } = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const datePattern = `${month}/${year}`;

        // Ambil record terakhir untuk memastikan nomor berurutan
        const lastRecord = await tx.reconcile.findFirst({
          orderBy: { createdAt: 'desc' }
        });

        let nextNumber = 1;
        if (lastRecord && lastRecord.noRekonsiliasi) {
          const match = lastRecord.noRekonsiliasi.match(/R-(\d+)\//);
          if (match && match[1]) {
            nextNumber = parseInt(match[1], 10) + 1;
          } else {
            const countAll = await tx.reconcile.count();
            nextNumber = countAll + 1;
          }
        }

        return {
          generatedNo: `R-${String(nextNumber).padStart(3, '0')}/${datePattern}`,
          generatedId: crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase(),
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      GeneratedNoRekon = generatedNo;
      finalId = generatedId;
    }

    // 3. Simpan / Update Database
    const newRekon = await prisma.reconcile.upsert({
      where: { id: finalId },
      update: {
        ritelId,
        bankStatement: Number(bankStatement) || 0,
        biayaAdmin: Number(biayaAdmin) || 0,
        totalInvoices: Number(totalInvoices) || 0,
        totalRtvs: Number(totalRtvs) || 0,
        totalPromo: Number(totalPromo) || 0,
        nominal: Number(nominal) || 0,
        invoices: invoices || [],
        rtvs: Array.isArray(rtvs) ? rtvs.map((r: any) => typeof r === 'string' ? r : r.noRtv) : [],
        notes: notesArray.length > 0 ? notesArray : undefined,
        notesDesc: computedNotesDesc,
        notesNominal: computedNotesNominal,
        noPromo: noPromo || null,
        buktiBayarUrl: buktiBayarUrl || undefined,
        rincianBayarUrl: rincianBayarUrl || undefined,
        tglBayar: tglBayar ? new Date(tglBayar) : undefined,
        status: status || "final",
      },
      create: {
        id: finalId,
        noRekonsiliasi: GeneratedNoRekon,
        ritelId,
        bankStatement: Number(bankStatement) || 0,
        biayaAdmin: Number(biayaAdmin) || 0,
        totalInvoices: Number(totalInvoices) || 0,
        totalRtvs: Number(totalRtvs) || 0,
        totalPromo: Number(totalPromo) || 0,
        nominal: Number(nominal) || 0,
        invoices: invoices || [],
        rtvs: Array.isArray(rtvs) ? rtvs.map((r: any) => typeof r === 'string' ? r : r.noRtv) : [],
        notes: notesArray.length > 0 ? notesArray : undefined,
        notesDesc: computedNotesDesc,
        notesNominal: computedNotesNominal,
        noPromo: noPromo || null,
        buktiBayarUrl: buktiBayarUrl || null,
        rincianBayarUrl: rincianBayarUrl || null,
        tglBayar: tglBayar ? new Date(tglBayar) : null,
        status: status || "final",
      }
    });

    // 4. SYNC: Update referensi invoice di tabel DataRetur secara otomatis & Tracking History
    if (Array.isArray(rtvs)) {
      const validRtvs = rtvs.filter((r: any) => typeof r === 'object' && r.noRtv && r.refInvoice);
      
      if (validRtvs.length > 0) {
        const whereOr = validRtvs.map((r: any) => r.id ? { id: r.id } : { rtvCn: r.noRtv });
        const allOldData = await prisma.dataRetur.findMany({ where: { OR: whereOr } });
        
        const updatePromises = validRtvs.map((r: any) => {
          const whereClause: any = r.id ? { id: r.id } : { rtvCn: r.noRtv };
          const oldData = allOldData.find((d: any) => r.id ? d.id === r.id : d.rtvCn === r.noRtv);
          
          const updatePayload: any = { invoiceRekon: r.refInvoice };
          if (oldData && oldData.invoiceRekon && oldData.invoiceRekon !== r.refInvoice) {
             updatePayload.referensiPembayaran = oldData.invoiceRekon;
          }
          
          return prisma.dataRetur.updateMany({
            where: whereClause,
            data: updatePayload
          });
        });
        
        await prisma.$transaction(updatePromises);
      }
    }

    // 5. SYNC: Auto-fill buktiBayar on PurchaseOrder when rekon is submitted (not draft)
    const rekonStatus = status || "final";
    const rekonNo = newRekon.noRekonsiliasi;
    const invoiceList: string[] = Array.isArray(invoices) ? invoices.filter(Boolean) : [];

    if (rekonStatus === "final" && invoiceList.length > 0 && rekonNo) {
      // Update all POs matching the invoice numbers — set buktiBayar to the rekon code
      await prisma.purchaseOrder.updateMany({
        where: {
          noInvoice: { in: invoiceList },
        },
        data: {
          buktiBayar: rekonNo,
        },
      });
    }

    return NextResponse.json({ success: true, data: newRekon });
  } catch (error: any) {
    console.error("POST Rekon Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.reconcile.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Rekon Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
