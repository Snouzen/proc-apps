import prisma from "@/lib/prisma";
import { resolvePoScope } from "@/lib/resolvePoScope";
import { getBusinessStartOfToday, TZ_OFFSET_HOURS } from "@/lib/utils/dates";
import { buildPOQueryParams } from "./poQueryBuilder";
import { attachSummary } from "./poSummaryHelper";

// Match getDueDateZone's calendar-day ranges in the application's business timezone.
export function creditLimitDateFilters(today = getBusinessStartOfToday()) {
  const boundary = (days: number) => new Date(today.getTime() + days * 86400000 - TZ_OFFSET_HOURS * 3600000);
  return {
    normal: { expiredTgl: { gte: boundary(-7), lt: boundary(8) } },
    remarksNeeded: { OR: [
      { expiredTgl: { gte: boundary(8), lt: boundary(31) } },
      { expiredTgl: { gte: boundary(-14), lt: boundary(-7) } },
    ] },
  };
}

const select = {
  id: true, noPo: true, tglPo: true, expiredTgl: true, tglkirim: true,
  noInvoice: true, tujuanDetail: true, regional: true, statusCreditLimit: true,
  remarksCreditLimit: true, kodeVendor: true, buktiTagih: true, buktiBayar: true,
  RitelModern: { select: { namaPt: true, inisial: true } },
  UnitProduksi: { select: { siteArea: true, namaRegional: true } },
  CreditLimitBatch: { select: { batchCode: true, status: true, seqNumber: true } },
};
const pendingStatus = { OR: [{ statusCreditLimit: null }, { statusCreditLimit: "" }, { statusCreditLimit: "REJECTED" }] };
const statusMap: Record<string, string> = {
  WAITING_PUSAT: "REQUESTED", WAITING_DIREKSI: "APPROVED", COMPLETED: "APPROVED_DIREKSI",
};

export async function getCreditLimitDataPage(input: URLSearchParams, auth: Parameters<typeof resolvePoScope>[0]) {
  const invalid = () => { throw new Error("INVALID_CREDIT_DATA_QUERY"); };
  const integer = (name: string, fallback: number, max: number) => {
    const raw = input.get(name);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value) || value > max) return invalid();
    return value;
  };
  const page = integer("page", 1, 2147483647), pageSize = integer("pageSize", 10, 100);
  const skip = (page - 1) * pageSize;
  if (skip > 2147483647) invalid();
  const tab = input.get("tab") || "all", status = input.get("status") || "";
  if (!["all", "pending", "outdate"].includes(tab) || (status && status !== "PENDING" && !Object.hasOwn(statusMap, status))) invalid();
  const params = new URLSearchParams({ group: "credit_data", summary: "true", sort: input.get("sort") || "tglPo_desc" });
  for (const name of ["q", "tglFrom", "tglTo"]) {
    const value = input.get(name);
    if (value) params.set(name, value);
  }
  const scopedAuth = { ...auth, resolvedPoScope: await resolvePoScope(auth) };
  const base = buildPOQueryParams(new URLSearchParams({ group: "credit_data" }), scopedAuth).where;
  const query = buildPOQueryParams(params, scopedAuth);
  const extra: any[] = [];
  const retailer: Record<string, unknown> = {};
  if (input.get("company")) retailer.namaPt = input.get("company");
  if (input.get("inisial")) retailer.inisial = input.get("inisial");
  if (Object.keys(retailer).length) extra.push({ RitelModern: { is: retailer } });
  if (input.get("tujuan")) extra.push({ tujuanDetail: input.get("tujuan") });
  const zones = creditLimitDateFilters();
  if (tab === "pending") extra.push(pendingStatus, zones.normal);
  if (tab === "outdate") extra.push(pendingStatus, zones.remarksNeeded);
  if (status === "PENDING") extra.push(pendingStatus);
  else if (status) extra.push({ statusCreditLimit: statusMap[status] });

  // Header text filters must also apply before pagination, never only to the visible page.
  if (input.get("colFilters")) {
    let filters: unknown;
    try { filters = JSON.parse(input.get("colFilters")!); } catch { invalid(); }
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) invalid();
    for (const [field, raw] of Object.entries(filters as Record<string, unknown>)) {
      if (typeof raw !== "string") invalid();
      const value = (raw as string).trim();
      if (!value) continue;
      const text = { contains: value, mode: "insensitive" as const };
      if (["noPo", "tujuanDetail", "kodeVendor"].includes(field)) extra.push({ [field]: text });
      else if (field === "zone") extra.push({ statusCreditLimit: text });
      else if (field === "inisial") extra.push({ RitelModern: { is: { inisial: text } } });
      else if (field === "siteArea") extra.push({ UnitProduksi: { is: { siteArea: text } } });
      else if (field === "batchCode") extra.push({ CreditLimitBatch: { is: { batchCode: text } } });
      else invalid();
    }
  }
  const where = { AND: [query.where, ...extra] };
  const [rows, total, totalEligible, normal, remarksNeeded] = await Promise.all([
    prisma.purchaseOrder.findMany({ where, select, orderBy: query.orderBy, take: pageSize, skip }),
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.count({ where: base }),
    prisma.purchaseOrder.count({ where: { AND: [base, pendingStatus, zones.normal] } }),
    prisma.purchaseOrder.count({ where: { AND: [base, pendingStatus, zones.remarksNeeded] } }),
  ]);
  return { data: await attachSummary(rows), total, page, pageSize, stats: { total: totalEligible, normal, remarksNeeded } };
}
