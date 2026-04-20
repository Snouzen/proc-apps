import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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
        select: { 
          noInvoice: true, 
          Items: {
            select: { rpTagih: true, hargaPcs: true, pcsKirim: true }
          }
        }
      }),
      prisma.dataRetur.findMany({
        where: { rtvCn: { in: allRtvNos } },
        select: { rtvCn: true, referensiPembayaran: true, nominal: true }
      })
    ]);

    // Create lookup maps for O(1) speed
    const poMap = new Map(posData.map(p => {
      // Hitung total dari Items (sama kayak logika di kalkulator)
      const total = p.Items?.reduce((sum, item: any) => {
        return sum + (Number(item.rpTagih) || (Number(item.hargaPcs) * Number(item.pcsKirim)) || 0);
      }, 0) || 0;
      return [p.noInvoice, { ...p, calculatedTotal: total }];
    }));
    const returMap = new Map(retursData.map(r => [r.rtvCn, r]));

    // 3. Gabungkan Data
    const data = reconciles.map((rekon) => {
      const invoicesWithData = (rekon.invoices || []).map(invNo => {
        const po = poMap.get(invNo);
        return {
          noInvoice: invNo,
          nominal: po?.calculatedTotal || 0
        };
      });

      const rtvsWithData = (rekon.rtvs || []).map(rtvNo => {
        const retur = returMap.get(rtvNo);
        return {
          noRtv: rtvNo,
          refInvoice: retur?.referensiPembayaran || "-",
          nominal: Number(retur?.nominal || 0)
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
      noPromo 
    } = body;

    // 1. Generate No. Rekonsiliasi (R-001/MM/YYYY)
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const datePattern = `${month}/${year}`;

    // Hitung data bulan ini untuk nentuin urutan selanjutnya
    const countThisMonth = await prisma.reconcile.count({
      where: {
        noRekonsiliasi: { contains: datePattern }
      }
    });

    const nextNumber = String(countThisMonth + 1).padStart(3, '0');
    const GeneratedNoRekon = `R-${nextNumber}/${datePattern}`;

    // 2. Generate Unique Primary ID (Short 8 char)
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();

    // 3. Simpan ke Database
    const newRekon = await prisma.reconcile.create({
      data: {
        id: shortId,
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
        noPromo: noPromo || null,
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
