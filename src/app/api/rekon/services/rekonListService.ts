import { sumRekonInvoiceItems } from "@/lib/rekonInvoiceAmount";
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
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: limit
      })
    ]);

    total = statusParam === "draft" ? tDraft : statusParam === "final" ? tCompleted : t;
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
  const allRekonNos = [
    ...new Set(
      reconciles.map((r) => (r.noRekonsiliasi ? String(r.noRekonsiliasi).trim() : null)).filter(Boolean)
    ),
  ] as string[];
  const allInvNos = [
    ...new Set(
      reconciles.flatMap((r) =>
        (r.invoices || []).flatMap((inv: string) => {
          const raw = String(inv || "");
          const trimmed = raw.trim();
          return [raw, trimmed].filter(Boolean);
        })
      )
    ),
  ];
  const allRtvIds = [
    ...new Set(
      reconciles.flatMap((r) => {
        const details = Array.isArray(r.rtvDetails) ? r.rtvDetails : [];
        return details.map((d: any) => (d?.id ? String(d.id).trim() : null)).filter(Boolean);
      })
    ),
  ];
  const allRtvNos = [
    ...new Set(
      reconciles.flatMap((r) => {
        const details = Array.isArray(r.rtvDetails) ? r.rtvDetails : [];
        const detailCns = details.flatMap((d: any) => {
          const raw = d?.noRtv ? String(d.noRtv) : "";
          return [raw, raw.trim()].filter(Boolean);
        });
        const rootCns = (r.rtvs || []).flatMap((cn: string) => {
          const raw = String(cn || "");
          return [raw, raw.trim()].filter(Boolean);
        });
        return [...rootCns, ...detailCns];
      })
    ),
  ];
  const allPromoNos = [
    ...new Set(
      reconciles.flatMap((r) =>
        (r.noPromo || "")
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean)
      )
    ),
  ];

  const [posByInvData, posByRekonData, detailedIdReturs, detailedCnReturs, detailedBoundReturs, promosData] =
    await Promise.all([
      allInvNos.length > 0
        ? fetchInLimitedChunks(allInvNos, queryLimiter, CHUNK_SIZE, (chunk) =>
            prisma.purchaseOrder.findMany({
              where: { noInvoice: { in: chunk } },
              include: { UnitProduksi: true, Items: { include: { Product: true } } },
            })
          )
        : [],
      allRekonNos.length > 0
        ? fetchInLimitedChunks(allRekonNos, queryLimiter, CHUNK_SIZE, (chunk) =>
            prisma.purchaseOrder.findMany({
              where: { buktiBayar: { in: chunk } },
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
      allRekonNos.length > 0
        ? fetchInLimitedChunks(allRekonNos, queryLimiter, CHUNK_SIZE, (chunk) =>
            prisma.dataRetur.findMany({
              where: { referensiPembayaran: { in: chunk } },
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

  const seenPoIds = new Set<string>();
  const posData: any[] = [];
  for (const p of [...posByInvData, ...posByRekonData]) {
    if (p?.id && seenPoIds.has(String(p.id))) continue;
    if (p?.id) seenPoIds.add(String(p.id));
    posData.push(p);
  }

  const retursData = [...detailedIdReturs, ...detailedCnReturs, ...detailedBoundReturs];

  // Fetch all RitelModern rows for the distinct namaPt values on this page to group by (namaPt, inisial) and (namaPt)
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
  const companyGroupByPt = new Map<string, Set<string>>();
  for (const rm of allCompanyRitels) {
    const ptKey = normalizeRitelKey(rm.namaPt);
    const key = `${ptKey}__${normalizeRitelKey(rm.inisial)}`;
    if (!ritelGroupByKey.has(key)) ritelGroupByKey.set(key, new Set<string>());
    ritelGroupByKey.get(key)!.add(rm.id);
    if (ptKey) {
      if (!companyGroupByPt.has(ptKey)) companyGroupByPt.set(ptKey, new Set<string>());
      companyGroupByPt.get(ptKey)!.add(rm.id);
    }
  }

  // Create lookup maps for O(1) speed
  const promoMap = new Map<string, any>();
  promosData.forEach((p: any) => promoMap.set(p.nomor, p));

  const poByInvoiceAndRitelMap = new Map<string, any>();
  const poListByInvoiceMap = new Map<string, any[]>();
  posData.forEach((p: any) => {
    const total = sumRekonInvoiceItems(p.Items);
    const produkNames = (p.Items || [])
      .map((item: any) => item.Product?.name)
      .filter(Boolean)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .join(", ");
    const enriched = { ...p, calculatedTotal: total, produkNames };
    if (p.noInvoice) {
      const rawInv = String(p.noInvoice);
      const normInv = rawInv.trim().toUpperCase();
      for (const invKey of new Set([rawInv, normInv])) {
        if (p.ritelId) {
          poByInvoiceAndRitelMap.set(`${invKey}__${p.ritelId}`, enriched);
        }
        if (!poByInvoiceAndRitelMap.has(invKey)) {
          poByInvoiceAndRitelMap.set(invKey, enriched);
        }
        if (!poListByInvoiceMap.has(invKey)) {
          poListByInvoiceMap.set(invKey, []);
        }
        poListByInvoiceMap.get(invKey)!.push(enriched);
      }
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
      const rawCn = String(r.rtvCn);
      const normCn = rawCn.trim().toUpperCase();
      for (const cnKey of new Set([rawCn, normCn])) {
        if (!returByCnMap.has(cnKey)) returByCnMap.set(cnKey, []);
        returByCnMap.get(cnKey)!.push(r);
      }
    }
  });

  // Combine Data
  const data = reconciles.map((rekon) => {
    const siblingRitelSet = new Set<string>();
    const companyRitelSet = new Set<string>();
    if (rekon.ritelId) {
      siblingRitelSet.add(rekon.ritelId);
      companyRitelSet.add(rekon.ritelId);
    }
    if (rekon.RitelModern?.namaPt) {
      const ptKey = normalizeRitelKey(rekon.RitelModern.namaPt);
      const groupKey = `${ptKey}__${normalizeRitelKey(rekon.RitelModern.inisial)}`;
      const groupIds = ritelGroupByKey.get(groupKey);
      if (groupIds) {
        groupIds.forEach((id) => {
          siblingRitelSet.add(id);
          companyRitelSet.add(id);
        });
      }
      const companyIds = companyGroupByPt.get(ptKey);
      if (companyIds) {
        companyIds.forEach((id) => companyRitelSet.add(id));
      }
    }

    const invoicesWithData = (rekon.invoices || []).map((invNo: string) => {
      const normInv = String(invNo || "").trim().toUpperCase();
      const poCandidates = poListByInvoiceMap.get(invNo) || poListByInvoiceMap.get(normInv) || [];
      const po =
        (rekon.ritelId &&
          (poByInvoiceAndRitelMap.get(`${invNo}__${rekon.ritelId}`) ||
            poByInvoiceAndRitelMap.get(`${normInv}__${rekon.ritelId}`))) ||
        poCandidates.find((p: any) => p.ritelId && siblingRitelSet.has(p.ritelId)) ||
        poCandidates.find((p: any) => p.ritelId && companyRitelSet.has(p.ritelId)) ||
        undefined;

      const calculatedNominal = po ? Number(po.calculatedTotal) : null;

      return {
        noInvoice: invNo,
        sourceMissing: !po,
        sourceRitelMismatch: false,
        nominal: calculatedNominal ?? 0,
        unitProduksi: po?.UnitProduksi?.namaRegional || "-",
        siteArea: po?.UnitProduksi?.siteArea || "-",
        produk: po?.produkNames || "-",
      };
    });

    const isSameRitelRetur = (r: any) => {
      if (!r) return false;
      if (!rekon.ritelId || companyRitelSet.size === 0) return true;
      if (r.ritelId && companyRitelSet.has(r.ritelId)) return true;
      
      return false;
    };

    const savedRtvDetails: Array<{ id?: string; noRtv?: string; refInvoice?: string; nominal?: number }> =
      Array.isArray(rekon.rtvDetails) ? (rekon.rtvDetails as any) : [];
    const totalExpectedRtvCount =
      savedRtvDetails.length > 0 ? savedRtvDetails.length : (rekon.rtvs || []).length;
    const usedReturIds = new Set<string>();

    const resolveReturItem = (detail: {
      id?: string;
      noRtv?: string;
      refInvoice?: string;
      nominal?: number;
    }) => {
      let retur: any = null;
      if (detail.id) {
        const byId = returByIdMap.get(String(detail.id));
        if (byId && isSameRitelRetur(byId)) {
          retur = byId;
        }
      }
      if (!detail.id && detail.noRtv) {
        const normCn = String(detail.noRtv).trim().toUpperCase();
        const cnMatches = (returByCnMap.get(detail.noRtv) || returByCnMap.get(normCn) || []).filter(
          isSameRitelRetur
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
      retur = exact.length === 1 ? exact[0] : null;
      }

      if (retur?.id) {
        usedReturIds.add(String(retur.id));
      }

      return retur;
    };

    const formatRtvRow = (
      retur: any,
      fallbackNoRtv?: string,
      fallbackId?: string,
      fallbackRefInvoice?: string,
      fallbackNominal?: number
    ) => {
      const resolvedNominal = Number(
        retur?.nominal ??
          fallbackNominal ??
          (totalExpectedRtvCount === 1 ? rekon.totalRtvs : 0) ??
          0
      );
      const resolvedQty = Number(
        retur?.qtyReturn ?? (retur as any)?.qty ?? (retur as any)?.pcs ?? 0
      );

      return {
        sourceRitelMismatch: false,
        sourceMissing: !retur,
        id: retur?.id || fallbackId || fallbackNoRtv,
        noRtv: fallbackNoRtv || retur?.rtvCn || "-",
        refInvoice:
          fallbackRefInvoice || retur?.invoiceRekon || retur?.referensiPembayaran || "-",
        nominal: resolvedNominal,
        pembebananRetur: retur?.PembebananReturn?.siteArea || "-",
        unitProduksi:
          retur?.LokasiBarang?.namaRegional || retur?.PembebananReturn?.namaRegional || "-",
        lokasiBarang:
          retur?.LokasiBarang?.siteArea || retur?.PembebananReturn?.siteArea || "-",
        produk: retur?.Product?.name || retur?.produk || "-",
        tujuan: retur?.namaCompany || retur?.RitelModern?.tujuan || "-",
        rpKg: Number(retur?.rpKg || 0),
        qty: Number.isFinite(resolvedQty) ? resolvedQty : 0,
        tanggalRtv: retur?.tanggalRtv || null,
      };
    };

    let rtvsWithData: any[] = [];
    if (savedRtvDetails.length > 0) {
      rtvsWithData = savedRtvDetails.map((detail) => {
        const retur = resolveReturItem(detail);
        return formatRtvRow(
          retur,
          detail.noRtv,
          detail.id,
          detail.refInvoice,
          detail.nominal
        );
      });
    } else {
      rtvsWithData = (rekon.rtvs || []).map((rtvNo: string) => {
        const retur = resolveReturItem({ noRtv: rtvNo });
        return formatRtvRow(retur, rtvNo);
      });
    }

    // If a legacy rekon stored deduplicated CNs while multiple same-ritel RTV items make up totalRtvs, include the remaining items
    const expectedTotalRtvs = Number(rekon.totalRtvs || 0);
    let currentRtvSum = rtvsWithData.reduce((s, r) => s + Number(r.nominal || 0), 0);
    if (expectedTotalRtvs > 0 && Math.abs(currentRtvSum - expectedTotalRtvs) > 0.01) {
      const rekonCnList = Array.from(
        new Set([
          ...savedRtvDetails.map((d) => String(d.noRtv || "").trim()).filter(Boolean),
          ...(rekon.rtvs || []).map((cn: string) => String(cn).trim()).filter(Boolean),
        ])
      );
      const unusedSameRitelReturs: any[] = [];
      for (const cn of rekonCnList) {
        const normCn = cn.toUpperCase();
        const matches = (returByCnMap.get(cn) || returByCnMap.get(normCn) || []).filter(
          (r) => r?.id && !usedReturIds.has(String(r.id)) && isSameRitelRetur(r)
        );
        for (const m of matches) {
          if (!unusedSameRitelReturs.some((x) => x.id === m.id)) {
            unusedSameRitelReturs.push(m);
          }
        }
      }
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
            )?.refInvoice || "-";
          rtvsWithData.push(formatRtvRow(extra, extra.rtvCn, extra.id, parentRef));
        }
        currentRtvSum = rtvsWithData.reduce((s, r) => s + Number(r.nominal || 0), 0);
      }
    }

    let normalizedNotes: any[] = [];
    if (Array.isArray(rekon.notes) && (rekon.notes as any[]).length > 0) {
      normalizedNotes = rekon.notes as any[];
    } else if (rekon.notesDesc || rekon.notesNominal) {
      normalizedNotes = [{ desc: rekon.notesDesc || "", nominal: rekon.notesNominal || 0 }];
    }

    const promoNumbers = (rekon.noPromo || "").split(",").map((p: string) => p.trim()).filter(Boolean);
    const detailedPromos = promoNumbers.map((nomor: string) => promoMap.get(nomor)).filter((promo: any) => promo?.ritelId && companyRitelSet.has(promo.ritelId));

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
      invoices: invoicesWithData,
      rtvs: rtvsWithData,
      promos: detailedPromos,
    };
  });

  return {
    data,
    total,
    totalDraft,
    totalCompleted,
    nominalDraft
  };
}
