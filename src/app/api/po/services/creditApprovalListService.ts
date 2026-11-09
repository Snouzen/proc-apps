import prisma from "@/lib/prisma";
import { Prisma } from "../../../../../server/generated/prisma";
import { buildPOQueryParams } from "./poQueryBuilder";
import { attachSummary } from "./poSummaryHelper";
import type { ApprovalBatchSummary } from "@/lib/creditApprovalBatch";
import { TZ_OFFSET_HOURS } from "@/lib/utils/dates";

const activeStatuses = ["REQUESTED", "APPROVED"];
export async function listApprovalBatches(input: URLSearchParams) {
  return prisma.$transaction(db => readApprovalBatches(input, db), { isolationLevel: "RepeatableRead", timeout: 15000 });
}

async function readApprovalBatches(input: URLSearchParams, db: Prisma.TransactionClient) {
  const rawPage = input.get("page") || "1", page = Number(rawPage);
  if (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || (page - 1) * 10 > 2147483647) throw new Error("INVALID_APPROVAL_QUERY");
  const { matchingPo, matching } = buildApprovalFilter(input);
  const activeWhere = { PurchaseOrders: { some: { statusCreditLimit: { in: activeStatuses } } } };
  const active = { AND: [matching, activeWhere] };
  const archived = { AND: [matching, { NOT: activeWhere }] };
  const [total, activeCount, matchingPoCount, latest] = await Promise.all([
    db.creditLimitBatch.count({ where: matching }),
    db.creditLimitBatch.count({ where: active }),
    db.purchaseOrder.count({ where: matchingPo }),
    db.creditLimitBatch.aggregate({ _max: { seqNumber: true } }),
  ]);
  const skip = (page - 1) * 10;
  const orderBy = [{ batchCode: "desc" as const }, { id: "asc" as const }];
  const select = { id: true, batchCode: true, status: true, seqNumber: true };
  const first = skip < activeCount ? await db.creditLimitBatch.findMany({ where: active, orderBy, select, skip, take: Math.min(10, activeCount - skip) }) : [];
  const remainder = 10 - first.length;
  const last = remainder ? await db.creditLimitBatch.findMany({ where: archived, orderBy, select, skip: Math.max(0, skip - activeCount), take: remainder }) : [];
  const batches = [...first, ...last];
  if (!batches.length) return { data: [], total, matchingPoCount, page, pageSize: 10 };
  // Aggregate just these ten batches. No PO or item detail rows are returned to the browser.
  const aggregates = await db.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
    SELECT po."creditLimitBatchId" AS "batchId", COUNT(DISTINCT po.id) AS "poCount",
      COUNT(DISTINCT po.id) FILTER (WHERE po."statusCreditLimit" = 'REQUESTED') AS "requestedCount",
      COUNT(DISTINCT po.id) FILTER (WHERE po."statusCreditLimit" = 'APPROVED') AS "approvedCount",
      COUNT(DISTINCT po.id) FILTER (WHERE po."statusCreditLimit" = 'APPROVED_DIREKSI') AS "completedCount",
      COUNT(DISTINCT po.id) FILTER (WHERE po."isNotaDinas" = true) AS "ndCount",
      COALESCE(SUM(item.pcs), 0) AS "totalPcs",
      COALESCE(SUM(item."pcsKirim"), 0) AS "totalPcsKirim",
      COALESCE(SUM(item.nominal), 0) AS "totalNominal"
    FROM "PurchaseOrder" po LEFT JOIN "PurchaseOrderItem" item ON item."purchaseOrderId" = po.id
    WHERE po."creditLimitBatchId" IN (${Prisma.join(batches.map(batch => batch.id))})
    GROUP BY po."creditLimitBatchId"
  `);
  const byId = new Map(aggregates.map(row => [row.batchId, row]));
  const data: ApprovalBatchSummary[] = batches.map(batch => {
    const row = byId.get(batch.id) || {};
    const value = (key: string) => Number(row[key] || 0);
    const poCount = value("poCount"), completedCount = value("completedCount");
    return { id: batch.id, batchCode: batch.batchCode, seqNumber: batch.seqNumber,
      isBatchOpen: batch.status === "OPEN", isArchived: !value("requestedCount") && !value("approvedCount"),
      isBatchUncloseable: batch.status !== "OPEN" && batch.seqNumber >= (latest._max.seqNumber || 0) - 1 && poCount < 50 && completedCount !== poCount,
      poCount, requestedCount: value("requestedCount"), approvedCount: value("approvedCount"), completedCount,
      ndCount: value("ndCount"), totalPcs: value("totalPcs"), totalPcsKirim: value("totalPcsKirim"), totalNominal: value("totalNominal") };
  });
  return { data, total, matchingPoCount, page, pageSize: 10 };
}

// Shared by list and full export: filters select batches; each selected batch stays complete.
export function buildApprovalFilter(input: URLSearchParams) {
  const params = new URLSearchParams({ group: "credit_approval" });
  for (const key of ["q", "tglFrom", "tglTo"]) if (input.get(key)) params.set(key, input.get(key)!);
  const where = buildPOQueryParams(params, { role: "pusat", session: {}, resolvedPoScope: {} }).where;
  // The former browser filter covers complete local calendar days, not noon-only bounds.
  const dateRange: { gte?: Date; lt?: Date } = {};
  for (const [key, end] of [["tglFrom", false], ["tglTo", true]] as const) {
    const raw = input.get(key);
    if (!raw) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || !Number.isFinite(Date.parse(raw)) || new Date(raw).toISOString().slice(0, 10) !== raw) throw new Error("INVALID_APPROVAL_QUERY");
    const boundary = new Date(Date.parse(raw) + (end ? 86400000 : 0) - TZ_OFFSET_HOURS * 3600000);
    if (end) dateRange.lt = boundary; else dateRange.gte = boundary;
  }
  if (Object.keys(dateRange).length) where.tglPo = dateRange;
  // Retailer filters must combine, rather than overwrite one another.
  const retailer: Record<string, string> = {};
  if (input.get("company")) retailer.namaPt = input.get("company")!;
  if (input.get("inisial")) retailer.inisial = input.get("inisial")!;
  const extra: any[] = [];
  if (Object.keys(retailer).length) extra.push({ RitelModern: { is: retailer } });
  if (input.get("tujuan")) extra.push({ tujuanDetail: input.get("tujuan") });
  const matchingPo = { AND: [where, ...extra] };
  const matching = { PurchaseOrders: { some: matchingPo } };
  return { matchingPo, matching };
}

export async function getApprovalBatchDetails(id: string) {
  const batch = await prisma.creditLimitBatch.findUnique({ where: { id }, select: { id: true, batchCode: true } });
  if (!batch) throw new Error("APPROVAL_BATCH_NOT_FOUND");
  const where = { creditLimitBatchId: id };
  const total = await prisma.purchaseOrder.count({ where });
  // Read one extra row to detect over-cap/legacy data; never silently truncate a batch.
  const rows = await prisma.purchaseOrder.findMany({ where, orderBy: [{ tglPo: "desc" }, { id: "asc" }], take: 51,
    include: { RitelModern: { select: { namaPt: true, inisial: true, tujuan: true } }, UnitProduksi: { select: { siteArea: true, namaRegional: true } }, CreditLimitBatch: { select: { id: true, batchCode: true, status: true, seqNumber: true } } } });
  if (total > 50 || rows.length > 50 || total !== rows.length) throw new Error("APPROVAL_BATCH_INCOMPLETE");
  return { batchId: id, batchCode: batch.batchCode, total, data: await attachSummary(rows) };
}
