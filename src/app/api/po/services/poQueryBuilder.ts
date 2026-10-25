import { poScopeFilter } from "@/lib/utils/poScope";
import { parseYmdOrIsoToUtcNoon, getBusinessNow, getBusinessStartOfToday, getBusinessEndOfSoon } from "@/lib/utils/dates";
import { getRegionalSynonyms } from "@/lib/utils/regional";
import { cacheGet } from "@/lib/ttl-cache";

import {
  canonicalInvoiceNumber,
  isInvoiceEmpty,
  CANONICAL_EMPTY_INVOICE_STRINGS,
} from "@/lib/utils/invoice";

export { canonicalInvoiceNumber, isInvoiceEmpty, CANONICAL_EMPTY_INVOICE_STRINGS };
export const EMPTY_INVOICE_VALUES = [...CANONICAL_EMPTY_INVOICE_STRINGS];

export interface POQueryParamsResult {
  where: any;
  orderBy: any;
  take: number;
  skip: number;
  paged: boolean;
  summary: boolean;
  includeItems: boolean;
  cacheKey: string;
  totalCacheKey: string;
  approxTotal: number | undefined;
}

export function buildPOQueryParams(
  searchParams: URLSearchParams,
  auth: { session: any; role: string; dbUser?: any; resolvedPoScope?: any }
): POQueryParamsResult {
  const { session, role: safeRole, dbUser } = auth;

  let overrideRegional: string | null = null;
  let overrideSiteArea: string | null = null;
  if (safeRole === "sitearea" || safeRole === "picsite" || safeRole === "spbdki") {
    overrideRegional =
      dbUser?.regional || (session as any)?.user_metadata?.regional || (session as any)?.regional || null;
    overrideSiteArea =
      dbUser?.siteArea || (session as any)?.user_metadata?.siteArea || (session as any)?.siteArea || null;
  } else if (safeRole === "rm") {
    overrideRegional =
      dbUser?.regional || (session as any)?.user_metadata?.regional || (session as any)?.regional || null;
  }

  // Non-pusat users cannot override their scoped boundary using URL query parameters
  const regionalParam =
    safeRole === "pusat"
      ? (searchParams.get("regional") || undefined)
      : overrideRegional || undefined;
  const siteAreaParam =
    safeRole === "pusat" || safeRole === "rm"
      ? (overrideSiteArea || searchParams.get("siteArea") || undefined)
      : searchParams.get("siteArea") || overrideSiteArea || undefined;

  const scopeKey = JSON.stringify(auth.resolvedPoScope ?? null);
  const cacheKey = `po:${safeRole}:${overrideRegional || ""}:${overrideSiteArea || ""}:${scopeKey}:${regionalParam || "all"}:${siteAreaParam || "all"}:${searchParams.toString()}`;
  const totalParams = new URLSearchParams(searchParams);
  totalParams.delete("limit");
  totalParams.delete("offset");
  totalParams.delete("sort");
  totalParams.delete("summary");
  totalParams.delete("includeItems");
  const totalCacheKey = `po_total:${safeRole}:${overrideRegional || ""}:${overrideSiteArea || ""}:${scopeKey}:${regionalParam || "all"}:${siteAreaParam || "all"}:${totalParams.toString()}`;

  const company = searchParams.get("company") || undefined;
  const noPo = searchParams.get("noPo") || undefined;
  const includeUnknown =
    (searchParams.get("includeUnknown") || "true") === "true";
  const q = (searchParams.get("q") || "").trim();
  const tglFrom = parseYmdOrIsoToUtcNoon(searchParams.get("tglFrom"));
  const tglTo = parseYmdOrIsoToUtcNoon(searchParams.get("tglTo"));
  const submitFrom = parseYmdOrIsoToUtcNoon(searchParams.get("submitFrom"));
  const submitTo = parseYmdOrIsoToUtcNoon(searchParams.get("submitTo"));
  const group = (searchParams.get("group") || "all").trim();
  const pcsKirimParam = searchParams.get("pcsKirim") || undefined;
  const status = searchParams.get("status") || undefined;
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const retailerIdRaw = searchParams.get("retailerId") || undefined;
  const retailerIds = retailerIdRaw
    ? retailerIdRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const inisial = searchParams.get("inisial") || undefined;

  let colFilters: Record<string, string> = {};
  const colFiltersRaw = searchParams.get("colFilters");
  if (colFiltersRaw) {
    try {
      colFilters = JSON.parse(colFiltersRaw);
    } catch (e) {}
  }
  const noPoListRaw = searchParams.get("noPoList") || undefined;
  let noPoList: string[] | undefined = undefined;
  if (noPoListRaw) {
    try {
      const parsed = JSON.parse(noPoListRaw);
      if (Array.isArray(parsed)) {
        noPoList = parsed.map((s) => String(s));
      }
    } catch {
      const parts = noPoListRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) noPoList = parts;
    }
  }

  const statsKeyParams = new URLSearchParams();
  statsKeyParams.set("includeUnknown", includeUnknown ? "true" : "false");
  if (tglFrom) statsKeyParams.set("tglFrom", searchParams.get("tglFrom") || "");
  if (tglTo) statsKeyParams.set("tglTo", searchParams.get("tglTo") || "");
  const statsCacheKey = `po_stats:${safeRole}:${overrideRegional || ""}:${overrideSiteArea || ""}:${regionalParam || "all"}:${siteAreaParam || "all"}:${statsKeyParams.toString()}`;
  const canApproxFromStats =
    !auth.resolvedPoScope &&
    !q &&
    !company &&
    !noPo &&
    (!noPoList || noPoList.length === 0) &&
    !submitFrom &&
    !submitTo &&
    !regionalParam &&
    includeUnknown &&
    (group === "all" ||
      group === "active" ||
      group === "almost_expired" ||
      group === "expired" ||
      group === "completed");
  const approxTotal = canApproxFromStats
    ? (() => {
        const s = cacheGet<any>(statsCacheKey);
        if (!s) return undefined;
        if (group === "active") return Number(s.cActive) || 0;
        if (group === "almost_expired") return Number(s.cAlmost) || 0;
        if (group === "expired") return Number(s.cExpired) || 0;
        if (group === "completed") return Number(s.cCompleted) || 0;
        return Number(s.cAll) || 0;
      })()
    : undefined;
  const summary = (searchParams.get("summary") || "false") === "true";
  const includeItems =
    !summary && (searchParams.get("includeItems") || "true") === "true";
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit =
    limitRaw == null
      ? null
      : Math.max(1, Math.min(10000, Number(limitRaw) || 0));
  const offset =
    offsetRaw == null ? null : Math.max(0, Number(offsetRaw) || 0);
  const paged = limit != null || offset != null;
  const sort = (searchParams.get("sort") || "createdAt_desc").trim();

  const where: any = {};
  if (retailerIds && retailerIds.length > 0) {
    where.ritelId =
      retailerIds.length === 1 ? retailerIds[0] : { in: retailerIds };
  }
  if (inisial) {
    where.RitelModern = {
      is: { inisial: { equals: inisial, mode: "insensitive" } },
    };
  }
  if (noPo) where.noPo = noPo;
  if (noPoList && noPoList.length > 0) where.noPo = { in: noPoList };
  if (tglFrom || tglTo) {
    where.tglPo = {
      ...(tglFrom ? { gte: tglFrom } : {}),
      ...(tglTo ? { lte: tglTo } : {}),
    };
  }
  if (submitFrom || submitTo) {
    where.createdAt = {
      ...(submitFrom ? { gte: submitFrom } : {}),
      ...(submitTo ? { lte: submitTo } : {}),
    };
  }

  const filterBy = (searchParams.get("filterBy") || "tglkirim").trim();
  if (monthParam && yearParam) {
    const y = parseInt(yearParam);
    const m = parseInt(monthParam);
    if (!isNaN(y) && !isNaN(m)) {
      const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));

      const dateField = filterBy === "expired" ? "expiredTgl" : filterBy === "tglPo" ? "tglPo" : "tglkirim";

      where.AND = [
        ...(where.AND || []),
        {
          [dateField]: {
            gte: startDate,
            lt: endDate,
          },
        },
      ];
    }
  }

  if (safeRole === "pusat" && regionalParam && regionalParam.trim()) {
    const syn = getRegionalSynonyms(regionalParam);
    where.OR = [
      ...syn.map((s) => ({
        regional: { equals: s, mode: "insensitive" as const },
      })),
      {
        UnitProduksi: {
          OR: syn.map((s) => ({
            namaRegional: { equals: s, mode: "insensitive" as const },
          })),
        },
      },
    ];
  }
  where.AND = [...(Array.isArray(where.AND) ? where.AND : []), auth.resolvedPoScope ?? poScopeFilter(safeRole, overrideRegional, overrideSiteArea)];

  if (
    ["pusat", "rm", "sitearea", "picsite", "spbdki"].includes(safeRole) &&
    siteAreaParam &&
    siteAreaParam.trim() &&
    !(safeRole === "sitearea" && siteAreaParam.trim().toLowerCase() === overrideSiteArea?.trim().toLowerCase())
  ) {
    const sa = siteAreaParam.trim();
    const areas = sa.split(",").map(s => s.trim()).filter(Boolean);
    const saFilter = { OR: areas.flatMap(area => [
      { unitProduksiId: { equals: area, mode: "insensitive" } },
      { UnitProduksi: { siteArea: { equals: area, mode: "insensitive" } } },
    ]) };
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), saFilter];
  }
  if (company && company.trim()) {
    where.RitelModern = {
      is: {
        namaPt: {
          equals: company.trim(),
          mode: "insensitive",
        },
      },
    };
  }
  if (q) {
    const isDashSearch = q === "-";
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { noPo: { contains: q, mode: "insensitive" as const } },
          { noInvoice: { contains: q, mode: "insensitive" as const } },
          { tujuanDetail: { contains: q, mode: "insensitive" as const } },
          { regional: { contains: q, mode: "insensitive" as const } },
          ...(isDashSearch ? [{ regional: null }, { regional: "" }] : []),
          { remarks: { contains: q, mode: "insensitive" as const } },
          {
            RitelModern: {
              is: {
                OR: [
                  { namaPt: { contains: q, mode: "insensitive" as const } },
                  { inisial: { contains: q, mode: "insensitive" as const } },
                  { tujuan: { contains: q, mode: "insensitive" as const } },
                ],
              },
            },
          },
          {
            UnitProduksi: {
              OR: [
                { siteArea: { contains: q, mode: "insensitive" as const } },
                ...(isDashSearch
                  ? [{ siteArea: null }, { siteArea: "" }]
                  : []),
                {
                  namaRegional: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
          {
            Items: {
              some: {
                Product: {
                  name: { contains: q, mode: "insensitive" as const },
                },
              },
            },
          },
        ],
      },
    ];
  }
  const emptyInvoiceValues = EMPTY_INVOICE_VALUES;
  const emptyInvoiceFilter = {
    OR: [
      { noInvoice: null },
      { noInvoice: { in: emptyInvoiceValues } },
      { noInvoice: { equals: "unknown", mode: "insensitive" as const } },
      { noInvoice: { equals: "none", mode: "insensitive" as const } },
    ],
  };
  const emptyRegionalValues = ["", "-", "Unknown", "UNKNOWN"];
  const now = getBusinessNow();
  const startOfToday = getBusinessStartOfToday();
  const endOfSoon = getBusinessEndOfSoon(14);
  if (group === "completed" || group === "done") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { noInvoice: { not: null } },
      { noInvoice: { notIn: emptyInvoiceValues } },
      {
        NOT: [
          { noInvoice: { equals: "unknown", mode: "insensitive" as const } },
          { noInvoice: { equals: "none", mode: "insensitive" as const } },
        ],
      },
    ];
  } else if (
    group === "active" ||
    group === "in_progress" ||
    status === "active"
  ) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      emptyInvoiceFilter,
      {
        OR: [{ expiredTgl: null }, { expiredTgl: { gte: startOfToday } }],
      },
      { unitProduksiId: { not: "UNKNOWN" } },
      {
        UnitProduksi: {
          isNot: { siteArea: "UNKNOWN" },
        },
      },
    ];
  } else if (group === "schedule_page") {
    const startOfPast14Days = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 14,
        0,
        0,
        0,
        0,
      ),
    );
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          // Existing: PO tanpa invoice + due date valid (untuk Total PO & Belum Dijadwalkan)
          {
            AND: [
              emptyInvoiceFilter,
              {
                OR: [
                  { expiredTgl: null },
                  { expiredTgl: { gte: startOfToday } },
                  {
                    AND: [
                      {
                        expiredTgl: {
                          gte: startOfPast14Days,
                          lt: startOfToday,
                        },
                      },
                      { tglkirim: null },
                    ],
                  },
                ],
              },
            ],
          },
          // New: PO yang sudah dijadwalkan (punya tglkirim) — tampil walaupun sudah punya invoice dan tanpa batasan expiredTgl
          {
            tglkirim: { not: null },
          },
        ],
      },
      { unitProduksiId: { not: "UNKNOWN" } },
      {
        UnitProduksi: {
          isNot: { siteArea: "UNKNOWN" },
        },
      },
    ];
  } else if (group === "almost_expired") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      emptyInvoiceFilter,
      { expiredTgl: { not: null } },
      { expiredTgl: { gte: startOfToday, lte: endOfSoon } },
    ];
  } else if (group === "expired") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      emptyInvoiceFilter,
      { expiredTgl: { not: null } },
      { expiredTgl: { lt: startOfToday } },
    ];
  } else if (group === "assign") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      emptyInvoiceFilter,
      {
        OR: [
          { regional: null },
          { regional: { in: emptyRegionalValues } },
          { unitProduksiId: "UNKNOWN" },
          {
            UnitProduksi: {
              is: {
                namaRegional: { in: emptyRegionalValues },
              },
            },
          },
        ],
      },
    ];
  } else if (group === "credit_data") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { tglkirim: { not: null } },
      emptyInvoiceFilter,
      { unitProduksiId: { not: "UNKNOWN" } },
      {
        UnitProduksi: {
          isNot: { siteArea: "UNKNOWN" },
        },
      },
    ];
  } else if (group === "credit_approval") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { creditLimitBatchId: { not: null } },
    ];
  }
  if (!includeUnknown) {
    where.NOT = [
      {
        OR: [
          { unitProduksiId: "UNKNOWN" },
          { tujuanDetail: null },
          { tujuanDetail: { in: ["", "-", "Unknown"] } },
          {
            RitelModern: {
              is: { namaPt: { in: ["", "-", "Unknown"] } },
            },
          },
        ],
      },
    ];
  }

  if (pcsKirimParam) {
    const pNum = Number(pcsKirimParam);
    if (!isNaN(pNum)) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { Items: { some: { pcsKirim: pNum } } },
      ];
    }
  }

  if (colFilters && Object.keys(colFilters).length > 0) {
    const AND = Array.isArray(where.AND) ? where.AND : [];
    for (const [key, val] of Object.entries(colFilters)) {
      let vals: string[] = [];
      if (Array.isArray(val)) {
        vals = val
          .map(String)
          .map((v) => v.trim())
          .filter(Boolean);
      } else {
        const strVal = String(val).trim();
        if (strVal) vals.push(strVal);
      }
      if (vals.length === 0) continue;

      if (vals.includes("__ALL__")) {
        const emptyVals = ["", "-", "Unknown", "UNKNOWN"];
        if (key === "company" || key === "inisial") {
          const dbKey = key === "company" ? "namaPt" : "inisial";
          AND.push({
            RitelModern: {
              is: { [dbKey]: { notIn: emptyVals } },
            },
          });
        } else if (key === "siteArea") {
          AND.push({
            UnitProduksi: {
              is: { siteArea: { notIn: emptyVals } },
            },
          });
        } else if (key === "regional") {
          AND.push({
            OR: [
              { regional: { notIn: emptyVals } },
              {
                UnitProduksi: {
                  is: { namaRegional: { notIn: emptyVals } },
                },
              },
            ],
          });
        } else if (key === "products" || key === "namaProduk") {
          AND.push({
            Items: {
              some: {
                Product: { isNot: null },
              },
            },
          });
        } else if (
          key === "noPo" ||
          key === "tujuan" ||
          key === "tujuanDetail" ||
          key === "noInvoice" ||
          key === "linkPo" ||
          key === "remarks" ||
          key === "buktiTagih" ||
          key === "buktiBayar" ||
          key === "namaSupir" ||
          key === "platNomor"
        ) {
          const dbKey = key === "tujuan" ? "tujuanDetail" : key;
          AND.push({ [dbKey]: { not: null } });
          AND.push({ [dbKey]: { notIn: emptyVals } });
        }
        continue;
      }

      const isBool = (v: string) => {
        const norm = v.toLowerCase();
        return ["1", "true", "ya", "yes", "y"].includes(norm)
          ? true
          : ["0", "false", "tidak", "no", "n"].includes(norm)
            ? false
            : null;
      };

      const orConditions = [];

      for (const strVal of vals) {
        if (
          key === "noPo" ||
          key === "tujuan" ||
          key === "tujuanDetail" ||
          key === "noInvoice" ||
          key === "linkPo" ||
          key === "remarks" ||
          key === "buktiTagih" ||
          key === "buktiBayar" ||
          key === "namaSupir" ||
          key === "platNomor"
        ) {
          const dbKey = key === "tujuan" ? "tujuanDetail" : key;
          orConditions.push({
            [dbKey]: { contains: strVal, mode: "insensitive" },
          });
        } else if (key === "company" || key === "inisial") {
          const dbKey = key === "company" ? "namaPt" : "inisial";
          orConditions.push({
            RitelModern: {
              is: { [dbKey]: { contains: strVal, mode: "insensitive" } },
            },
          });
        } else if (key === "siteArea") {
          orConditions.push({
            UnitProduksi: {
              is: { siteArea: { contains: strVal, mode: "insensitive" } },
            },
          });
        } else if (key === "regional") {
          orConditions.push({
            OR: [
              { regional: { contains: strVal, mode: "insensitive" } },
              {
                UnitProduksi: {
                  is: {
                    namaRegional: { contains: strVal, mode: "insensitive" },
                  },
                },
              },
            ],
          });
        } else if (key === "products" || key === "namaProduk") {
          orConditions.push({
            Items: {
              some: {
                Product: {
                  is: { name: { contains: strVal, mode: "insensitive" } },
                },
              },
            },
          });
        } else if (key.startsWith("status")) {
          const bVal = isBool(strVal);
          if (bVal !== null) {
            orConditions.push({ [key]: bVal });
          }
        }
      }

      if (orConditions.length > 0) {
        if (orConditions.length === 1) {
          AND.push(orConditions[0]);
        } else {
          AND.push({ OR: orConditions });
        }
      }
    }
    if (AND.length > 0) {
      where.AND = AND;
    }
  }

  const sortMatch = /^(.*)_(asc|desc)$/.exec(sort);
  const field = sortMatch?.[1] || "createdAt";
  const direction = sortMatch?.[2] === "asc" ? "asc" : "desc";
  const scalarSorts = new Set(["id", "noPo", "tglPo", "expiredTgl", "createdAt", "updatedAt", "tujuanDetail", "regional", "noInvoice", "noFaktur", "kodeVendor", "isNotaDinas", "noNd", "statusCreditLimit", "remarksCreditLimit", "remarks", "tglkirim", "namaSupir", "platNomor"]);
  const relationSorts: Record<string, [string, string]> = {
    company: ["RitelModern", "namaPt"], namaPt: ["RitelModern", "namaPt"], inisial: ["RitelModern", "inisial"],
    siteArea: ["UnitProduksi", "siteArea"], UnitProduksi_siteArea: ["UnitProduksi", "siteArea"],
    namaRegional: ["UnitProduksi", "namaRegional"], managerOperasional: ["UnitProduksi", "managerOperasional"], batchCode: ["CreditLimitBatch", "batchCode"],
  };
  const relation = relationSorts[field];
  const primarySort = scalarSorts.has(field) ? { [field]: direction } : relation ? { [relation[0]]: { [relation[1]]: direction } } : { createdAt: "desc" };
  const orderBy = [primarySort, { id: "asc" }];

  if (group === "assigned") {
    const assignParams = new URLSearchParams(searchParams);
    assignParams.set("group", "assign");
    const unassigned = buildPOQueryParams(assignParams, auth).where;
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { NOT: unassigned }];
  }
  const boardStatus = searchParams.get("boardStatus");
  const extra: any[] = [];
  const tujuan = searchParams.get("tujuan");
  if (tujuan) extra.push({ tujuanDetail: { equals: tujuan, mode: "insensitive" } });
  if (boardStatus === "scheduled") extra.push({ tglkirim: { not: null } }, emptyInvoiceFilter);
  if (boardStatus === "verified") extra.push({ NOT: emptyInvoiceFilter }, { buktiTagih: null }, { buktiBayar: null }, { statusBayar: false });
  if (boardStatus === "tagih") extra.push({ buktiTagih: { not: null } }, { NOT: { buktiTagih: "" } });
  if (boardStatus === "paid") extra.push({ OR: [{ statusBayar: true }, { AND: [{ buktiBayar: { not: null } }, { NOT: { buktiBayar: "" } }] }] });
  if (extra.length) where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...extra];
  const take = limit ? Math.min(10000, limit) : 50;
  const skip = offset ?? 0;

  return {
    where,
    orderBy,
    take,
    skip,
    paged,
    summary,
    includeItems,
    cacheKey,
    totalCacheKey,
    approxTotal,
  };
}
