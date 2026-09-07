import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { auditActivity } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session: sessionObj, role: safeRole, dbUser } = auth;

    const body = await req.json().catch(() => ({}));
    const { poId, poIds, action, remarks } = body;

    if (action !== "closeBatch" && action !== "uncloseBatch" && !poId && (!poIds || !Array.isArray(poIds))) {
      return NextResponse.json({ error: "poId(s) and action are required" }, { status: 400 });
    }

    const validActions = ["request", "reRequest", "approve", "approveDireksi", "reject", "approveAll", "approveDireksiAll", "updateKodeVendor", "toggleND", "toggleAllND", "updateNDDetails", "closeBatch", "uncloseBatch"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if ((action === "approve" || action === "approveDireksi" || action === "reject" || action === "approveAll" || action === "approveDireksiAll") && safeRole !== "pusat") {
      return NextResponse.json({ error: "Hanya Pusat yang dapat melakukan aksi ini" }, { status: 403 });
    }

    // ── REQUEST: Auto-assign to batch ──────────────────────────────────
    if (action === "request") {
      const existingPo = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        select: { id: true, noPo: true, statusCreditLimit: true },
      });
      if (!existingPo) {
        return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
      }
      if (existingPo.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed) dan tidak dapat diajukan ulang" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Find an OPEN batch that has NO completed (APPROVED_DIREKSI) POs
        let batch = await tx.creditLimitBatch.findFirst({
          where: {
            status: "OPEN",
            PurchaseOrders: {
              none: {
                statusCreditLimit: "APPROVED_DIREKSI",
              },
            },
          },
          orderBy: { seqNumber: "asc" },
          include: { _count: { select: { PurchaseOrders: true } } },
        });

        // 2. If batch exists but is full (>= 50), auto-close it
        if (batch && batch._count.PurchaseOrders >= 50) {
          await tx.creditLimitBatch.update({
            where: { id: batch.id },
            data: { status: "CLOSED" },
          });
          batch = null;
        }

        // 3. If no open clean batch, create a new one
        if (!batch) {
          const lastBatch = await tx.creditLimitBatch.findFirst({
            orderBy: { seqNumber: "desc" },
            select: { seqNumber: true },
          });
          const nextSeq = (lastBatch?.seqNumber || 0) + 1;

          const now = new Date();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const yyyy = String(now.getFullYear());
          const batchCode = `CL-${String(nextSeq).padStart(3, "0")}/${mm}/${yyyy}`;

          batch = await tx.creditLimitBatch.create({
            data: {
              batchCode,
              seqNumber: nextSeq,
              status: "OPEN",
            },
            include: { _count: { select: { PurchaseOrders: true } } },
          });

          await auditActivity(tx as any, batch.id, "CreditLimitBatch", "CREATE", { id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown", name: getProfileName(sessionObj, dbUser), role: safeRole });
        }

        // 4. Update the PO
        const po = await tx.purchaseOrder.update({
          where: { id: poId },
          data: {
            statusCreditLimit: "REQUESTED",
            remarksCreditLimit: remarks || null,
            creditLimitBatchId: batch.id,
          },
        });

        // 5. Hard cap: auto-close at 50 POs
        const updatedCount = await tx.purchaseOrder.count({
          where: { creditLimitBatchId: batch.id },
        });
        if (updatedCount >= 50) {
          await tx.creditLimitBatch.update({
            where: { id: batch.id },
            data: { status: "CLOSED" },
          });
        }

        return { po, batchCode: batch.batchCode };
      });

      return NextResponse.json({ success: true, data: result.po, batchCode: result.batchCode });
    }

    // ── APPROVE ALL PUSAT ──────────────────────────────────────────────
    if (action === "approveAll" && poIds && Array.isArray(poIds)) {
      if (safeRole !== "pusat") {
        return NextResponse.json({ error: "Hanya Pusat yang dapat melakukan aksi ini" }, { status: 403 });
      }
      const result = await prisma.purchaseOrder.updateMany({
        where: {
          id: { in: poIds },
          statusCreditLimit: { not: "APPROVED_DIREKSI" },
        },
        data: { statusCreditLimit: "APPROVED" },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // ── APPROVE ALL DIREKSI ────────────────────────────────────────────
    if (action === "approveDireksiAll" && poIds && Array.isArray(poIds)) {
      if (safeRole !== "pusat") {
        return NextResponse.json({ error: "Hanya Pusat yang dapat melakukan aksi ini" }, { status: 403 });
      }
      const result = await prisma.$transaction(async (tx: any) => {
        const updateRes = await tx.purchaseOrder.updateMany({
          where: { id: { in: poIds } },
          data: { statusCreditLimit: "APPROVED_DIREKSI" },
        });

        // Auto-close affected batches if all POs are now APPROVED_DIREKSI
        const affectedPos = await tx.purchaseOrder.findMany({
          where: { id: { in: poIds } },
          select: { creditLimitBatchId: true },
          distinct: ["creditLimitBatchId"],
        });

        for (const { creditLimitBatchId } of affectedPos) {
          if (creditLimitBatchId) {
            const pendingCount = await tx.purchaseOrder.count({
              where: {
                creditLimitBatchId,
                statusCreditLimit: { not: "APPROVED_DIREKSI" },
              },
            });
            if (pendingCount === 0) {
              await tx.creditLimitBatch.update({
                where: { id: creditLimitBatchId },
                data: { status: "CLOSED" },
              });
            }
          }
        }
        return updateRes;
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // ── APPROVE PUSAT ──────────────────────────────────────────────────
    if (action === "approve") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { statusCreditLimit: true } });
      if (currentPo?.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { statusCreditLimit: "APPROVED" },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── APPROVE DIREKSI ────────────────────────────────────────────────
    if (action === "approveDireksi") {
      const po = await prisma.$transaction(async (tx: any) => {
        const updatedPo = await tx.purchaseOrder.update({
          where: { id: poId },
          data: { statusCreditLimit: "APPROVED_DIREKSI" },
        });

        if (updatedPo.creditLimitBatchId) {
          const pendingCount = await tx.purchaseOrder.count({
            where: {
              creditLimitBatchId: updatedPo.creditLimitBatchId,
              statusCreditLimit: { not: "APPROVED_DIREKSI" },
            },
          });
          if (pendingCount === 0) {
            await tx.creditLimitBatch.update({
              where: { id: updatedPo.creditLimitBatchId },
              data: { status: "CLOSED" },
            });
          }
        }
        return updatedPo;
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── REJECT ─────────────────────────────────────────────────────────
    if (action === "reject") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      if (!currentPo) return NextResponse.json({ error: "PO not found" }, { status: 404 });
      if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO yang sudah disetujui Direksi (Completed) tidak dapat ditolak" }, { status: 400 });
      }

      if (currentPo.statusCreditLimit === "REQUESTED") {
        // Rejected by Pusat -> Reset PO, remove from batch (goes back to Data page)
        const po = await prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            statusCreditLimit: "REJECTED",
            creditLimitBatchId: null,
          },
        });
        return NextResponse.json({ success: true, data: po });
      } else {
        // Rejected by Direksi -> Stay in batch, set status to REJECTED
        const po = await prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            statusCreditLimit: "REJECTED",
          },
        });
        return NextResponse.json({ success: true, data: po });
      }
    }

    // ── RE-REQUEST (Dari halaman approval untuk PO yang ditolak Direksi) 
    if (action === "reRequest") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      if (!currentPo) return NextResponse.json({ error: "PO not found" }, { status: 404 });
      if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: {
          statusCreditLimit: "REQUESTED",
        },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── UPDATE KODE VENDOR ─────────────────────────────────────────────
    if (action === "updateKodeVendor") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { statusCreditLimit: true } });
      if (currentPo?.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { kodeVendor: body.kodeVendor || null },
      });
      return NextResponse.json({ success: true, data: po });
    }

    //  TOGGLE ND (NOTA DINAS) 
    if (action === "toggleND") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { statusCreditLimit: true } });
      if (currentPo?.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { isNotaDinas: body.isNotaDinas },
      });
      return NextResponse.json({ success: true, data: po });
    }

    //  TOGGLE ALL ND (NOTA DINAS) 
    if (action === "toggleAllND" && poIds && Array.isArray(poIds)) {
      const result = await prisma.purchaseOrder.updateMany({
        where: {
          id: { in: poIds },
          statusCreditLimit: { not: "APPROVED_DIREKSI" },
        },
        data: { isNotaDinas: body.isNotaDinas },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // UPDATE ND DETAILS
    if (action === "updateNDDetails") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { statusCreditLimit: true } });
      if (currentPo?.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const hasNd = Boolean(body.noNd && String(body.noNd).trim() !== "");
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { 
          noNd: body.noNd || null,
          linkNd: body.linkNd || null,
          ...(hasNd ? { isNotaDinas: true } : {}),
        },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── CLOSE BATCH (MANUAL) ─────────────────────────────────────────
    if (action === "closeBatch") {
      if (safeRole !== "pusat") {
        return NextResponse.json({ error: "Hanya Pusat yang dapat menutup batch" }, { status: 403 });
      }
      const { batchCode } = body;
      if (!batchCode) {
        return NextResponse.json({ error: "batchCode is required" }, { status: 400 });
      }
      const batch = await prisma.creditLimitBatch.findUnique({
        where: { batchCode },
      });
      if (!batch) {
        return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
      }
      if (batch.status === "CLOSED") {
        return NextResponse.json({ error: "Batch sudah ditutup" }, { status: 400 });
      }
      await prisma.creditLimitBatch.update({
        where: { id: batch.id },
        data: { status: "CLOSED" },
      });
      return NextResponse.json({ success: true, message: `Batch ${batchCode} berhasil ditutup` });
    }

    // ── UNCLOSE BATCH (MANUAL) ───────────────────────────────────────
    if (action === "uncloseBatch") {
      if (safeRole !== "pusat") {
        return NextResponse.json({ error: "Hanya Pusat yang dapat membuka kembali batch" }, { status: 403 });
      }
      const { batchCode } = body;
      if (!batchCode) {
        return NextResponse.json({ error: "batchCode is required" }, { status: 400 });
      }

      // Check distance rule, PO count, and completed state
      const result = await prisma.$transaction(async (tx: any) => {
        const batch = await tx.creditLimitBatch.findUnique({
          where: { batchCode },
          include: {
            _count: { select: { PurchaseOrders: true } },
            PurchaseOrders: { select: { statusCreditLimit: true } },
          },
        });

        if (!batch) {
          throw new Error("Batch tidak ditemukan");
        }
        if (batch.status === "OPEN") {
          throw new Error("Batch masih terbuka");
        }
        if (batch._count.PurchaseOrders >= 50) {
          throw new Error("Batch sudah mencapai batas maksimal 50 PO");
        }

        // Do not allow unclosing if all POs in batch are already completed
        const isAllCompleted = batch.PurchaseOrders.length > 0 && batch.PurchaseOrders.every((p: any) => p.statusCreditLimit === "APPROVED_DIREKSI");
        if (isAllCompleted) {
          throw new Error("Batch yang sudah selesai (Completed) tidak dapat dibuka kembali");
        }

        const lastBatch = await tx.creditLimitBatch.findFirst({
          orderBy: { seqNumber: "desc" },
          select: { seqNumber: true },
        });

        const maxSeq = lastBatch?.seqNumber || 0;
        if (batch.seqNumber < maxSeq - 1) {
          throw new Error("Batch terlalu lama, tidak bisa dibuka kembali (hanya jarak 1 batch)");
        }

        await tx.creditLimitBatch.update({
          where: { id: batch.id },
          data: { status: "OPEN" },
        });

        return batch;
      });

      return NextResponse.json({ success: true, message: `Batch ${batchCode} berhasil dibuka kembali` });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error: any) {
    console.error("Credit limit API error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error?.message }, { status: 500 });
  }
}
