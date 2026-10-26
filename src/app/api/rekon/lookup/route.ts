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
    const rtvId = searchParams.get("rtvId")?.trim();
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

    if (!companyName && !ritelId) return NextResponse.json({ error: "Pilih company terlebih dahulu." }, { status: 400 });
    const ritelGroup = await resolveRitelGroup(prisma, ritelId, companyName);
    const allowedRitelIds = ritelGroup.companyRitelIds;
    const allowedRitelSet = new Set<string>(allowedRitelIds);
    const buildCompanyFilter = () => ({ ritelId: { in: allowedRitelIds } });

    // --- CASE A: Suggestion Mode (Company disediakan) ---
    // Dipakai untuk dropdown autocomplete di frontend
    if ((companyName || ritelId) && !invoiceNo && !rtvNo && !rtvId) {
      const companyFilter = buildCompanyFilter();

      // 1. Ambil semua invoice & RTV yang tersedia untuk company ini
      const [availableInvoices, availableRtvs] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: {
            ...(companyFilter as any),
            ...poScopeFilter,
            AND: [{ noInvoice: { not: null } }, { noInvoice: { not: "" } }],
          },
          select: { noInvoice: true, noPo: true, buktiBayar: true, statusBayar: true },
          distinct: ["noInvoice"],
        }),
        prisma.dataRetur.findMany({
          where: {
            ...(companyFilter as any),
            ...returScopeFilter,
            AND: [{ rtvCn: { not: null } }, { rtvCn: { not: "" } }],
          },
          select: {
            id: true,
            rtvCn: true,
            nominal: true,
            namaCompany: true,
            produk: true,
            referensiPembayaran: true,
          },
        }),
      ]);

      // 2. Ambil semua invoice & RTV yang sudah terpakai di rekon lain (draft + final)
      const usedInvoiceWhere: any = {};
      let editingRekonNo: string | null = null;
      if (editId) {
        usedInvoiceWhere.id = { not: editId };
        const currentEditRekon = await prisma.reconcile.findUnique({
          where: { id: editId },
          select: { noRekonsiliasi: true },
        });
        editingRekonNo = currentEditRekon?.noRekonsiliasi || null;
      }
      const existingRekons = await prisma.reconcile.findMany({
        where: usedInvoiceWhere,
        select: { ritelId: true, invoices: true, rtvs: true, rtvDetails: true },
      });
      const usedInvoiceSet = new Set<string>();
      const usedRtvIdSet = new Set<string>();
      const usedRtvCnSet = new Set<string>();

      for (const rekon of existingRekons) {
        const isSameRitelRekon =
          allowedRitelSet.size === 0 || Boolean(rekon.ritelId && allowedRitelSet.has(rekon.ritelId));

        if (isSameRitelRekon) {
          for (const inv of rekon.invoices || []) {
            usedInvoiceSet.add(inv);
          }
        }

        if (Array.isArray(rekon.rtvDetails) && rekon.rtvDetails.length > 0) {
          for (const rtv of rekon.rtvDetails as any[]) {
            if (rtv.id) {
              usedRtvIdSet.add(rtv.id);
            } else if (rtv.noRtv && isSameRitelRekon) {
              usedRtvCnSet.add(rtv.noRtv);
            }
          }
        } else if (isSameRitelRekon && Array.isArray(rekon.rtvs) && rekon.rtvs.length > 0) {
          // Hanya blokir berdasarkan nomor RTV jika rekon lama berada di ritel yang SAMA
          for (const rtvCn of rekon.rtvs) {
            usedRtvCnSet.add(rtvCn);
          }
        }
      }

      // 3. Filter: buang invoice & RTV yang sudah dipakai di rekon lain pada ritel yang sama
      const filteredInvoices = availableInvoices
        .filter((i: any) => {
          if (!i.noInvoice || usedInvoiceSet.has(i.noInvoice)) return false;
          if (i.statusBayar && i.buktiBayar && (!editingRekonNo || i.buktiBayar !== editingRekonNo)) {
            return false;
          }
          return true;
        })
        .map((i: any) => ({ noInvoice: i.noInvoice, noPo: i.noPo }));

      const filteredRtvs = availableRtvs
        .filter((r: any) => {
          if (usedRtvIdSet.has(r.id) || usedRtvCnSet.has(r.rtvCn)) return false;
          if (
            r.referensiPembayaran &&
            (!editingRekonNo || r.referensiPembayaran !== editingRekonNo)
          ) {
            return false;
          }
          return true;
        })
        .map((r: any) => ({
          id: r.id,
          noRtv: r.rtvCn,
          nominal: Number(r.nominal || 0),
          namaCompany: r.namaCompany,
          produk: r.produk,
        }))
        .filter((r: any) => r.noRtv);

      const promos = await prisma.promo.findMany({ where: buildCompanyFilter() });
      return NextResponse.json({
        promos,
        invoices: filteredInvoices,
        rtvs: filteredRtvs,
      });
    }

    // --- CASE B: Lookup Invoice Terpilih ---
    if (invoiceNo) {
      const pos = await prisma.purchaseOrder.findMany({
        where: {
          noInvoice: { equals: invoiceNo, mode: "insensitive" },
          ...buildCompanyFilter(),
          ...poScopeFilter,
        },
        include: {
          RitelModern: true,
          UnitProduksi: true,
          Items: { include: { Product: true } },
        },
      });

      const dataWithTotals = pos.map((po) => {
        const totalTagihan = po.Items.reduce(
          (s, it) =>
            s +
            (Number(it.rpTagih) ||
              Number(it.hargaPcs || 0) * Number(it.pcsKirim || 0) ||
              Number(it.nominal) ||
              Math.max(0, Number(it.hargaPcs || 0) * Number(it.pcs || 0) - Number(it.discount || 0)) ||
              0),
          0
        );
        const totalNominal = po.Items.reduce(
          (s, it) =>
            s +
            (Number(it.nominal) ||
              Math.max(0, Number(it.hargaPcs || 0) * Number(it.pcs || 0) - Number(it.discount || 0)) ||
              0),
          0
        );
        return { ...po, totalTagihan, totalNominal };
      });

      return NextResponse.json({ data: dataWithTotals });
    }

    // --- CASE C: Lookup RTV Terpilih ---
    if (rtvNo || rtvId) {
      const buildRtvWhere = () => {
        const w: any = {
          ...buildCompanyFilter(),
        };
        if (rtvId) {
          w.id = rtvId;
        } else if (rtvNo) {
          w.rtvCn = { equals: rtvNo, mode: "insensitive" };
        }
        return w;
      };

      const returs = await prisma.dataRetur.findMany({
        where: {
          ...buildRtvWhere(),
          ...returScopeFilter,
        },
        include: {
          RitelModern: true,
          Product: true,
          LokasiBarang: true,
          PembebananReturn: true,
        },
      });

      return NextResponse.json({ data: returs });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error?.statusCode === 400 ? 400 : 500 });
  }
}
