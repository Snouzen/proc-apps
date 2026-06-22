import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get("session")?.value;
    if (!token) {
      const hdr = req.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }

    const sessionObj = await Promise.resolve(verifySession(token));
    if (!sessionObj) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailRaw = sessionObj?.email || (sessionObj as any)?.user?.email || (sessionObj as any)?.payload?.email || "";
    const email = String(emailRaw).toLowerCase().trim();

    let dbUser = null;
    if (email) {
      dbUser = await prisma.user.findUnique({ where: { email } });
    }
    const safeRole = String(dbUser?.role || sessionObj?.role || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

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
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Find an OPEN batch (oldest first, so reopened batch gets priority)
        let batch = await tx.creditLimitBatch.findFirst({
          where: { status: "OPEN" },
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

        // 3. If no open batch, create a new one
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
        where: { id: { in: poIds } },
        data: { statusCreditLimit: "APPROVED" },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // ── APPROVE ALL DIREKSI ────────────────────────────────────────────
    if (action === "approveDireksiAll" && poIds && Array.isArray(poIds)) {
      if (safeRole !== "pusat") {
        return NextResponse.json({ error: "Hanya Pusat yang dapat melakukan aksi ini" }, { status: 403 });
      }
      const result = await prisma.purchaseOrder.updateMany({
        where: { id: { in: poIds } },
        data: { statusCreditLimit: "APPROVED_DIREKSI" },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // ── APPROVE PUSAT ──────────────────────────────────────────────────
    if (action === "approve") {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { statusCreditLimit: "APPROVED" },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── APPROVE DIREKSI ────────────────────────────────────────────────
    if (action === "approveDireksi") {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { statusCreditLimit: "APPROVED_DIREKSI" },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── REJECT ─────────────────────────────────────────────────────────
    if (action === "reject") {
      const currentPo = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      if (!currentPo) return NextResponse.json({ error: "PO not found" }, { status: 404 });

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
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { kodeVendor: body.kodeVendor || null },
      });
      return NextResponse.json({ success: true, data: po });
    }

    //  TOGGLE ND (NOTA DINAS) 
    if (action === "toggleND") {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { isNotaDinas: body.isNotaDinas },
      });
      return NextResponse.json({ success: true, data: po });
    }

    //  TOGGLE ALL ND (NOTA DINAS) 
    if (action === "toggleAllND" && poIds && Array.isArray(poIds)) {
      const result = await prisma.purchaseOrder.updateMany({
        where: { id: { in: poIds } },
        data: { isNotaDinas: body.isNotaDinas },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // UPDATE ND DETAILS
    if (action === "updateNDDetails") {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { 
          noNd: body.noNd || null,
          linkNd: body.linkNd || null,
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

      // Check distance rule and PO count
      const result = await prisma.$transaction(async (tx: any) => {
        const batch = await tx.creditLimitBatch.findUnique({
          where: { batchCode },
          include: { _count: { select: { PurchaseOrders: true } } },
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
