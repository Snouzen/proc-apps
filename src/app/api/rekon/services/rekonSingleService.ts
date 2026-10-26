import { sumRekonInvoiceItems } from "@/lib/rekonInvoiceAmount";
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
  const companyRitelIds =
    ritelGroup.companyRitelIds.length > 0 ? ritelGroup.companyRitelIds : siblingRitelIds;
  const siblingRitelSet = new Set<string>(siblingRitelIds);
  const companyRitelSet = new Set<string>([...siblingRitelIds, ...companyRitelIds]);

  const cleanInvoices = (rekon.invoices || []).map((inv: string) => String(inv).trim()).filter(Boolean);
  const poOrConds: any[] = [];
  if (cleanInvoices.length > 0) {
    poOrConds.push({ noInvoice: { in: cleanInvoices } });
  }
  if (rekon.noRekonsiliasi) {
    poOrConds.push({ buktiBayar: rekon.noRekonsiliasi });
  }

  // Fetch Full Invoice Details (do not restrict SQL to siblingRitelIds so same-company POs are always found)
  const detailedInvoices =
    poOrConds.length > 0
      ? await prisma.purchaseOrder.findMany({
          where: { AND: [poOrConds.length === 1 ? poOrConds[0] : { OR: poOrConds }, { ritelId: { in: companyRitelIds } }] },
          include: { UnitProduksi: true, Items: { include: { Product: true } } },
        })
      : [];

  // Build RTV queries: load by explicit IDs and by all RTV CNs (scoped to same company/ritel or bound to this rekon)
  const savedRtvDetails: Array<{ id?: string; noRtv: string; refInvoice?: string; nominal?: number }> =
    Array.isArray(rekon.rtvDetails) ? (rekon.rtvDetails as any) : [];
  const explicitRtvIds = savedRtvDetails
    .map((d) => (d?.id ? String(d.id).trim() : null))
    .filter(Boolean) as string[];
  const detailCns = savedRtvDetails
    .map((d) => (d?.noRtv ? String(d.noRtv).trim() : null))
    .filter(Boolean) as string[];
  const rootRtvs = (rekon.rtvs || [])
    .map((r: string) => String(r).trim())
    .filter(Boolean);
  const allRtvCns = Array.from(new Set([...detailCns, ...rootRtvs]));

  const cnRitelScope = { ritelId: { in: companyRitelIds } };

  const [idReturs, cnReturs] = await Promise.all([
    explicitRtvIds.length > 0
      ? prisma.dataRetur.findMany({
          where: {
            id: { in: explicitRtvIds },
            ritelId: { in: companyRitelIds },
          },
          include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true },
        })
      : [],
    allRtvCns.length > 0
      ? prisma.dataRetur.findMany({
          where: {
            rtvCn: { in: allRtvCns },
            ...cnRitelScope,
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

  // Enforce access control across ALL POs and Returs
  if (auth) {
    const access = await checkReconcileAccess(
      {
        ...rekon,
        siblingRitelIds,
        companyRitelIds,
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
    const normInv = String(invNo || "").trim().toUpperCase();
    const candidates = detailedInvoices.filter(
      (x) => String(x.noInvoice || "").trim().toUpperCase() === normInv
    );
    const p =
      candidates.find((x) => x.ritelId && x.ritelId === rekon.ritelId) ||
      candidates.find((x) => x.ritelId && siblingRitelSet.has(x.ritelId)) ||
      candidates.find((x) => x.ritelId && companyRitelSet.has(x.ritelId)) ||
      undefined;

    const total = sumRekonInvoiceItems(p?.Items);

    const produkNames = (p?.Items || [])
      .map((item: any) => item.Product?.name)
      .filter(Boolean)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .join(", ");

    return {
      id: (p?.id || invNo) + "-inv-" + idx,
      noInvoice: invNo,
      sourceMissing: !p,
      noPo: p?.noPo || "-",
      companyId: p?.ritelId || rekon.ritelId || "",
      nominal: total,
      total: total,
      unitProduksi: p?.UnitProduksi?.namaRegional || "-",
      siteArea: p?.UnitProduksi?.siteArea || "-",
      produk: produkNames || "-",
    };
  });

  const isSameRitelRetur = (r: any) => {
    if (!r) return false;
    if (!rekon.ritelId || companyRitelSet.size === 0) return true;
    if (r.ritelId && companyRitelSet.has(r.ritelId)) return true;
    
    return false;
  };

  const usedReturIds = new Set<string>();
  const totalExpectedRtvCount =
    savedRtvDetails.length > 0 ? savedRtvDetails.length : (rekon.rtvs || []).length;

  const resolveReturItem = (detail: {
    id?: string;
    noRtv?: string;
    refInvoice?: string;
    nominal?: number;
  }) => {
    let rtvData: any = null;
    if (detail.id) {
      const byId = returMapById.get(String(detail.id));
      if (byId && isSameRitelRetur(byId)) {
        rtvData = byId;
      }
    }
    if (!detail.id && detail.noRtv) {
      const normCn = String(detail.noRtv).trim().toUpperCase();
      const cnMatches = detailedRtvs.filter(
        (r) => String(r.rtvCn || "").trim().toUpperCase() === normCn && isSameRitelRetur(r)
      );
      const unusedMatches = cnMatches.filter((r) => !usedReturIds.has(String(r.id)));
      const pool = unusedMatches.length > 0 ? unusedMatches : cnMatches;

      const expectedSingleNominal =
        detail.nominal !== undefined
          ? Number(detail.nominal)
          : totalExpectedRtvCount === 1 && Number(rekon.totalRtvs || 0) > 0
          ? Number(rekon.totalRtvs)
          : null;

      const bound = pool.filter((r: any) => rekon.noRekonsiliasi && r.referensiPembayaran === rekon.noRekonsiliasi);
      const exact = bound.length ? bound : pool;
      rtvData = exact.length === 1 ? exact[0] : null;
    }

    if (rtvData?.id) {
      usedReturIds.add(String(rtvData.id));
    }

    return rtvData;
  };

  const formatRtvOutput = (
    rtvData: any,
    fallbackNoRtv: string,
    fallbackId?: string,
    fallbackRefInvoice?: string,
    fallbackNominal?: number
  ) => {
    const refInvoice =
      fallbackRefInvoice || rtvData?.invoiceRekon || rtvData?.referensiPembayaran || "";
    const resolvedNominal = Number(
      rtvData?.nominal ??
        fallbackNominal ??
        (totalExpectedRtvCount === 1 ? rekon.totalRtvs : 0) ??
        0
    );
    const resolvedQty = Number(
      rtvData?.qtyReturn ?? (rtvData as any)?.qty ?? (rtvData as any)?.pcs ?? 0
    );

    return {
      sourceMissing: !rtvData,
      id: rtvData?.id || fallbackId || fallbackNoRtv,
      noRtv: fallbackNoRtv || rtvData?.rtvCn || "-",
      nominal: resolvedNominal,
      total: resolvedNominal,
      qty: Number.isFinite(resolvedQty) ? resolvedQty : 0,
      refInvoice,
      pembebananRetur: rtvData?.PembebananReturn?.siteArea || "-",
      lokasiBarang:
        rtvData?.LokasiBarang?.siteArea || rtvData?.PembebananReturn?.siteArea || "-",
      produk: rtvData?.Product?.name || rtvData?.produk || "-",
      unitProduksi:
        rtvData?.LokasiBarang?.namaRegional ||
        rtvData?.PembebananReturn?.namaRegional ||
        "-",
      tujuan: rtvData?.namaCompany || rtvData?.RitelModern?.tujuan || "-",
      rpKg: Number(rtvData?.rpKg || 0),
      tanggalRtv: rtvData?.tanggalRtv || null,
    };
  };

  let rtvsWithData: any[] = [];

  if (savedRtvDetails.length > 0) {
    rtvsWithData = savedRtvDetails.map((detail) => {
      const rtvData = resolveReturItem(detail);
      return formatRtvOutput(
        rtvData,
        detail.noRtv,
        detail.id,
        detail.refInvoice,
        detail.nominal
      );
    });
  } else {
    rtvsWithData = (rekon.rtvs || []).map((rtvNo: string) => {
      const rtvData = resolveReturItem({ noRtv: rtvNo });
      return formatRtvOutput(rtvData, rtvNo);
    });
  }

  // If a legacy rekon stored deduplicated CNs while multiple same-ritel RTV items make up totalRtvs, include the remaining items
  const expectedTotalRtvs = Number(rekon.totalRtvs || 0);
  let currentRtvSum = rtvsWithData.reduce((s, r) => s + Number(r.total || 0), 0);
  if (expectedTotalRtvs > 0 && Math.abs(currentRtvSum - expectedTotalRtvs) > 0.01) {
    const unusedSameRitelReturs = detailedRtvs.filter(
      (r) =>
        r?.id &&
        !usedReturIds.has(String(r.id)) &&
        isSameRitelRetur(r) &&
        allRtvCns.some(
          (cn) => String(cn).trim().toUpperCase() === String(r.rtvCn || "").trim().toUpperCase()
        )
    );
    const boundUnused = unusedSameRitelReturs.filter(
      (r) => rekon.noRekonsiliasi && r.referensiPembayaran === rekon.noRekonsiliasi
    );
    const candidateExtras = boundUnused.length > 0 ? boundUnused : unusedSameRitelReturs;
    const extraSum = candidateExtras.reduce((s, r) => s + Number(r.nominal || 0), 0);
    if (
      candidateExtras.length > 0 &&
      Math.abs(currentRtvSum + extraSum - expectedTotalRtvs) <= 0.01
    ) {
      for (const extra of candidateExtras) {
        usedReturIds.add(String(extra.id));
        const parentRef =
          rtvsWithData.find(
            (x) =>
              String(x.noRtv || "").trim().toUpperCase() ===
              String(extra.rtvCn || "").trim().toUpperCase()
          )?.refInvoice || "";
        rtvsWithData.push(formatRtvOutput(extra, extra.rtvCn, extra.id, parentRef));
      }
      currentRtvSum = rtvsWithData.reduce((s, r) => s + Number(r.total || 0), 0);
    }
  }

  // Fetch Promos if exists
  let promoData: any[] = [];
  if (rekon.noPromo) {
    const promoNumbers = rekon.noPromo.split(",").map((n: string) => n.trim()).filter(Boolean);
    if (promoNumbers.length > 0) {
      promoData = await prisma.promo.findMany({ where: { nomor: { in: promoNumbers }, ritelId: { in: companyRitelIds } } });
    }
  }

  // Normalize notes: support new array format + backward compat with legacy single fields
  let normalizedNotes: Array<{ desc: string; nominal: number }> = [];
  if (Array.isArray(rekon.notes) && (rekon.notes as any[]).length > 0) {
    normalizedNotes = rekon.notes as any[];
  } else if (rekon.notesDesc || rekon.notesNominal) {
    normalizedNotes = [{ desc: rekon.notesDesc || "", nominal: rekon.notesNominal || 0 }];
  }

  const effectiveTotalRtvs =
    rtvsWithData.length > 0 &&
    currentRtvSum > 0 &&
    Math.abs(currentRtvSum - expectedTotalRtvs) > 0.01
      ? currentRtvSum
      : rekon.totalRtvs;

  return {
    ...rekon,
    totalRtvs: effectiveTotalRtvs,
    notes: normalizedNotes,
    detailedInvoices: invoicesWithTotals,
    detailedRtvs: rtvsWithData,
    detailedPromos: promoData,
  };
}
