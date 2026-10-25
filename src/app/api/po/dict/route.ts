import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { upperClean } from "@/lib/text";
import { getSessionWithRole } from "@/lib/auth";
import { getRegionalSynonyms } from "@/lib/utils/regional";
import { hasPermission } from "@/lib/accessControl";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole, dbUser, session } = auth;
    const canView = await hasPermission(safeRole, "po_view");
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin melihat data PO (po_view)" },
        { status: 403 }
      );
    }

    const userRegional = dbUser?.regional || (session as any)?.regional || null;
    const userSiteArea = dbUser?.siteArea || (session as any)?.siteArea || null;

    let poWhere: any = {};
    if (safeRole !== "pusat") {
      if (safeRole === "rm") {
        if (!userRegional) {
          return NextResponse.json([]);
        }
        const syn = getRegionalSynonyms(userRegional);
        poWhere = {
          OR: [
            {
              unitProduksiId: { notIn: ["UNKNOWN", ""] },
              UnitProduksi: {
                OR: [
                  ...syn.map((s) => ({ namaRegional: { equals: s, mode: "insensitive" as const } })),
                  ...syn.map((s) => ({ kodeRegional: { equals: s, mode: "insensitive" as const } })),
                ],
              },
            },
            {
              unitProduksiId: { in: ["UNKNOWN", ""] },
              OR: syn.map((s) => ({ regional: { equals: s, mode: "insensitive" as const } })),
            },
          ],
        };
      } else if (safeRole === "sitearea" || (safeRole as string) === "picsite" || (safeRole as string) === "spbdki") {
        if (!userSiteArea) {
          return NextResponse.json([]);
        }
        const saList = (userSiteArea || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        poWhere = {
          UnitProduksi: {
            siteArea: { in: saList, mode: "insensitive" as const },
          },
        };
      }
    }

    const data = await prisma.purchaseOrder.findMany({
      where: poWhere,
      take: 5000,
      select: {
        noPo: true,
        regional: true,
        noInvoice: true,
        linkPo: true,
        tujuanDetail: true,
        namaSupir: true,
        platNomor: true,
        buktiTagih: true,
        buktiBayar: true,
        remarks: true,
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
        tujuan: upperClean(d.tujuanDetail || d.RitelModern?.tujuan || ""),
        tujuanDetail: upperClean(d.tujuanDetail || d.RitelModern?.tujuan || ""),
        siteArea: upperClean(
          d.UnitProduksi?.siteArea && d.UnitProduksi?.siteArea.toUpperCase() !== "UNKNOWN"
            ? d.UnitProduksi.siteArea
            : ""
        ),
        regional: upperClean((d.regional && d.regional.toLowerCase() !== "unknown") ? d.regional : (d.UnitProduksi?.namaRegional && d.UnitProduksi?.namaRegional.toLowerCase() !== "unknown") ? d.UnitProduksi?.namaRegional : ""),
        noInvoice: upperClean(d.noInvoice || ""),
        buktiTagih: upperClean(d.buktiTagih || ""),
        buktiBayar: upperClean(d.buktiBayar || ""),
        namaSupir: upperClean(d.namaSupir || ""),
        platNomor: upperClean(d.platNomor || ""),
        remarks: upperClean(d.remarks || ""),
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
