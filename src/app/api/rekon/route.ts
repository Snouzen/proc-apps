import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionWithRole, getProfileName, getSession } from "@/lib/auth";
import crypto from "crypto";
import { auditActivity } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const statusParam = searchParams.get("status");
    
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

      // Fetch Full RTV Details — fetch all matches, then prioritize by ritelId
      // RTV numbers (rtvCn) can be duplicated across different ritels with different data
      const detailedRtvs = await prisma.dataRetur.findMany({
        where: { 
          rtvCn: { in: rekon.rtvs || [] },
        },
        include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true }
      });

      // Build a refInvoice lookup from persisted rtvDetails (if available)
      const savedRtvDetails: Array<{id?: string, noRtv: string, refInvoice?: string}> = Array.isArray(rekon.rtvDetails) ? rekon.rtvDetails as any : [];
      let rtvsWithData: any[] = [];

      if (savedRtvDetails.length > 0) {
        rtvsWithData = savedRtvDetails.map(detail => {
          let rtvData = null;
          if (detail.id) {
            rtvData = detailedRtvs.find(r => r.id === detail.id);
          }
          if (!rtvData) {
            const allMatches = detailedRtvs.filter(r => r.rtvCn === detail.noRtv);
            const ritelMatches = allMatches.filter(r => r.ritelId === rekon.ritelId);
            const matches = ritelMatches.length > 0 ? ritelMatches : allMatches;
            rtvData = matches[0];
          }
          
          const refInvoice = detail.refInvoice || rtvData?.invoiceRekon || rtvData?.referensiPembayaran || "";
          
          return {
            id: rtvData?.id || detail.id,
            noRtv: detail.noRtv,
            total: Number(rtvData?.nominal || 0),
            qty: rtvData?.qtyReturn || (rtvData as any)?.qty || (rtvData as any)?.pcs || 1,
            refInvoice,
            pembebananRetur: rtvData?.PembebananReturn?.siteArea || "-",
            lokasiBarang: rtvData?.LokasiBarang?.siteArea || "-",
            produk: rtvData?.Product?.name || rtvData?.produk || "-",
            unitProduksi: rtvData?.LokasiBarang?.namaRegional || rtvData?.PembebananReturn?.namaRegional || "-",
            tujuan: rtvData?.namaCompany || "-",
            rpKg: Number(rtvData?.rpKg || 0),
            tanggalRtv: rtvData?.tanggalRtv || null,
          };
        });
      } else {
        const rtvCounts: Record<string, number> = {};
        rtvsWithData = (rekon.rtvs || []).map((rtvNo: string) => {
          const allMatches = detailedRtvs.filter(r => r.rtvCn === rtvNo);
          const ritelMatches = allMatches.filter(r => r.ritelId === rekon.ritelId);
          const matches = ritelMatches.length > 0 ? ritelMatches : allMatches;
          const count = rtvCounts[rtvNo] || 0;
          const rtvData = matches[count] || matches[matches.length - 1];
          rtvCounts[rtvNo] = count + 1;

          const refInvoice = rtvData?.invoiceRekon || rtvData?.referensiPembayaran || "";

          return {
            id: rtvData?.id,
            noRtv: rtvNo,
            total: Number(rtvData?.nominal || 0),
            qty: rtvData?.qtyReturn || (rtvData as any)?.qty || (rtvData as any)?.pcs || 1,
            refInvoice,
            pembebananRetur: rtvData?.PembebananReturn?.siteArea || "-",
            lokasiBarang: rtvData?.LokasiBarang?.siteArea || "-",
            produk: rtvData?.Product?.name || rtvData?.produk || "-",
            unitProduksi: rtvData?.LokasiBarang?.namaRegional || rtvData?.PembebananReturn?.namaRegional || "-",
            tujuan: rtvData?.namaCompany || "-",
            rpKg: Number(rtvData?.rpKg || 0),
            tanggalRtv: rtvData?.tanggalRtv || null,
          };
        });
      }

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
    const findManyWhere = { ...where };
    if (statusParam === "draft" || statusParam === "final") {
      findManyWhere.status = statusParam;
    }

    const [total, totalDraft, totalCompleted, draftAgg, reconciles] = await Promise.all([
      prisma.reconcile.count({ where }),
      prisma.reconcile.count({ where: { ...where, status: "draft" } }),
      prisma.reconcile.count({ where: { ...where, status: "final" } }),
      prisma.reconcile.aggregate({
        where: { ...where, status: "draft" },
        _sum: { bankStatement: true }
      }),
      prisma.reconcile.findMany({
        where: findManyWhere,
        include: { RitelModern: true },
        orderBy: { updatedAt: "desc" },
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

        const savedRtvDetails: Array<{id?: string, noRtv: string, refInvoice?: string}> = Array.isArray(rekon.rtvDetails) ? rekon.rtvDetails as any : [];
        let rtvsWithData: any[] = [];
        
        if (savedRtvDetails.length > 0) {
          rtvsWithData = savedRtvDetails.map(detail => {
            const allMatches = returMap.get(detail.noRtv) || [];
            let retur = null;
            if (detail.id) {
               retur = allMatches.find(r => r.id === detail.id);
            }
            if (!retur) {
               const ritelMatches = allMatches.filter(r => r.ritelId === rekon.ritelId);
               const matches = ritelMatches.length > 0 ? ritelMatches : allMatches;
               retur = matches[0];
            }
            return {
              id: retur?.id || detail.id,
              noRtv: detail.noRtv,
              refInvoice: detail.refInvoice || retur?.invoiceRekon || retur?.referensiPembayaran || "-",
              nominal: Number(retur?.nominal || 0),
              pembebananRetur: retur?.PembebananReturn?.siteArea || "-",
              unitProduksi: retur?.LokasiBarang?.namaRegional || retur?.PembebananReturn?.namaRegional || "-",
              lokasiBarang: retur?.LokasiBarang?.siteArea || "-",
              produk: retur?.Product?.name || retur?.produk || "-",
              tujuan: retur?.namaCompany || retur?.RitelModern?.tujuan || "-",
              rpKg: Number(retur?.rpKg || 0),
              qty: retur?.qtyReturn || (retur as any)?.qty || (retur as any)?.pcs || 1,
              tanggalRtv: retur?.tanggalRtv || null,
            };
          });
        } else {
          const rtvCounts: Record<string, number> = {};
          rtvsWithData = (rekon.rtvs || []).map((rtvNo: string) => {
            const allMatches = returMap.get(rtvNo) || [];
            // Prefer matches that belong to the same ritel
            const ritelMatches = allMatches.filter(r => r.ritelId === rekon.ritelId);
            const matches = ritelMatches.length > 0 ? ritelMatches : allMatches;
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
              qty: retur?.qtyReturn || (retur as any)?.qty || (retur as any)?.pcs || 1,
              tanggalRtv: retur?.tanggalRtv || null,
            };
          });
        }

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
            data: { buktiBayar: r.noRekonsiliasi, statusBayar: true },
          })
        );
        // Fire-and-forget — don't block the response
        Promise.all(backfillOps).catch(err => console.error("Backfill buktiBayar error:", err));
      }
    } catch (e) {
      // Silently fail — backfill is best-effort
      console.error("Backfill buktiBayar setup error:", e);
    }

    // ── BACKFILL: Sync pembebananReturnId & referensiPembayaran on DataRetur ──
    // For existing rekons: fill pembebananReturnId (from invoice's UnitProduksi)
    // and referensiPembayaran (from noRekonsiliasi) where they are still empty.
    try {
      const finalRekonsForRetur = reconciles.filter(r => r.status === "final" && r.noRekonsiliasi);
      if (finalRekonsForRetur.length > 0) {
        (async () => {
          try {
            for (const rekon of finalRekonsForRetur) {
              const savedDetails: Array<{id?: string, noRtv: string, refInvoice?: string}> = Array.isArray(rekon.rtvDetails) ? rekon.rtvDetails as any : [];
              const rtvNos = savedDetails.length > 0 
                ? savedDetails.map(d => d.noRtv) 
                : (rekon.rtvs || []);
              
              if (rtvNos.length === 0) continue;

              // Find DataRetur records that need backfill (pembebananReturnId or referensiPembayaran is empty)
              const retursToFill = await prisma.dataRetur.findMany({
                where: {
                  rtvCn: { in: rtvNos },
                  OR: [
                    { pembebananReturnId: null },
                    { referensiPembayaran: null },
                    { referensiPembayaran: "" },
                    { referensiPembayaran: "-" },
                  ],
                },
                select: { id: true, rtvCn: true, pembebananReturnId: true, referensiPembayaran: true }
              });

              if (retursToFill.length === 0) continue;

              // Build refInvoice lookup from rtvDetails
              const rtvRefMap = new Map<string, string>();
              if (savedDetails.length > 0) {
                savedDetails.forEach(d => {
                  if (d.refInvoice) rtvRefMap.set(d.noRtv, d.refInvoice);
                });
              }

              // Lookup invoices to get UnitProduksi for pembebananReturnId
              const allRefInvNos = [...new Set([...rtvRefMap.values()])];
              const invoiceUnitMap = new Map<string, string>();
              if (allRefInvNos.length > 0) {
                const invPOs = await prisma.purchaseOrder.findMany({
                  where: { noInvoice: { in: allRefInvNos } },
                  include: { UnitProduksi: true }
                });
                invPOs.forEach((po: any) => {
                  if (po.noInvoice && po.UnitProduksi?.idRegional) {
                    invoiceUnitMap.set(po.noInvoice, po.UnitProduksi.idRegional);
                  }
                });
              }

              // Update each retur
              const ops = retursToFill.map(retur => {
                const updateData: any = {};
                
                // Backfill referensiPembayaran
                if (!retur.referensiPembayaran || retur.referensiPembayaran === "" || retur.referensiPembayaran === "-") {
                  updateData.referensiPembayaran = rekon.noRekonsiliasi;
                }
                
                // Backfill pembebananReturnId
                if (!retur.pembebananReturnId) {
                  const refInv = rtvRefMap.get(retur.rtvCn || "");
                  if (refInv) {
                    const unitId = invoiceUnitMap.get(refInv);
                    if (unitId) {
                      updateData.pembebananReturnId = unitId;
                    }
                  }
                }

                if (Object.keys(updateData).length === 0) return null;
                return prisma.dataRetur.update({ where: { id: retur.id }, data: updateData });
              }).filter(Boolean);

              if (ops.length > 0) {
                await prisma.$transaction(ops as any);
              }
            }
          } catch (err) {
            console.error("Backfill retur error:", err);
          }
        })();
      }
    } catch (e) {
      console.error("Backfill retur setup error:", e);
    }

    return NextResponse.json({ 
      data, 
      total, 
      totalDraft, 
      totalCompleted,
      nominalDraft: draftAgg._sum.bankStatement || 0
    });
  } catch (error: any) {
    console.error("GET Rekon Data Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;
    const body = await request.json();
    const { 
      ritelId, 
      bankStatement,
      bankStatements,
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
      id, // Cek apakah ini edit/update dari draft
      remarks
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
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });

      GeneratedNoRekon = generatedNo;
      finalId = generatedId;
    }

    // 3. Simpan / Update Database
    const newRekon = await prisma.reconcile.upsert({
      where: { id: finalId },
      update: {
        ritelId,
        bankStatement: Number(bankStatement) || 0,
        bankStatements: Array.isArray(bankStatements) ? bankStatements : [],
        biayaAdmin: Number(biayaAdmin) || 0,
        totalInvoices: Number(totalInvoices) || 0,
        totalRtvs: Number(totalRtvs) || 0,
        totalPromo: Number(totalPromo) || 0,
        nominal: Number(nominal) || 0,
        invoices: invoices || [],
        rtvs: Array.isArray(rtvs) ? rtvs.map((r: any) => typeof r === 'string' ? r : r.noRtv) : [],
        rtvDetails: Array.isArray(rtvs) ? rtvs.filter((r: any) => typeof r === 'object').map((r: any) => ({ id: r.id, noRtv: r.noRtv, refInvoice: r.refInvoice || "" })) : [],
        notes: notesArray,
        notesDesc: computedNotesDesc,
        notesNominal: computedNotesNominal,
        noPromo: noPromo || null,
        buktiBayarUrl: buktiBayarUrl || undefined,
        rincianBayarUrl: rincianBayarUrl || undefined,
        tglBayar: tglBayar ? new Date(tglBayar) : undefined,
        status: status || "final",
        remarks: remarks || null,
      },
      create: {
        id: finalId,
        noRekonsiliasi: GeneratedNoRekon,
        ritelId,
        bankStatement: Number(bankStatement) || 0,
        bankStatements: Array.isArray(bankStatements) && bankStatements.length > 0 ? bankStatements : undefined,
        biayaAdmin: Number(biayaAdmin) || 0,
        totalInvoices: Number(totalInvoices) || 0,
        totalRtvs: Number(totalRtvs) || 0,
        totalPromo: Number(totalPromo) || 0,
        nominal: Number(nominal) || 0,
        invoices: invoices || [],
        rtvs: Array.isArray(rtvs) ? rtvs.map((r: any) => typeof r === 'string' ? r : r.noRtv) : [],
        rtvDetails: Array.isArray(rtvs) ? rtvs.filter((r: any) => typeof r === 'object').map((r: any) => ({ id: r.id, noRtv: r.noRtv, refInvoice: r.refInvoice || "" })) : undefined,
        notes: notesArray.length > 0 ? notesArray : undefined,
        notesDesc: computedNotesDesc,
        notesNominal: computedNotesNominal,
        noPromo: noPromo || null,
        buktiBayarUrl: buktiBayarUrl || null,
        rincianBayarUrl: rincianBayarUrl || null,
        tglBayar: tglBayar ? new Date(tglBayar) : null,
        status: status || "final",
        remarks: remarks || null,
      }
    });

    if (!id) {
      await auditActivity(prisma as any, newRekon.id, "Reconcile", "CREATE", { id: dbUser?.id || (session as any)?.user?.id || "unknown", name: getProfileName(session, dbUser), role: safeRole });
    }

    // 4. SYNC: Update referensi invoice, pembebanan retur, dan referensi pembayaran di tabel DataRetur
    if (Array.isArray(rtvs)) {
      const validRtvs = rtvs.filter((r: any) => typeof r === 'object' && r.noRtv && r.refInvoice);
      
      if (validRtvs.length > 0) {
        const whereOr = validRtvs.map((r: any) => r.id ? { id: r.id } : { rtvCn: r.noRtv });
        const allOldData = await prisma.dataRetur.findMany({ where: { OR: whereOr } });
        
        // Lookup all referenced invoices to get their UnitProduksi (for pembebananReturnId)
        const allRefInvoiceNos = [...new Set(validRtvs.map((r: any) => r.refInvoice).filter(Boolean))];
        const invoicePOs = allRefInvoiceNos.length > 0 
          ? await prisma.purchaseOrder.findMany({
              where: { noInvoice: { in: allRefInvoiceNos } },
              include: { UnitProduksi: true }
            })
          : [];
        const invoiceUnitMap = new Map<string, string>();
        invoicePOs.forEach((po: any) => {
          if (po.noInvoice && po.UnitProduksi?.idRegional) {
            invoiceUnitMap.set(po.noInvoice, po.UnitProduksi.idRegional);
          }
        });

        // The noRekonsiliasi to fill into referensiPembayaran
        const rekonNo = newRekon.noRekonsiliasi;

        // Group RTVs by their refInvoice to minimize update queries
        const groupedByRef = new Map<string, { ids: string[], rtvCns: string[] }>();
        
        validRtvs.forEach((r: any) => {
          const ref = r.refInvoice || "";
          if (!groupedByRef.has(ref)) {
            groupedByRef.set(ref, { ids: [], rtvCns: [] });
          }
          if (r.id) {
            groupedByRef.get(ref)!.ids.push(r.id);
          } else if (r.noRtv) {
            groupedByRef.get(ref)!.rtvCns.push(r.noRtv);
          }
        });

        // Create one updateMany per refInvoice
        const updatePromises = Array.from(groupedByRef.entries()).map(([ref, { ids, rtvCns }]) => {
          const updatePayload: any = { invoiceRekon: ref };
          
          // Auto-fill referensiPembayaran with noRekonsiliasi
          if (rekonNo) {
            updatePayload.referensiPembayaran = rekonNo;
          }
          
          // Auto-fill pembebananReturnId from the invoice's UnitProduksi
          const unitProduksiId = invoiceUnitMap.get(ref);
          if (unitProduksiId) {
            updatePayload.pembebananReturnId = unitProduksiId;
          }

          const orConditions: any[] = [];
          if (ids.length > 0) orConditions.push({ id: { in: ids } });
          if (rtvCns.length > 0) orConditions.push({ rtvCn: { in: rtvCns } });

          return prisma.dataRetur.updateMany({
            where: { OR: orConditions },
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
          statusBayar: true,
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

    const rekon = await prisma.reconcile.findUnique({ where: { id } });
    if (!rekon) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 1. Reset Purchase Orders
    if (rekon.invoices && rekon.invoices.length > 0) {
      await prisma.purchaseOrder.updateMany({
        where: { noInvoice: { in: rekon.invoices } },
        data: { statusBayar: false, buktiBayar: null }
      });
    }

    // 2. Reset DataRetur
    const rtvIds = Array.isArray(rekon.rtvDetails) 
      ? (rekon.rtvDetails as any[]).map((r: any) => r.id).filter(Boolean) 
      : [];
    const rtvCns = Array.isArray(rekon.rtvs) ? rekon.rtvs.filter(Boolean) : [];

    if (rtvIds.length > 0 || rtvCns.length > 0) {
      const orConditions: any[] = [];
      if (rtvIds.length > 0) orConditions.push({ id: { in: rtvIds } });
      if (rtvCns.length > 0) orConditions.push({ rtvCn: { in: rtvCns } });
      
      await prisma.dataRetur.updateMany({
        where: { OR: orConditions },
        data: {
          invoiceRekon: null,
          referensiPembayaran: null,
          pembebananReturnId: null
        }
      });
    }

    await prisma.reconcile.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Rekon Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
