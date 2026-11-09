import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "../../../../../server/generated/prisma";
import { sanitizeAuditData } from "@/lib/audit";

export class ApprovalActionError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
type Input = { batchId: string; stage: "pusat" | "direksi"; poId?: string; mode: "check" | "approve"; expectedSnapshot?: string };
type Actor = { id: string; name: string; role: string };

// No UI-loaded PO list is trusted: membership and ND are always resolved in the database.
export async function processApprovalBatch(input: Input, actor: Actor) {
  return prisma.$transaction(async tx => {
    if (input.mode === "approve") {
      // Same allocation lock as request/reRequest prevents new members arriving mid-approval.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(718293)`;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "PurchaseOrder" WHERE "creditLimitBatchId" = ${input.batchId} ORDER BY id ASC FOR UPDATE`);
    }
    const batch = await tx.creditLimitBatch.findUnique({ where: { id: input.batchId }, select: { id: true, batchCode: true, status: true } });
    if (!batch) throw new ApprovalActionError("Batch tidak ditemukan. Muat ulang daftar.", 404, "APPROVAL_BATCH_NOT_FOUND");
    const rows = await tx.purchaseOrder.findMany({ where: { creditLimitBatchId: batch.id }, take: 51, orderBy: { id: "asc" },
      select: { id: true, noPo: true, noNd: true, updatedAt: true, statusCreditLimit: true } });
    if (!rows.length || rows.length > 50) throw new ApprovalActionError("Isi batch kosong atau melebihi 50 PO. Periksa batch sebelum approval.", 409, "APPROVAL_BATCH_INVALID");
    const snapshot = createHash("sha256").update(JSON.stringify({ batch, stage: input.stage, poId: input.poId || null, rows })).digest("hex");
    if (input.mode === "approve" && snapshot !== input.expectedSnapshot) throw new ApprovalActionError("Data batch berubah setelah pemeriksaan. Klik approval kembali untuk memeriksa data terbaru.", 409, "APPROVAL_SNAPSHOT_CHANGED");
    const source = input.stage === "pusat" ? "REQUESTED" : "APPROVED";
    const target = input.stage === "pusat" ? "APPROVED" : "APPROVED_DIREKSI";
    const selected = input.poId ? rows.filter(row => row.id === input.poId) : rows;
    if (!selected.length) throw new ApprovalActionError("PO tidak lagi berada dalam batch ini.", 409, "APPROVAL_PO_MOVED");
    // Preserve the existing source-status rule; mixed/terminal rows cannot be re-approved.
    const targets = selected.filter(row => row.statusCreditLimit === source);
    const invalid = selected.filter(row => row.statusCreditLimit !== source);
    if (invalid.length || !targets.length) throw new ApprovalActionError(
      input.stage === "direksi" ? "PO wajib disetujui Pusat terlebih dahulu dan belum selesai Direksi." : "Tidak ada PO REQUESTED yang dapat disetujui Pusat.", 409, "APPROVAL_STATUS_CHANGED");
    const missingNd = input.stage === "direksi" ? selected.filter(row => !row.noNd?.trim()) : [];
    const result = { batchId: batch.id, batchCode: batch.batchCode, snapshot, total: rows.length, targetCount: targets.length,
      ready: missingNd.length === 0, missingNdCount: missingNd.length, missingNd: missingNd.map(row => row.noPo) };
    if (input.mode === "check") return result;
    if (missingNd.length) throw new ApprovalActionError(`Nomor ND belum lengkap pada ${missingNd.length} PO. Lengkapi No. ND terlebih dahulu.`, 400, "APPROVAL_ND_REQUIRED");
    const changed = await tx.purchaseOrder.updateMany({ where: { id: { in: targets.map(row => row.id) }, creditLimitBatchId: batch.id, statusCreditLimit: source }, data: { statusCreditLimit: target } });
    if (changed.count !== targets.length) throw new ApprovalActionError("Status PO berubah selama approval. Muat ulang batch.", 409, "APPROVAL_STATUS_CHANGED");
    await tx.auditLog.createMany({ data: targets.map(row => ({ entityId: row.id, entity: "PurchaseOrder", action: "UPDATE", userId: actor.id, userName: actor.name, userRole: actor.role,
      newData: sanitizeAuditData({ field: "statusCreditLimit", oldStatus: source, newStatus: target, action: input.poId ? "approveDireksi" : input.stage === "pusat" ? "approveAll" : "approveDireksiAll", batchCode: batch.batchCode }) })) });
    if (input.stage === "direksi") {
      const pending = await tx.purchaseOrder.count({ where: { creditLimitBatchId: batch.id, OR: [{ statusCreditLimit: null }, { statusCreditLimit: { not: "APPROVED_DIREKSI" } }] } });
      if (!pending) await tx.creditLimitBatch.update({ where: { id: batch.id }, data: { status: "CLOSED" } });
    }
    return { ...result, count: changed.count, success: true };
  }, { timeout: 15000, ...(input.mode === "check" ? { isolationLevel: "RepeatableRead" as const } : {}) });
}
