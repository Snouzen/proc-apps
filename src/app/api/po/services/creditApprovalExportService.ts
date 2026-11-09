import prisma from "@/lib/prisma";
import { buildApprovalFilter } from "./creditApprovalListService";
import { approvalExportRow, approvalExportWorkbook } from "@/lib/creditApprovalExport";

// On-demand export only: no dependency on browser pages/cache. One consistent DB snapshot.
export async function exportApprovalBatches(params: URLSearchParams) {
  const batchId = params.get("batchId");
  const where = batchId ? { id: batchId } : buildApprovalFilter(params).matching;
  const result = await prisma.$transaction(async tx => {
    let cursor: string | undefined;
    const rows: ReturnType<typeof approvalExportRow>[] = [];
    let batchCode = "Semua_Batch";
    while (true) {
      const batches = await tx.creditLimitBatch.findMany({ where, orderBy: [{ batchCode: "desc" }, { id: "asc" }],
        take: 20, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, batchCode: true, _count: { select: { PurchaseOrders: true } } } });
      if (!batches.length) break;
      if (batches.some(batch => batch._count.PurchaseOrders > 50)) throw new Error("APPROVAL_BATCH_INCOMPLETE");
      if (batchId) batchCode = batches[0].batchCode;
      const orders = await tx.purchaseOrder.findMany({ where: { creditLimitBatchId: { in: batches.map(batch => batch.id) } },
        orderBy: [{ tglPo: "desc" }, { id: "asc" }], take: 1001,
        include: { RitelModern: { select: { namaPt: true, inisial: true, tujuan: true } }, UnitProduksi: { select: { siteArea: true } },
          CreditLimitBatch: { select: { batchCode: true } }, Items: { select: { pcs: true, pcsKirim: true, nominal: true } } } });
      if (orders.length !== batches.reduce((sum, batch) => sum + batch._count.PurchaseOrders, 0)) throw new Error("APPROVAL_BATCH_INCOMPLETE");
      for (const batch of batches) {
        for (const po of orders.filter(order => order.creditLimitBatchId === batch.id)) {
          const totals = po.Items.reduce((sum, item) => ({ pcsTotal: sum.pcsTotal + Number(item.pcs || 0), pcsKirimTotal: sum.pcsKirimTotal + Number(item.pcsKirim || 0), totalNominal: sum.totalNominal + Number(item.nominal || 0) }), { pcsTotal: 0, pcsKirimTotal: 0, totalNominal: 0 });
          rows.push(approvalExportRow({ ...po, ...totals }, rows.length));
        }
      }
      cursor = batches[batches.length - 1].id;
      if (batches.length < 20 || batchId) break;
    }
    if (!rows.length) throw new Error(batchId ? "APPROVAL_BATCH_NOT_FOUND" : "APPROVAL_EXPORT_EMPTY");
    if (rows.length >= 1048575) throw new Error("APPROVAL_EXPORT_TOO_LARGE");
    return { rows, batchCode };
  }, { isolationLevel: "RepeatableRead", timeout: 55000 });
  return { file: approvalExportWorkbook(result.rows), filename: `Export_${result.batchCode.replace(/[^a-zA-Z0-9-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx` };
}
