import prisma from "@/lib/prisma";
import { checkReconcileAccess, resolveRitelGroup } from "./rekonAccessHelper";

export async function fetchSingleRekon(idParam: string, auth?: any) {
  const rekon = await prisma.reconcile.findUnique({
    where: { id: idParam },
    include: { RitelModern: true }
  });

  if (!rekon) return null;

  const ritelGroup = await resolveRitelGroup(
    prisma,
    rekon.ritelId,
    rekon.RitelModern?.namaPt,
    rekon.RitelModern?.inisial
  );
  const siblingRitelIds = ritelGroup.siblingRitelIds;

  // Fetch Full Invoice Details
  const detailedInvoices = await prisma.purchaseOrder.findMany({
    where: {
      noInvoice: { in: rekon.invoices || [] },
      ...(siblingRitelIds.length > 0 ? { ritelId: { in: siblingRitelIds } } : {}),
    },
    include: { UnitProduksi: true, Items: { include: { Product: true } } }
  });

  // Build RTV queries: items with ID resolved ONLY by ID (scoped by siblingRitelIds); fallback CNs without ID
  const savedRtvDetails: Array<{id?: string, noRtv: string, refInvoice?: string}> = Array.isArray(rekon.rtvDetails) ? rekon.rtvDetails as any : [];
  const explicitRtvIds = savedRtvDetails.map(d => d.id).filter(Boolean) as string[];
  const detailCnsWithoutId = savedRtvDetails
    .filter(d => !d.id)
    .map(d => d.noRtv ? String(d.noRtv).trim() : null)
    .filter(Boolean) as string[];
  const rootRtvsWithoutId = (rekon.rtvs || [])
    .map((r: string) => String(r).trim())
    .filter((r: string) => !savedRtvDetails.some(d => d.id && d.noRtv === r));
  const fallbackRtvCns = Array.from(new Set([...detailCnsWithoutId, ...rootRtvsWithoutId]));

  const [idReturs, cnReturs] = await Promise.all([
    explicitRtvIds.length > 0
      ? prisma.dataRetur.findMany({
          where: {
            id: { in: explicitRtvIds },
            ...(siblingRitelIds.length > 0 ? { ritelId: { in: siblingRitelIds } } : {}),
          },
          include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true },
        })
      : [],
    fallbackRtvCns.length > 0
      ? prisma.dataRetur.findMany({
          where: {
            rtvCn: { in: fallbackRtvCns },
            ...(siblingRitelIds.length > 0 ? { ritelId: { in: siblingRitelIds } } : {}),
          },
          include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true },
        })
      : [],
  ]);

  const returMapById = new Map<string, any>();
  for (const ret of [...idReturs, ...cnReturs]) {
    if (ret?.id) returMapById.set(String(ret.id), ret);
  }
  const detailedRtvs = Array.from(returMapById.values());

  // Enforce access control across ALL POs and Returs (fail-closed, no leak via .some)
  if (auth) {
    const access = await checkReconcileAccess(
      {
        ...rekon,
        siblingRitelIds,
        preloadedPos: detailedInvoices,
        preloadedReturs: detailedRtvs,
      },
      auth
    );
    if (!access.allowed) {
      return "FORBIDDEN";
    }
  }

  // Calculate totals for invoices (preserve duplicates — user may have same invoice twice)
  const invoicesWithTotals = (rekon.invoices || []).map((invNo: string, idx: number) => {
    const p = detailedInvoices.find(x => x.noInvoice === invNo);
    const total = p?.Items?.reduce((sum: number, item: any) => {
      return sum + Number(item.rpTagih ?? (Number(item.hargaPcs) * Number(item.pcsKirim)));
    }, 0) || 0;
    const produkNames = (p?.Items || []).map((item: any) => item.Product?.name).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ");
    
    return { 
      id: (p?.id || invNo) + "-inv-" + idx, 
      noInvoice: invNo, 
      sourceMissing: !p,
      noPo: p?.noPo || "-", 
      companyId: p?.ritelId || "", 
      total: total,
      unitProduksi: p?.UnitProduksi?.namaRegional || "-",
      siteArea: p?.UnitProduksi?.siteArea || "-",
      produk: produkNames || "-"
    };
  });

  // Build a refInvoice lookup from persisted rtvDetails (if available)
  let rtvsWithData: any[] = [];

  if (savedRtvDetails.length > 0) {
    rtvsWithData = savedRtvDetails.map(detail => {
      let rtvData = null;
      if (detail.id) {
        // Items with ID are resolved strictly by ID
        rtvData = idReturs.find(r => r.id === detail.id) || null;
      } else if (detail.noRtv) {
        // Fallback items without ID match by CN
        const matches = cnReturs.filter(r => r.rtvCn === detail.noRtv);
        rtvData = matches.length === 1 ? matches[0] : null;
      }
      
      const refInvoice = detail.refInvoice || rtvData?.invoiceRekon || rtvData?.referensiPembayaran || "";
      
      return {
        sourceMissing: !rtvData,
          id: rtvData?.id || detail.id,
        noRtv: detail.noRtv,
        total: Number(rtvData?.nominal || 0),
        qty: rtvData?.qtyReturn ?? (rtvData as any)?.qty ?? (rtvData as any)?.pcs ?? null,
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
      const allMatches = cnReturs.filter(r => r.rtvCn === rtvNo);
      const count = rtvCounts[rtvNo] || 0;
      const rtvData = allMatches.length === 1 && count === 0 ? allMatches[0] : null;
      rtvCounts[rtvNo] = count + 1;

      const refInvoice = rtvData?.invoiceRekon || rtvData?.referensiPembayaran || "";

      return {
        sourceMissing: !rtvData,
          id: rtvData?.id,
        noRtv: rtvNo,
        total: Number(rtvData?.nominal || 0),
        qty: rtvData?.qtyReturn ?? (rtvData as any)?.qty ?? (rtvData as any)?.pcs ?? null,
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

  return {
    ...rekon,
    notes: normalizedNotes,
    detailedInvoices: invoicesWithTotals,
    detailedRtvs: rtvsWithData,
    detailedPromos: promoData
  };
}
