import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { upperClean } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await prisma.purchaseOrder.findMany({
      select: {
        noPo: true,
        regional: true,
        noInvoice: true,
        linkPo: true,
        statusKirim: true,
        statusPo: true,
        statusInv: true,
        statusBayar: true,
        RitelModern: {
          select: {
            namaPt: true,
            inisial: true,
            tujuan: true,
          },
        },
        UnitProduksi: {
          select: {
            namaRegional: true,
            siteArea: true,
          },
        },
        Items: {
          select: {
            Product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // FEATURE: Cascading Filter Logic - Build Flat Combinations
    const combos: any[] = [];
    const comboSet = new Set<string>();

    for (const d of data) {
      const pList: string[] = [];
      if (Array.isArray(d.Items)) {
        d.Items.forEach((it: any) => {
          const p = upperClean(it.Product?.name || "");
          if (p) pList.push(p);
        });
      }

      const combo = {
        noPo: upperClean(d.noPo || ""),
        company: upperClean(d.RitelModern?.namaPt || ""),
        inisial: upperClean(d.RitelModern?.inisial || ""),
        tujuan: upperClean(d.RitelModern?.tujuan || ""),
        siteArea: upperClean(
          d.UnitProduksi?.siteArea && d.UnitProduksi?.siteArea.toUpperCase() !== "UNKNOWN"
            ? d.UnitProduksi.siteArea
            : ""
        ),
        regional: upperClean((d.regional && d.regional.toLowerCase() !== "unknown") ? d.regional : (d.UnitProduksi?.namaRegional && d.UnitProduksi?.namaRegional.toLowerCase() !== "unknown") ? d.UnitProduksi?.namaRegional : ""),
        noInvoice: upperClean(d.noInvoice || ""),
        linkPo: String(d.linkPo || "").trim(),
        products: pList.filter(Boolean),
        statusKirim: d.statusKirim ? "True" : "False",
        statusPo: d.statusPo ? "True" : "False",
        statusInv: d.statusInv ? "True" : "False",
        statusBayar: d.statusBayar ? "True" : "False",
      };

      const hash = JSON.stringify(combo);
      if (!comboSet.has(hash)) {
        comboSet.add(hash);
        combos.push(combo);
      }
    }

    return NextResponse.json(combos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
