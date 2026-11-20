import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "../../../../../server/generated/prisma";

export class BatchNdError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

export type BatchNdInput = { batchId: string; noNd: string; policy: "empty"; mode: "check" | "save"; expectedSnapshot?: string };

export async function updateBatchNd(input: BatchNdInput, actor: { id: string; name: string; role: string }) {
  if (input.policy !== "empty") throw new BatchNdError("Pengisian ND massal hanya diizinkan untuk nomor yang kosong.", 400, "ND_BATCH_INVALID_INPUT");
  return prisma.$transaction(async tx => {
    if (input.mode === "save") {
      // Match request/approval lock order; membership cannot grow during the update.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(718293)`;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "PurchaseOrder" WHERE "creditLimitBatchId" = ${input.batchId} ORDER BY id ASC FOR UPDATE`);
    }
    const batch = await tx.creditLimitBatch.findUnique({ where: { id: input.batchId }, select: { id: true, batchCode: true } });
    if (!batch) throw new BatchNdError("Batch tidak ditemukan.", 404, "ND_BATCH_NOT_FOUND");
    const rows = await tx.purchaseOrder.findMany({ where: { creditLimitBatchId: batch.id }, take: 51, orderBy: { id: "asc" },
      select: { id: true, noNd: true, linkNd: true, isNotaDinas: true, updatedAt: true, statusCreditLimit: true } });
    if (!rows.length || rows.length > 50) throw new BatchNdError("Isi batch kosong atau melebihi 50 PO.", 409, "ND_BATCH_INVALID");
    const snapshot = createHash("sha256").update(JSON.stringify({ batch, rows, noNd: input.noNd, policy: input.policy })).digest("hex");
    if (input.mode === "save" && snapshot !== input.expectedSnapshot) throw new BatchNdError("Data batch berubah sejak pemeriksaan. Klik Terapkan lagi untuk memeriksa data terbaru.", 409, "ND_BATCH_CHANGED");
    const targets = rows.filter(po => po.statusCreditLimit !== "APPROVED_DIREKSI" && !po.noNd?.trim());
    const result = { batchId: batch.id, batchCode: batch.batchCode, snapshot, total: rows.length, count: targets.length,
      completedCount: rows.filter(po => po.statusCreditLimit === "APPROVED_DIREKSI").length };
    if (input.mode === "check") return result;
    if (targets.length) {
      const changed = await tx.purchaseOrder.updateMany({ where: { creditLimitBatchId: batch.id, id: { in: targets.map(po => po.id) },
        OR: [{ statusCreditLimit: null }, { statusCreditLimit: { not: "APPROVED_DIREKSI" } }] },
        data: { noNd: input.noNd, isNotaDinas: true } });
      if (changed.count !== targets.length) throw new BatchNdError("Data PO berubah selama penyimpanan.", 409, "ND_BATCH_CHANGED");
      await tx.auditLog.createMany({ data: targets.map(po => ({ entity: "PurchaseOrder", entityId: po.id, action: "UPDATE",
        userId: actor.id, userName: actor.name, userRole: actor.role,
        oldData: { noNd: po.noNd, isNotaDinas: po.isNotaDinas },
        newData: { noNd: input.noNd, isNotaDinas: true, action: "updateBatchND", batchCode: batch.batchCode, policy: input.policy } })) });
    }
    const targetIds = new Set(targets.map(po => po.id));
    return { ...result, success: true, data: rows.map(po => ({ id: po.id, noNd: targetIds.has(po.id) ? input.noNd : po.noNd,
      linkNd: po.linkNd, isNotaDinas: targetIds.has(po.id) ? true : po.isNotaDinas })) };
  }, { timeout: 15000, ...(input.mode === "check" ? { isolationLevel: "RepeatableRead" as const } : {}) });
}
