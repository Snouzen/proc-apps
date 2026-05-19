import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

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
          produk: produkNames || "-"
        };
      });

      // Fetch Full RTV Details
      const detailedRtvs = await prisma.dataRetur.findMany({
        where: { rtvCn: { in: rekon.rtvs || [] } },
        include: { Product: true, LokasiBarang: true, PembebananReturn: true }
      });
      // Map RTVs (preserve duplicates — user may have same RTV number twice)
      const rtvCounts: Record<string, number> = {};
      const rtvsWithData = (rekon.rtvs || []).map((rtvNo: string, idx: number) => {
        const matches = detailedRtvs.filter(r => r.rtvCn === rtvNo);
        const count = rtvCounts[rtvNo] || 0;
        const rtvData = matches[count] || matches[matches.length - 1];
        rtvCounts[rtvNo] = count + 1;

        return {
          id: (rtvData?.id || rtvNo) + "-rtv-" + idx,
          noRtv: rtvNo,
          total: Number(rtvData?.nominal || 0),
          qty: rtvData?.qtyReturn || 0,
          refInvoice: "",
          pembebananRetur: rtvData?.PembebananReturn?.siteArea || "-",
          lokasiBarang: rtvData?.LokasiBarang?.siteArea || "-",
          produk: rtvData?.Product?.name || rtvData?.produk || "-",
          unitProduksi: rtvData?.PembebananReturn?.namaRegional || "-"
        };
      });

      // Fetch Promo if exists
      let promoData = null;
      if (rekon.noPromo) {
        promoData = await prisma.promo.findUnique({ where: { nomor: rekon.noPromo } });
      }

      return NextResponse.json({ 
        data: {
          ...rekon,
          detailedInvoices: invoicesWithTotals,
          detailedRtvs: rtvsWithData,
          detailedPromo: promoData
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

      const [posData, retursData] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: { noInvoice: { in: allInvNos } },
          include: { UnitProduksi: true, Items: { include: { Product: true } } }
        }),
        prisma.dataRetur.findMany({
          where: { rtvCn: { in: allRtvNos } },
          include: { Product: true, LokasiBarang: true, PembebananReturn: true }
        })
      ]);

      // Create lookup maps for O(1) speed
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
            noRtv: rtvNo,
            refInvoice: retur?.invoiceRekon || retur?.referensiPembayaran || "-",
            nominal: Number(retur?.nominal || 0),
            pembebananRetur: retur?.PembebananReturn?.siteArea || "-",
            unitProduksi: retur?.PembebananReturn?.namaRegional || "-",
            lokasiBarang: retur?.LokasiBarang?.siteArea || "-",
            produk: retur?.Product?.name || retur?.produk || "-",
          };
        });

      return { ...rekon, invoices: invoicesWithData, rtvs: rtvsWithData };
    });

    return NextResponse.json({ data, total });
  } catch (error: any) {
    console.error("GET Rekon Data Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      notesDesc,
      notesNominal,
      buktiBayarUrl,
      tglBayar,
      status = "final",
      id // Cek apakah ini edit/update dari draft
    } = body;

    let GeneratedNoRekon = "";
    let finalId = id;

    // 1. Generate No. Rekonsiliasi Only for NEW records
    if (!finalId) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const datePattern = `${month}/${year}`;

      // Count ALL reconcile records globally (no monthly reset)
      const countAll = await prisma.reconcile.count();

      const nextNumber = String(countAll + 1).padStart(3, '0');
      GeneratedNoRekon = `R-${nextNumber}/${datePattern}`;
      finalId = Math.random().toString(36).substring(2, 10).toUpperCase();
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
        notesDesc: notesDesc || null,
        notesNominal: Number(notesNominal) || 0,
        noPromo: noPromo || null,
        buktiBayarUrl: buktiBayarUrl || undefined,
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
        notesDesc: notesDesc || null,
        notesNominal: Number(notesNominal) || 0,
        noPromo: noPromo || null,
        buktiBayarUrl: buktiBayarUrl || null,
        tglBayar: tglBayar ? new Date(tglBayar) : null,
        status: status || "final",
      }
    });

    // 4. SYNC: Update referensi invoice di tabel DataRetur secara otomatis
    if (Array.isArray(rtvs)) {
      for (const r of rtvs) {
        if (typeof r === 'object' && r.noRtv && r.refInvoice) {
          await prisma.dataRetur.updateMany({
            where: { rtvCn: r.noRtv },
            data: { 
              invoiceRekon: r.refInvoice // Nomor invoice dipindah ke sini
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: newRekon });
  } catch (error: any) {
    console.error("POST Rekon Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
