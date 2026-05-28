import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const invoiceNo = searchParams.get("invoiceNo")?.trim();
    const rtvNo = searchParams.get("rtvNo")?.trim();
    const companyName = searchParams.get("companyName")?.trim();

    // --- CASE A: Suggestion Mode (Hanya Company Name disediakan) ---
    // Dipakai untuk dropdown autocomplete di frontend
    if (companyName && !invoiceNo && !rtvNo) {
      const [availableInvoices, availableRtvs] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: { 
             RitelModern: { namaPt: { equals: companyName, mode: "insensitive" } },
             AND: [
               { noInvoice: { not: null } },
               { noInvoice: { not: "" } }
             ]
          },
          select: { noInvoice: true },
          distinct: ['noInvoice'],
        }),
        prisma.dataRetur.findMany({
          where: { 
             RitelModern: { namaPt: { equals: companyName, mode: "insensitive" } },
             AND: [
               { rtvCn: { not: null } },
               { rtvCn: { not: "" } }
             ]
          },
          select: { rtvCn: true },
          distinct: ['rtvCn'],
        })
      ]);

      return NextResponse.json({ 
        invoices: availableInvoices.map(i => i.noInvoice).filter(Boolean),
        rtvs: availableRtvs.map(r => r.rtvCn).filter(Boolean)
      });
    }

    // --- CASE B: Lookup Invoice Terpilih ---
    if (invoiceNo) {
      const where: any = {
        noInvoice: { equals: invoiceNo, mode: "insensitive" }
      };

      if (companyName) {
        where.RitelModern = {
          namaPt: { equals: companyName, mode: "insensitive" }
        };
      }

      const pos = await prisma.purchaseOrder.findMany({
        where,
        include: {
          RitelModern: true,
          UnitProduksi: true,
          Items: { include: { Product: true } }
        }
      });
      
      const dataWithTotals = pos.map(po => {
        const totalTagihan = po.Items.reduce((s, it) => s + (typeof it.rpTagih === 'number' ? it.rpTagih : it.hargaPcs * it.pcsKirim), 0);
        const totalNominal = po.Items.reduce((s, it) => s + (typeof it.nominal === 'number' ? it.nominal : (it.hargaPcs * it.pcs) - it.discount), 0);
        return { ...po, totalTagihan, totalNominal };
      });

      return NextResponse.json({ data: dataWithTotals });
    }

    // --- CASE C: Lookup RTV Terpilih ---
    if (rtvNo) {
      const where: any = {
        rtvCn: { equals: rtvNo, mode: "insensitive" }
      };

      if (companyName) {
        where.RitelModern = {
          namaPt: { equals: companyName, mode: "insensitive" }
        };
      }

      const returs = await prisma.dataRetur.findMany({
        where,
        include: {
          RitelModern: true,
          Product: true,
          LokasiBarang: true,
          PembebananReturn: true
        }
      });
      return NextResponse.json({ data: returs });

    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
