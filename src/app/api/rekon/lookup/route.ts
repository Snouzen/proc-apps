import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
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
          Items: { include: { Product: true } }
        }
      });
      return NextResponse.json({ data: pos });
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
          Product: true
        }
      });
      return NextResponse.json({ data: returs });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
