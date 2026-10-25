import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import { getRegionalSynonyms } from "@/lib/utils/regional";
import { hasPermission } from "@/lib/accessControl";
import { resolveRitelGroup } from "../services/rekonAccessHelper";

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole, dbUser, session } = auth;
    const canLookup =
      (await hasPermission(safeRole, "rekon_calc_save")) ||
      (await hasPermission(safeRole, "rekon_calc_process")) ||
      (await hasPermission(safeRole, "rekon_view")) ||
      (await hasPermission(safeRole, "rekon_create"));
    if (!canLookup) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengakses data rekonsiliasi" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invoiceNo = searchParams.get("invoiceNo")?.trim();
    const rtvNo = searchParams.get("rtvNo")?.trim();
    const companyName = searchParams.get("companyName")?.trim();
    const inisial = searchParams.get("inisial")?.trim();
    const ritelId = searchParams.get("ritelId")?.trim();
    const editId = searchParams.get("editId")?.trim(); // ID rekon yang sedang di-edit

    const userRegional = dbUser?.regional || session?.regional || null;
    const userSiteArea = dbUser?.siteArea || session?.siteArea || null;

    let poScopeFilter: any = {};
    let returScopeFilter: any = {};

    if (safeRole !== "pusat") {
      if (safeRole === "rm") {
        if (!userRegional) {
          return NextResponse.json({ invoices: [], rtvs: [], data: [] });
        }
        const syn = getRegionalSynonyms(userRegional);
        poScopeFilter = {
          OR: [
            ...syn.map((s) => ({ regional: { equals: s, mode: "insensitive" as const } })),
            {
              UnitProduksi: {
                OR: syn.map((s) => ({ namaRegional: { equals: s, mode: "insensitive" as const } })),
              },
            },
          ],
        };
        returScopeFilter = {
          OR: [
            { LokasiBarang: { OR: syn.map((s) => ({ namaRegional: { equals: s, mode: "insensitive" as const } })) } },
            { PembebananReturn: { OR: syn.map((s) => ({ namaRegional: { equals: s, mode: "insensitive" as const } })) } },
            { AND: [{ lokasiBarangId: null }, { pembebananReturnId: null }] },
          ],
        };
      } else if (safeRole === "sitearea" || (safeRole as string) === "picsite" || (safeRole as string) === "spbdki") {
        if (!userSiteArea && !userRegional) {
          return NextResponse.json({ invoices: [], rtvs: [], data: [] });
        }
        const saList = (userSiteArea || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        poScopeFilter = {
          UnitProduksi: {
            siteArea: { in: saList, mode: "insensitive" as const },
          },
        };
        returScopeFilter = {
          OR: [
            { LokasiBarang: { siteArea: { in: saList, mode: "insensitive" as const } } },
            { PembebananReturn: { siteArea: { in: saList, mode: "insensitive" as const } } },
            { AND: [{ lokasiBarangId: null }, { pembebananReturnId: null }] },
          ],
        };
      }
    }

    // Resolve seluruh ritelId yang memiliki kombinasi (namaPt, inisial) yang sama tanpa melihat kolom tujuan
    const ritelGroup =
      companyName || ritelId
        ? await resolveRitelGroup(prisma, ritelId, companyName, inisial)
        : null;
    const siblingRitelIds = ritelGroup?.siblingRitelIds || [];

    const buildCompanyFilter = () => {
      if (siblingRitelIds.length > 0) {
        return { ritelId: { in: siblingRitelIds } };
      }
      if (companyName) {
        return { RitelModern: { namaPt: { equals: companyName, mode: "insensitive" as const } } };
      }
      if (ritelId) {
        return { ritelId };
      }
      return {};
    };

    // --- CASE A: Suggestion Mode (Company & Inisial disediakan) ---
    // Dipakai untuk dropdown autocomplete di frontend
    if ((companyName || ritelId) && !invoiceNo && !rtvNo) {
      const companyFilter = buildCompanyFilter();
      
      // 1. Ambil semua invoice & RTV yang tersedia untuk company + inisial ini
      const [availableInvoices, availableRtvs] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: { 
             ...companyFilter as any,
             ...poScopeFilter,
             AND: [
               { noInvoice: { not: null } },
               { noInvoice: { not: "" } },
             ]
          },
          select: { noInvoice: true, noPo: true },
          distinct: ['noInvoice'],
        }),
        prisma.dataRetur.findMany({
          where: { 
             ...companyFilter as any,
             ...returScopeFilter,
             AND: [
               { rtvCn: { not: null } },
               { rtvCn: { not: "" } }
             ]
          },
          select: { id: true, rtvCn: true, nominal: true, namaCompany: true, produk: true }
        })
      ]);

      // 2. Ambil semua invoice yang sudah terpakai di rekon lain (draft + final)
      const usedInvoiceWhere: any = {};
      if (editId) {
        // Jika sedang edit rekon, exclude rekon ini sendiri dari pengecekan
        usedInvoiceWhere.id = { not: editId };
      }
      const existingRekons = await prisma.reconcile.findMany({
        where: usedInvoiceWhere,
        select: { invoices: true, rtvs: true, rtvDetails: true },
      });
      const usedInvoiceSet = new Set<string>();
      const usedRtvIdSet = new Set<string>();
      const usedRtvCnSet = new Set<string>();

      for (const rekon of existingRekons) {
        for (const inv of (rekon.invoices || [])) {
          usedInvoiceSet.add(inv);
        }
        
        if (Array.isArray(rekon.rtvDetails) && rekon.rtvDetails.length > 0) {
          for (const rtv of rekon.rtvDetails as any[]) {
            if (rtv.id) usedRtvIdSet.add(rtv.id);
          }
        } else if (Array.isArray(rekon.rtvs) && rekon.rtvs.length > 0) {
          for (const rtvCn of rekon.rtvs) {
             usedRtvCnSet.add(rtvCn);
          }
        }
      }

      // 3. Filter: buang invoice yang sudah dipakai di rekon lain
      const filteredInvoices = availableInvoices
        .map(i => ({ noInvoice: i.noInvoice, noPo: i.noPo }))
        .filter(i => i.noInvoice && !usedInvoiceSet.has(i.noInvoice));

      const filteredRtvs = availableRtvs
        .filter((r: any) => !usedRtvIdSet.has(r.id) && !usedRtvCnSet.has(r.rtvCn))
        .map((r: any) => ({ id: r.id, noRtv: r.rtvCn, nominal: Number(r.nominal || 0), namaCompany: r.namaCompany, produk: r.produk }))
        .filter((r: any) => r.noRtv);

      return NextResponse.json({ 
        invoices: filteredInvoices,
        rtvs: filteredRtvs
      });
    }

    // --- CASE B: Lookup Invoice Terpilih ---
    if (invoiceNo) {
      const where: any = {
        noInvoice: { equals: invoiceNo, mode: "insensitive" },
        ...buildCompanyFilter(),
      };

      const pos = await prisma.purchaseOrder.findMany({
        where: {
          ...where,
          ...poScopeFilter,
        },
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
    const rtvId = searchParams.get("rtvId")?.trim();
    if (rtvNo || rtvId) {
      const where: any = {
        ...buildCompanyFilter(),
      };
      
      if (rtvId) {
        where.id = rtvId;
      } else if (rtvNo) {
        where.rtvCn = { equals: rtvNo, mode: "insensitive" };
      }

      const returs = await prisma.dataRetur.findMany({
        where: {
          ...where,
          ...returScopeFilter,
        },
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
