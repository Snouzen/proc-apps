import prisma from "@/lib/prisma";
import { resolvePoScope } from "@/lib/resolvePoScope";
import { buildPOQueryParams, EMPTY_INVOICE_VALUES } from "./poQueryBuilder";
import { attachSummary } from "./poSummaryHelper";

const select = {
  id: true,
  noPo: true,
  createdAt: true,
  tglPo: true,
  expiredTgl: true,
  linkPo: true,
  noInvoice: true,
  noFaktur: true,
  tujuanDetail: true,
  regional: true,
  statusCreditLimit: true,
  remarksCreditLimit: true,
  isNotaDinas: true,
  noNd: true,
  linkNd: true,
  kodeVendor: true,
  remarks: true,
  buktiTagih: true,
  buktiBayar: true,
  buktiKirim: true,
  buktiFp: true,
  tglkirim: true,
  namaSupir: true,
  platNomor: true,
  RitelModern: { select: { namaPt: true, inisial: true } },
  UnitProduksi: {
    select: { siteArea: true, namaRegional: true, managerOperasional: true },
  },
  CreditLimitBatch: {
    select: { batchCode: true, status: true, seqNumber: true },
  },
};

export async function getSchedulePage(input: URLSearchParams, auth: Parameters<typeof resolvePoScope>[0]) {
  const int = (name: string, fallback: number, max: number) => {
    const raw = input.get(name);
    if (raw === null) return fallback;
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max) throw new Error("INVALID_SCHEDULE_QUERY");
    return Number(raw);
  };
  const page = int("page", 1, 2147483647);
  const pageSize = int("pageSize", 10, 100);
  if ((page - 1) * pageSize > 2147483647) throw new Error("INVALID_SCHEDULE_QUERY");
  const tab = input.get("tab") || "all";
  if (!["all", "scheduled", "unscheduled"].includes(tab)) throw new Error("INVALID_SCHEDULE_QUERY");
  // Only allow list controls; URL parameters can never replace the authenticated scope.
  const params = new URLSearchParams({ group: "schedule_page", summary: "true", limit: String(pageSize), offset: String((page - 1) * pageSize) });
  for (const key of ["q", "tglFrom", "tglTo", "sort", "colFilters"]) {
    const value = input.get(key);
    if (value) params.set(key, value);
  }
  const scopedAuth = { ...auth, resolvedPoScope: await resolvePoScope(auth) };
  const query = buildPOQueryParams(params, scopedAuth);
  const base = buildPOQueryParams(new URLSearchParams({ group: "schedule_page" }), scopedAuth).where;
  const where = tab === "all" ? query.where : { AND: [query.where, { tglkirim: tab === "scheduled" ? { not: null } : null }] };
  const emptyInvoice = { OR: [{ noInvoice: null }, { noInvoice: { in: EMPTY_INVOICE_VALUES } }, { noInvoice: { equals: "unknown", mode: "insensitive" as const } }, { noInvoice: { equals: "none", mode: "insensitive" as const } }] };
  const [rows, total, totalPO, pending, scheduled] = await Promise.all([
    prisma.purchaseOrder.findMany({ where, select, orderBy: query.orderBy, take: pageSize, skip: query.skip }),
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.count({ where: { AND: [base, emptyInvoice] } }),
    prisma.purchaseOrder.count({ where: { AND: [base, emptyInvoice, { tglkirim: null }] } }),
    prisma.purchaseOrder.count({ where: { AND: [base, { tglkirim: { not: null } }] } }),
  ]);
  return { data: await attachSummary(rows), total, page, pageSize, stats: { total: totalPO, pending, scheduled } };
}
