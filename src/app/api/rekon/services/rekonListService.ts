import prisma from "@/lib/prisma";
import { checkReconcileAccess, normalizeRitelKey } from "./rekonAccessHelper";
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const CHUNK_SIZE = 200;
const MAX_CONCURRENT_CHUNKS = 4;

export class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number = MAX_CONCURRENT_CHUNKS) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }

  getActiveCount(): number {
    return this.active;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

function chunkArray<T>(items: T[], chunkSize: number = CHUNK_SIZE): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function fetchInLimitedChunks<T, R>(
  items: T[],
  limiter: ConcurrencyLimiter,
  chunkSize: number = CHUNK_SIZE,
  fn: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const chunks = chunkArray(items, chunkSize);
  if (chunks.length === 0) return [];
  const chunkResults = await Promise.all(
    chunks.map((chunk) => limiter.run(() => fn(chunk)))
  );
  return chunkResults.flat();
}

async function fetchPosInChunks(invoices: string[], limiter: ConcurrencyLimiter): Promise<any[]> {
  return fetchInLimitedChunks(invoices, limiter, CHUNK_SIZE, (chunk) =>
    prisma.purchaseOrder.findMany({
      where: { noInvoice: { in: chunk } },
      select: {
        noInvoice: true,
        noPo: true,
        ritelId: true,
        regional: true,
        unitProduksiId: true,
        UnitProduksi: {
          select: {
            idRegional: true,
            namaRegional: true,
            siteArea: true,
            kodeRegional: true,
          },
        },
      },
    })
  );
}

async function fetchRetursByIdInChunks(ids: string[], limiter: ConcurrencyLimiter): Promise<any[]> {
  return fetchInLimitedChunks(ids, limiter, CHUNK_SIZE, (chunk) =>
    prisma.dataRetur.findMany({
      where: { id: { in: chunk } },
      select: {
        id: true,
        rtvCn: true,
        ritelId: true,
        lokasiBarangId: true,
        pembebananReturnId: true,
        LokasiBarang: {
          select: {
            idRegional: true,
            namaRegional: true,
            siteArea: true,
            kodeRegional: true,
          },
        },
        PembebananReturn: {
          select: {
            idRegional: true,
            namaRegional: true,
            siteArea: true,
            kodeRegional: true,
          },
        },
      },
    })
  );
}

async function fetchRetursByCnInChunks(cns: string[], limiter: ConcurrencyLimiter): Promise<any[]> {
  return fetchInLimitedChunks(cns, limiter, CHUNK_SIZE, (chunk) =>
    prisma.dataRetur.findMany({
      where: { rtvCn: { in: chunk } },
      select: {
        id: true,
        rtvCn: true,
        ritelId: true,
        lokasiBarangId: true,
        pembebananReturnId: true,
        LokasiBarang: {
          select: {
            idRegional: true,
            namaRegional: true,
            siteArea: true,
            kodeRegional: true,
          },
        },
        PembebananReturn: {
          select: {
            idRegional: true,
            namaRegional: true,
            siteArea: true,
            kodeRegional: true,
          },
        },
      },
    })
  );
}

async function fetchAuditLogsInChunks(emptyCandidateIds: string[], limiter: ConcurrencyLimiter): Promise<any[]> {
  return fetchInLimitedChunks(emptyCandidateIds, limiter, CHUNK_SIZE, (chunk) =>
    prisma.auditLog.findMany({
      where: {
        entity: "Reconcile",
        entityId: { in: chunk },
        action: "CREATE",
      },
      select: { entityId: true, userId: true },
      orderBy: { createdAt: "asc" },
    })
  );
}

export async function fetchRekonList(searchParams: URLSearchParams, auth?: any) {
  const queryLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_CHUNKS);

  const q = searchParams.get("q") || "";
  const statusParam = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const rawLimit = parseInt(searchParams.get("limit") || "10", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 50) : 10;

  const pageParam = searchParams.get("page");
  let page = 1;
  if (pageParam !== null) {
    const trimmed = pageParam.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new ValidationError("Parameter 'page' harus berupa integer positif yang valid.");
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new ValidationError("Parameter 'page' harus berupa integer aman yang lebih besar dari atau sama dengan 1.");
    }
    // Prisma / PostgreSQL max signed 32-bit integer is 2,147,483,647
    const MAX_PRISMA_INT = 2_147_483_647;
    const maxSafePage = Math.floor(MAX_PRISMA_INT / limit) + 1;
    if (parsed > maxSafePage) {
      throw new ValidationError(`Parameter 'page' terlalu besar. Maksimum halaman yang didukung adalah ${maxSafePage}.`);
    }
    page = parsed;
  }

  const skip = (page - 1) * limit;

  // 1. Base Query Filters (Search & Date Range)
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

  let total = 0;
  let totalDraft = 0;
  let totalCompleted = 0;
  let nominalDraft = 0;
  let reconciles: any[] = [];

  // 2. Pusat has unrestricted access -> native direct DB queries
  const isPusat = !auth || !auth.role || auth.role === "pusat";

  if (isPusat) {
    const findManyWhere = { ...where };
    if (statusParam === "draft" || statusParam === "final") {
      findManyWhere.status = statusParam;
    }

    const [t, tDraft, tCompleted, draftAgg, recs] = await Promise.all([
      prisma.reconcile.count({ where }),
      prisma.reconcile.count({ where: { ...where, status: "draft" } }),
      prisma.reconcile.count({ where: { ...where, status: "final" } }),
      prisma.reconcile.aggregate({
        where: { ...where, status: "draft" },
        _sum: { bankStatement: true }
      }),
      prisma.reconcile.findMany({
        where: findManyWhere,
        include: { RitelModern: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit
      })
    ]);

    total = t;
    totalDraft = tDraft;
    totalCompleted = tCompleted;
    nominalDraft = draftAgg._sum.bankStatement || 0;
    reconciles = recs;
  } else {
    // 3. Strict Regional / Site Area Scoping (Aligned with checkReconcileAccess)
    const userRegional = auth.dbUser?.regional || auth.session?.regional || null;
    const userSiteArea = auth.dbUser?.siteArea || auth.session?.siteArea || null;

    if (auth.role === "rm" && (!userRegional || !userRegional.trim())) {
      return { data: [], total: 0, totalDraft: 0, totalCompleted: 0, nominalDraft: 0 };
    } else if (
      (auth.role === "sitearea" || (auth.role as string) === "picsite" || (auth.role as string) === "spbdki") &&
      (!userSiteArea || !userSiteArea.trim())
    ) {
      return { data: [], total: 0, totalDraft: 0, totalCompleted: 0, nominalDraft: 0 };
    }

    // 4. Progressive evaluation across candidate batches:
    // Computes aggregates and collects the exact page items without ANY giant IN list
    const CANDIDATE_BATCH_SIZE = 100;
    let cursor: string | undefined = undefined;
    let matchedPageCount = 0;
    const pagedCandidateIds: string[] = [];

    while (true) {
      const batch: Array<{
        id: string;
        ritelId: string | null;
        invoices: string[] | null;
        rtvs: string[] | null;
        rtvDetails: any;
        status: string;
        bankStatement: number;
        updatedAt: Date;
      }> = await prisma.reconcile.findMany({
        where: { ...where },
        select: {
          id: true,
          ritelId: true,
          invoices: true,
          rtvs: true,
          rtvDetails: true,
          status: true,
          bankStatement: true,
          updatedAt: true,
        },
        take: CANDIDATE_BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });

      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      const batchInvoices = [...new Set(batch.flatMap((r) => r.invoices || []))];
      const batchRtvIds = [...new Set(batch.flatMap((r) => {
        const details = Array.isArray(r.rtvDetails) ? r.rtvDetails : [];
        return details.map((d: any) => d?.id).filter(Boolean);
      }))];
      const batchRtvCns = [...new Set(batch.flatMap((r) => {
        const details = Array.isArray(r.rtvDetails) ? r.rtvDetails : [];
        const detailCns = details.filter((d: any) => !d?.id).map((d: any) => d?.noRtv).filter(Boolean);
        return [...(r.rtvs || []), ...detailCns];
      }))];

      // Batch empty draft candidates to resolve creator without N+1 queries
      const emptyCandidateIds = batch
        .filter((r) => {
          const hasInv = Array.isArray(r.invoices) && r.invoices.length > 0;
          const hasRtvs = Array.isArray(r.rtvs) && r.rtvs.length > 0;
          const hasDetails = Array.isArray(r.rtvDetails) && r.rtvDetails.length > 0;
          return !hasInv && !hasRtvs && !hasDetails;
        })
        .map((r) => r.id);

      // Safe parameter-bounded lookups (max 200 parameters per SQL query, shared concurrency limiter)
      const [candidatePos, candidateIdReturs, candidateCnReturs, creatorLogs] = await Promise.all([
        fetchPosInChunks(batchInvoices, queryLimiter),
        fetchRetursByIdInChunks(batchRtvIds, queryLimiter),
        fetchRetursByCnInChunks(batchRtvCns, queryLimiter),
        fetchAuditLogsInChunks(emptyCandidateIds, queryLimiter),
      ]);

      // Build lookup indexes ONCE per batch (O(1) lookups during evaluation)
      const poMap = new Map<string, any[]>();
      for (const p of candidatePos) {
        if (p.noInvoice) {
          if (!poMap.has(p.noInvoice)) poMap.set(p.noInvoice, []);
          poMap.get(p.noInvoice)!.push(p);
        }
      }

      const returIdMap = new Map<string, any>();
      const returCnMap = new Map<string, any[]>();
      for (const ret of [...candidateIdReturs, ...candidateCnReturs]) {
        if (ret?.id && !returIdMap.has(String(ret.id))) {
          returIdMap.set(String(ret.id), ret);
        }
        if (ret?.rtvCn) {
          if (!returCnMap.has(ret.rtvCn)) returCnMap.set(ret.rtvCn, []);
          const list = returCnMap.get(ret.rtvCn)!;
          if (!list.some((existing: any) => existing.id === ret.id)) {
            list.push(ret);
          }
        }
      }

      const creatorMap = new Map<string, string>();
      for (const log of creatorLogs) {
        if (log.entityId && log.userId && !creatorMap.has(log.entityId)) {
          creatorMap.set(log.entityId, log.userId);
        }
      }

      for (const r of batch) {
        const isEmpty = emptyCandidateIds.includes(r.id);
        const access = await checkReconcileAccess(
          {
            ...r,
            preloadedPoMap: poMap,
            preloadedIdReturMap: returIdMap,
            preloadedCnReturMap: returCnMap,
            preloadedCreatorId: isEmpty ? (creatorMap.get(r.id) || null) : undefined,
          },
          auth
        );

        if (access.allowed) {
          total++;
          if (r.status === "draft") {
            totalDraft++;
            nominalDraft += Number(r.bankStatement || 0);
          } else if (r.status === "final") {
            totalCompleted++;
          }

          const matchesStatusFilter = !statusParam || statusParam === r.status;
          if (matchesStatusFilter) {
            matchedPageCount++;
            if (matchedPageCount > skip && pagedCandidateIds.length < limit) {
              pagedCandidateIds.push(r.id);
            }
          }
        }
      }

      if (batch.length < CANDIDATE_BATCH_SIZE) break;
    }

    if (pagedCandidateIds.length > 0) {
      reconciles = await prisma.reconcile.findMany({
        where: { id: { in: pagedCandidateIds } },
        include: { RitelModern: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
    } else {
      reconciles = [];
    }
  }

  // Bulk lookup details for performance
  const allInvNos = [...new Set(reconciles.flatMap(r => r.invoices || []))];
  const allRtvIds = [...new Set(reconciles.flatMap(r => {
    const details = Array.isArray(r.rtvDetails) ? r.rtvDetails : [];
    return details.map((d: any) => d?.id).filter(Boolean);
  }))];
  const allRtvNos = [...new Set(reconciles.flatMap(r => {
    const details = Array.isArray(r.rtvDetails) ? r.rtvDetails : [];
    const detailCns = details.filter((d: any) => !d?.id).map((d: any) => d?.noRtv).filter(Boolean);
    return [...(r.rtvs || []), ...detailCns];
  }))];
  const allPromoNos = [...new Set(reconciles.flatMap(r => (r.noPromo || "").split(",").map((p: string) => p.trim()).filter(Boolean)))];

  const [posData, detailedIdReturs, detailedCnReturs, promosData] = await Promise.all([
    allInvNos.length > 0
      ? fetchInLimitedChunks(allInvNos, queryLimiter, CHUNK_SIZE, (chunk) =>
          prisma.purchaseOrder.findMany({
            where: { noInvoice: { in: chunk } },
            include: { UnitProduksi: true, Items: { include: { Product: true } } },
          })
        )
      : [],
    allRtvIds.length > 0
      ? fetchInLimitedChunks(allRtvIds, queryLimiter, CHUNK_SIZE, (chunk) =>
          prisma.dataRetur.findMany({
            where: { id: { in: chunk } },
            include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true },
          })
        )
      : [],
    allRtvNos.length > 0
      ? fetchInLimitedChunks(allRtvNos, queryLimiter, CHUNK_SIZE, (chunk) =>
          prisma.dataRetur.findMany({
            where: { rtvCn: { in: chunk } },
            include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true },
          })
        )
      : [],
    allPromoNos.length > 0
      ? fetchInLimitedChunks(allPromoNos, queryLimiter, CHUNK_SIZE, (chunk) =>
          prisma.promo.findMany({
            where: { nomor: { in: chunk } },
          })
        )
      : [],
  ]);

  const retursData = [...detailedIdReturs, ...detailedCnReturs];

  // Fetch all RitelModern rows for the distinct namaPt values on this page to group by (namaPt, inisial)
  const distinctNamaPts = Array.from(
    new Set(
      reconciles
        .map((r: any) => (r.RitelModern?.namaPt || "").trim())
        .filter(Boolean)
    )
  );
  const allCompanyRitels =
    distinctNamaPts.length > 0 && (prisma as any)?.ritelModern?.findMany
      ? await prisma.ritelModern.findMany({
          where: {
            OR: distinctNamaPts.map((namaPt) => ({
              namaPt: { equals: namaPt, mode: "insensitive" as const },
            })),
          },
          select: { id: true, namaPt: true, inisial: true },
        })
      : [];

  const ritelGroupByKey = new Map<string, Set<string>>();
  for (const rm of allCompanyRitels) {
    const key = `${normalizeRitelKey(rm.namaPt)}__${normalizeRitelKey(rm.inisial)}`;
    if (!ritelGroupByKey.has(key)) ritelGroupByKey.set(key, new Set<string>());
    ritelGroupByKey.get(key)!.add(rm.id);
  }

  // Create lookup maps for O(1) speed
  const promoMap = new Map<string, any>();
  promosData.forEach((p: any) => promoMap.set(p.nomor, p));

  const poByInvoiceAndRitelMap = new Map<string, any>();
  const poListByInvoiceMap = new Map<string, any[]>();
  posData.forEach((p: any) => {
    const total = p.Items?.reduce((sum: number, item: any) => {
      return sum + Number(item.rpTagih ?? (Number(item.hargaPcs) * Number(item.pcsKirim)));
    }, 0) || 0;
    const produkNames = (p.Items || []).map((item: any) => item.Product?.name).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ");
    const enriched = { ...p, calculatedTotal: total, produkNames };
    if (p.noInvoice) {
      if (p.ritelId) {
        poByInvoiceAndRitelMap.set(`${p.noInvoice}__${p.ritelId}`, enriched);
      }
      if (!poByInvoiceAndRitelMap.has(p.noInvoice)) {
        poByInvoiceAndRitelMap.set(p.noInvoice, enriched);
      }
      if (!poListByInvoiceMap.has(p.noInvoice)) {
        poListByInvoiceMap.set(p.noInvoice, []);
      }
      poListByInvoiceMap.get(p.noInvoice)!.push(enriched);
    }
  });

  const returByIdMap = new Map<string, any>();
  const returByCnMap = new Map<string, any[]>();
  retursData.forEach((r: any) => {
    // ID and CN fetches can contain the same row; it is not an ambiguous match.
    if (r.id && returByIdMap.has(String(r.id))) return;
    if (r.id) {
      returByIdMap.set(String(r.id), r);
    }
    if (r.rtvCn) {
      if (!returByCnMap.has(r.rtvCn)) returByCnMap.set(r.rtvCn, []);
      returByCnMap.get(r.rtvCn)!.push(r);
    }
  });

  // Combine Data
  const data = reconciles.map((rekon) => {
    const siblingRitelSet = new Set<string>();
    if (rekon.ritelId) siblingRitelSet.add(rekon.ritelId);
    if (rekon.RitelModern?.namaPt) {
      const groupKey = `${normalizeRitelKey(rekon.RitelModern.namaPt)}__${normalizeRitelKey(rekon.RitelModern.inisial)}`;
      const groupIds = ritelGroupByKey.get(groupKey);
      if (groupIds) {
        groupIds.forEach((id) => siblingRitelSet.add(id));
      }
    }

    const invoicesWithData = (rekon.invoices || []).map((invNo: string) => {
      const poCandidates = poListByInvoiceMap.get(invNo) || [];
      const po =
        (rekon.ritelId && poByInvoiceAndRitelMap.get(`${invNo}__${rekon.ritelId}`)) ||
        poCandidates.find((p: any) => p.ritelId && siblingRitelSet.has(p.ritelId)) ||
        poByInvoiceAndRitelMap.get(invNo);
      const isMatchingRitel =
        !rekon.ritelId || Boolean(po?.ritelId && siblingRitelSet.has(po.ritelId));
      const validPo = isMatchingRitel ? po : null;
      return {
        noInvoice: invNo,
        sourceMissing: !po,
        sourceRitelMismatch: Boolean(po && !isMatchingRitel),
        nominal: validPo ? validPo.calculatedTotal : null,
        unitProduksi: validPo?.UnitProduksi?.namaRegional || "-",
        siteArea: validPo?.UnitProduksi?.siteArea || "-",
        produk: validPo?.produkNames || "-",
      };
    });

    const savedRtvDetails: Array<{id?: string, noRtv?: string, refInvoice?: string}> = Array.isArray(rekon.rtvDetails) ? rekon.rtvDetails as any : [];
    let rtvsWithData: any[] = [];
    
    if (savedRtvDetails.length > 0) {
      rtvsWithData = savedRtvDetails.map(detail => {
        let retur: any = null;
        let sourceRitelMismatch = false;
        if (detail.id) {
          // Explicit ID: match ONLY by ID, scoped to siblingRitelSet (same namaPt + inisial). NEVER fall back to CN!
          const candidate = returByIdMap.get(String(detail.id));
          const isMatch = !rekon.ritelId || Boolean(candidate?.ritelId && siblingRitelSet.has(candidate.ritelId));
          sourceRitelMismatch = Boolean(candidate && !isMatch);
          if (candidate && isMatch) {
            retur = candidate;
          }
        } else if (detail.noRtv) {
          // Fallback CN items: match strictly by CN scoped to siblingRitelSet. NEVER fall back to other ritels!
          const cnMatches = returByCnMap.get(detail.noRtv) || [];
          const ritelMatches = rekon.ritelId
            ? cnMatches.filter(r => r.ritelId && siblingRitelSet.has(r.ritelId))
            : cnMatches;
          retur = ritelMatches.length === 1 ? ritelMatches[0] : null;
        }

        return {
          sourceRitelMismatch,
          sourceMissing: !retur,
          id: retur?.id || detail.id,
          noRtv: detail.noRtv || retur?.rtvCn || "-",
          refInvoice: detail.refInvoice || retur?.invoiceRekon || retur?.referensiPembayaran || "-",
          nominal: Number(retur?.nominal || 0),
          pembebananRetur: retur?.PembebananReturn?.siteArea || "-",
          unitProduksi: retur?.LokasiBarang?.namaRegional || retur?.PembebananReturn?.namaRegional || "-",
          lokasiBarang: retur?.LokasiBarang?.siteArea || "-",
          produk: retur?.Product?.name || retur?.produk || "-",
          tujuan: retur?.namaCompany || retur?.RitelModern?.tujuan || "-",
          rpKg: Number(retur?.rpKg || 0),
          qty: retur?.qtyReturn ?? (retur as any)?.qty ?? (retur as any)?.pcs ?? null,
          tanggalRtv: retur?.tanggalRtv || null,
        };
      });
    } else {
      const rtvCounts: Record<string, number> = {};
      rtvsWithData = (rekon.rtvs || []).map((rtvNo: string) => {
        const cnMatches = returByCnMap.get(rtvNo) || [];
        const ritelMatches = rekon.ritelId
          ? cnMatches.filter(r => r.ritelId && siblingRitelSet.has(r.ritelId))
          : cnMatches;
        // Strictly scoped to ritelMatches - NEVER fall back to allMatches across other ritels!
        const count = rtvCounts[rtvNo] || 0;
        const retur = ritelMatches.length === 1 && count === 0 ? ritelMatches[0] : null;
        rtvCounts[rtvNo] = count + 1;
        
        return {
          sourceMissing: !retur,
          id: retur?.id,
          noRtv: rtvNo,
          refInvoice: retur?.invoiceRekon || retur?.referensiPembayaran || "-",
          nominal: Number(retur?.nominal || 0),
          pembebananRetur: retur?.PembebananReturn?.siteArea || "-",
          unitProduksi: retur?.LokasiBarang?.namaRegional || retur?.PembebananReturn?.namaRegional || "-",
          lokasiBarang: retur?.LokasiBarang?.siteArea || "-",
          produk: retur?.Product?.name || retur?.produk || "-",
          tujuan: retur?.namaCompany || retur?.RitelModern?.tujuan || "-",
          rpKg: Number(retur?.rpKg || 0),
          qty: retur?.qtyReturn ?? (retur as any)?.qty ?? (retur as any)?.pcs ?? null,
          tanggalRtv: retur?.tanggalRtv || null,
        };
      });
    }

    let normalizedNotes: any[] = [];
    if (Array.isArray(rekon.notes) && (rekon.notes as any[]).length > 0) {
      normalizedNotes = rekon.notes as any[];
    } else if (rekon.notesDesc || rekon.notesNominal) {
      normalizedNotes = [{ desc: rekon.notesDesc || "", nominal: rekon.notesNominal || 0 }];
    }

    const promoNumbers = (rekon.noPromo || "").split(",").map((p: string) => p.trim()).filter(Boolean);
    const detailedPromos = promoNumbers.map((nomor: string) => promoMap.get(nomor)).filter(Boolean);

    return { ...rekon, notes: normalizedNotes, invoices: invoicesWithData, rtvs: rtvsWithData, promos: detailedPromos };
  });

  return {
    data,
    total,
    totalDraft,
    totalCompleted,
    nominalDraft
  };
}
