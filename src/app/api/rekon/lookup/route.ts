import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNo = searchParams.get("invoiceNo");
    const rtvNo = searchParams.get("rtvNo");
    const companyName = searchParams.get("companyName");

    // 1. Jika cari Invoice (Hanya by No Invoice)
    if (invoiceNo) {
      const where: any = {
        noInvoice: { contains: invoiceNo, mode: "insensitive" }
      };

      if (companyName) {
        where.RitelModern = {
          namaPt: { equals: companyName }
        };
      }

      const pos = await prisma.purchaseOrder.findMany({
        where,
        include: {
          RitelModern: true,
          Items: {
            include: {
              Product: true
            }
          }
        }
      });
      return NextResponse.json({ data: pos });
    }

    // 2. Jika cari RTV
    if (rtvNo) {
      const returs = await prisma.dataRetur.findMany({
        where: {
          rtvCn: { contains: rtvNo, mode: "insensitive" }
        },
        include: {
          RitelModern: true,
          Product: true
        }
      });
      return NextResponse.json({ data: returs });
    }

    return NextResponse.json({ error: "No parameter provided" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
