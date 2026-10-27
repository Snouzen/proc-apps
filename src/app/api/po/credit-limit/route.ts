import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { auditActivity, sanitizeAuditData } from "@/lib/audit";
import { hasPermission } from "@/lib/accessControl";
import { checkPOOwnership } from "@/lib/utils/regional";
import { isInvoiceEmpty } from "@/app/api/po/services/poQueryBuilder";

const APPROVAL_TRANSACTION_OPTIONS = { timeout: 15000 };

function approvalTimeoutResponse(error: any) {
  if (error?.code !== "P2028" && !/expired transaction|transaction.*(?:expired|timed out)/i.test(error?.message || "")) return null;
  console.error("Credit Limit transaction expired:", error);
  return NextResponse.json({
    error: "Proses Credit Limit melewati batas waktu transaksi. Muat ulang untuk memeriksa status terbaru, lalu coba kembali jika belum disetujui.",
    code: "CREDIT_LIMIT_TRANSACTION_TIMEOUT",
  }, { status: 503 });
}

export async function POST(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session: sessionObj, role: safeRole, dbUser } = auth;
    const userRegional = dbUser?.regional || (sessionObj as any)?.regional || null;
    const userSiteArea = dbUser?.siteArea || (sessionObj as any)?.siteArea || null;

    const body = await req.json().catch(() => ({}));
    const { poId, poIds, action, remarks } = body;

    if (action !== "closeBatch" && action !== "uncloseBatch" && !poId && (!poIds || !Array.isArray(poIds))) {
      return NextResponse.json({ error: "poId(s) and action are required" }, { status: 400 });
    }

    const validActions = ["request", "reRequest", "approve", "approveDireksi", "reject", "approveAll", "approveDireksiAll", "updateKodeVendor", "toggleND", "toggleAllND", "updateNDDetails", "closeBatch", "uncloseBatch"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (["approve", "approveDireksi", "reject", "approveAll", "approveDireksiAll", "closeBatch", "uncloseBatch"].includes(action) && safeRole !== "pusat") {
      return NextResponse.json({ error: "Approval Credit Limit hanya dapat diakses Pusat." }, { status: 403 });
    }

    if (["request", "reRequest"].includes(action) && !(await hasPermission(safeRole, "cl_data_view"))) {
      return NextResponse.json({ error: "Akses Data Credit Limit ditolak." }, { status: 403 });
    }

    if (["approve", "approveDireksi", "reject", "approveAll", "approveDireksiAll"].includes(action)) {
      const allowed = await hasPermission(safeRole, "cl_appr_approve");
      if (!allowed) {
        return NextResponse.json({ error: "Akses ditolak: Akun Anda tidak memiliki izin otorisasi Credit Limit (cl_appr_approve)" }, { status: 403 });
      }
    }

    // ── REQUEST & RE-REQUEST: Auto-assign to batch (Protected with Concurrency Lock & Scope Check) ──
    if (action === "request" || action === "reRequest") {
      try {
        const result = await prisma.$transaction(async (tx: any) => {
          // Lindungi kapasitas batch maksimum 50 dari race condition saat request bersamaan
          await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(718293)");

          // Kunci baris PO agar status dan batch tidak diubah bersamaan
          await tx.$executeRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${poId} FOR UPDATE`;

          const existingPo = await tx.purchaseOrder.findUnique({
            where: { id: poId },
            include: { UnitProduksi: true },
          });
          if (!existingPo) {
            const err: any = new Error("PO tidak ditemukan");
            err.statusCode = 404;
            throw err;
          }

          // 1. Validasi Scope PO
          const check = checkPOOwnership(existingPo, safeRole, userRegional, userSiteArea);
          if (!check.allowed) {
            const err: any = new Error(check.reason || "Forbidden: Anda tidak memiliki wewenang atas PO ini");
            err.statusCode = 403;
            throw err;
          }

          // 2. Sinkronkan Eligibility dengan filter daftar 'credit_data'
          // a. Wajib memiliki tanggal pengiriman (tglkirim)
          if (!existingPo.tglkirim) {
            const err: any = new Error("PO belum memiliki tanggal pengiriman (tglkirim) dan tidak eligible untuk pengajuan Credit Limit");
            err.statusCode = 400;
            throw err;
          }

          // b. Wajib belum memiliki invoice (sinkron dengan definisi filter credit_data)
          if (!isInvoiceEmpty(existingPo.noInvoice)) {
            const err: any = new Error("PO yang sudah memiliki nomor invoice tidak eligible untuk pengajuan Credit Limit");
            err.statusCode = 400;
            throw err;
          }

          // c. Wajib dialokasikan ke Unit Produksi yang valid (bukan UNKNOWN)
          const poUnit = (existingPo.unitProduksiId || "").trim().toLowerCase();
          const siteArea = (existingPo.UnitProduksi?.siteArea || "").trim().toLowerCase();
          if (!poUnit || poUnit === "unknown" || !siteArea || siteArea === "unknown") {
            const err: any = new Error("PO belum dialokasikan ke Unit Produksi yang valid");
            err.statusCode = 400;
            throw err;
          }

          // d. Validasi status Credit Limit saat ini
          if (existingPo.statusCreditLimit === "APPROVED_DIREKSI") {
            const err: any = new Error("PO sudah disetujui Direksi (Completed) dan tidak dapat diajukan ulang");
            err.statusCode = 400;
            throw err;
          }

          if (action === "request") {
            if (existingPo.statusCreditLimit === "REQUESTED") {
              const err: any = new Error("PO sudah berada dalam status pengajuan (REQUESTED)");
              err.statusCode = 400;
              throw err;
            }
            if (existingPo.statusCreditLimit === "APPROVED") {
              const err: any = new Error("PO sudah disetujui Pusat (APPROVED) dan sedang menunggu persetujuan Direksi");
              err.statusCode = 400;
              throw err;
            }
          } else if (action === "reRequest") {
            if (existingPo.statusCreditLimit !== "REJECTED") {
              const err: any = new Error(
                `PO #${existingPo.noPo} tidak dapat diajukan ulang karena berstatus '${existingPo.statusCreditLimit || "NONE"}' (hanya status REJECTED yang dapat diajukan ulang)`
              );
              err.statusCode = 400;
              throw err;
            }
          }

          // 3. Cari OPEN batch yang belum pernah memiliki PO APPROVED
          let batch = await tx.creditLimitBatch.findFirst({
            where: {
              status: "OPEN",
              PurchaseOrders: {
                none: {
                  statusCreditLimit: {
                    in: ["APPROVED", "APPROVED_DIREKSI"],
                  },
                },
              },
            },
            orderBy: { seqNumber: "asc" },
          });

          // 4. Verifikasi kapasitas batch aktual di bawah lock: jika >= 50, auto-close
          if (batch) {
            const currentCount = await tx.purchaseOrder.count({
              where: { creditLimitBatchId: batch.id },
            });
            if (currentCount >= 50) {
              await tx.creditLimitBatch.update({
                where: { id: batch.id },
                data: { status: "CLOSED" },
              });
              batch = null;
            }
          }

          // 5. Buat batch baru jika belum ada batch bersih yang terbuka
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
            });

            await auditActivity(tx as any, batch.id, "CreditLimitBatch", "CREATE", {
              id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
              name: getProfileName(sessionObj, dbUser),
              role: safeRole,
            });
          }

          // 6. Update PO ke status REQUESTED dan alokasikan ke batch
          const po = await tx.purchaseOrder.update({
            where: { id: poId },
            data: {
              statusCreditLimit: "REQUESTED",
              remarksCreditLimit: remarks || null,
              creditLimitBatchId: batch.id,
            },
          });

          // 7. Hard cap: auto-close jika batch mencapai kapasitas tepat 50 PO
          const updatedCount = await tx.purchaseOrder.count({
            where: { creditLimitBatchId: batch.id },
          });
          if (updatedCount >= 50) {
            await tx.creditLimitBatch.update({
              where: { id: batch.id },
              data: { status: "CLOSED" },
            });
          }

          await auditActivity(tx as any, po.id, "PurchaseOrder", "UPDATE", {
            id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
            name: getProfileName(sessionObj, dbUser),
            role: safeRole,
          }, {
            field: "statusCreditLimit",
            oldStatus: existingPo.statusCreditLimit,
            newStatus: "REQUESTED",
            batchCode: batch.batchCode,
            action,
          });

          return { po, batchCode: batch.batchCode };
        });

        return NextResponse.json({ success: true, data: result.po, batchCode: result.batchCode });
      } catch (err: any) {
        const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
        return NextResponse.json({ error: err?.message || (action === "request" ? "Gagal mengajukan Credit Limit" : "Gagal mengajukan ulang PO") }, { status });
      }
    }

    // ── APPROVE ALL PUSAT (Wajib Seluruh PO Berstatus REQUESTED) ────────
    if (action === "approveAll" && poIds && Array.isArray(poIds)) {
      if (poIds.length === 0) {
        return NextResponse.json({ error: "Daftar PO kosong" }, { status: 400 });
      }

      try {
        const result = await prisma.$transaction(async (tx: any) => {
          const targetPos = await tx.purchaseOrder.findMany({
            where: { id: { in: poIds } },
            select: { id: true, noPo: true, statusCreditLimit: true },
          });

          if (targetPos.length !== poIds.length) {
            const err: any = new Error("Sebagian PO dalam daftar tidak ditemukan di sistem");
            err.statusCode = 404;
            throw err;
          }

          // Validasi status asal: Seluruh PO wajib berstatus REQUESTED untuk disetujui Pusat
          const notRequested = targetPos.filter((p: any) => p.statusCreditLimit !== "REQUESTED");
          if (notRequested.length > 0) {
            const sampleList = notRequested.slice(0, 3).map((p: any) => p.noPo).join(", ");
            const moreCount = notRequested.length > 3 ? ` dan ${notRequested.length - 3} PO lainnya` : "";
            const err: any = new Error(
              `Terdapat ${notRequested.length} PO yang statusnya bukan REQUESTED (${sampleList}${moreCount}). Hanya PO berstatus REQUESTED yang dapat disetujui Pusat.`
            );
            err.statusCode = 400;
            throw err;
          }

          const updateRes = await tx.purchaseOrder.updateMany({
            where: {
              id: { in: poIds },
              statusCreditLimit: "REQUESTED",
            },
            data: { statusCreditLimit: "APPROVED" },
          });

          if (updateRes.count !== poIds.length) {
            const err: any = new Error("Sebagian PO mengalami perubahan status selama proses approval Pusat");
            err.statusCode = 409;
            throw err;
          }

          // Preserve one audit entry per PO using one database round-trip.
          await tx.auditLog.createMany({
            data: targetPos.map((p: any) => ({
              entityId: p.id,
              entity: "PurchaseOrder",
              action: "UPDATE",
              userId: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
              userName: getProfileName(sessionObj, dbUser),
              userRole: safeRole,
              newData: sanitizeAuditData({ field: "statusCreditLimit", oldStatus: "REQUESTED", newStatus: "APPROVED", action: "approveAll" }),
            })),
          });

          return updateRes;
        }, APPROVAL_TRANSACTION_OPTIONS);

        return NextResponse.json({ success: true, count: result.count });
      } catch (err: any) {
        const timeoutResponse = approvalTimeoutResponse(err);
        if (timeoutResponse) return timeoutResponse;
        const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
        return NextResponse.json({ error: err?.message || "Gagal melakukan persetujuan massal Pusat" }, { status });
      }
    }

    // ── APPROVE ALL DIREKSI ────────────────────────────────────────────
    if (action === "approveDireksiAll" && poIds && Array.isArray(poIds)) {
      const result = await prisma.$transaction(async (tx: any) => {
        const targetPos = await tx.purchaseOrder.findMany({
          where: { id: { in: poIds } },
          select: { id: true, noPo: true, statusCreditLimit: true, noNd: true, creditLimitBatchId: true }
        });

        if (targetPos.length !== poIds.length) {
          throw new Error("Sebagian PO dalam daftar tidak ditemukan di sistem");
        }

        // Validasi: Seluruh PO wajib memiliki nomor Nota Dinas (ND) sebelum disetujui Direksi
        const missingNdPos = targetPos.filter((p: any) => !p.noNd || !p.noNd.trim());
        if (missingNdPos.length > 0) {
          const sampleList = missingNdPos.slice(0, 3).map((p: any) => p.noPo).join(", ");
          const moreCount = missingNdPos.length > 3 ? ` dan ${missingNdPos.length - 3} PO lainnya` : "";
          throw new Error(`Terdapat ${missingNdPos.length} PO yang belum memiliki nomor Nota Dinas (ND) (${sampleList}${moreCount}). Lengkapi nomor ND terlebih dahulu.`);
        }

        // Validasi: Seluruh PO wajib berstatus APPROVED (Pusat) - strictly reject null, undefined, or REQUESTED
        const notApprovedPusat = targetPos.filter((p: any) => p.statusCreditLimit !== "APPROVED");
        if (notApprovedPusat.length > 0) {
          const sampleList = notApprovedPusat.slice(0, 3).map((p: any) => p.noPo).join(", ");
          const moreCount = notApprovedPusat.length > 3 ? ` dan ${notApprovedPusat.length - 3} PO lainnya` : "";
          throw new Error(`Terdapat ${notApprovedPusat.length} PO yang belum disetujui Pusat (${sampleList}${moreCount}). Seluruh PO wajib disetujui Pusat (APPROVED) sebelum persetujuan Direksi.`);
        }

        const updateRes = await tx.purchaseOrder.updateMany({
          where: { 
            id: { in: poIds },
            statusCreditLimit: "APPROVED",
            noNd: { not: null },
            NOT: { noNd: "" }
          },
          data: { statusCreditLimit: "APPROVED_DIREKSI" },
        });

        if (updateRes.count !== poIds.length) {
          throw new Error("Sebagian PO mengalami perubahan status atau nomor ND selama transaksi approval Direksi.");
        }

        // Audit rows remain atomic with status changes, batched into one query.
        if (targetPos.length > 0) {
          await tx.auditLog.createMany({
            data: targetPos.map((p: any) => ({
              entityId: p.id,
              entity: "PurchaseOrder",
              action: "UPDATE",
              userId: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
              userName: getProfileName(sessionObj, dbUser),
              userRole: safeRole,
              newData: sanitizeAuditData({ field: "statusCreditLimit", oldStatus: p.statusCreditLimit, newStatus: "APPROVED_DIREKSI", action: "approveDireksiAll" }),
            })),
          });
        }

        // Auto-close affected batches if all POs are now APPROVED_DIREKSI
        const batchIds = [...new Set(targetPos.map((p: any) => p.creditLimitBatchId).filter(Boolean))];
        for (const batchId of batchIds) {
          const pendingCount = await tx.purchaseOrder.count({
            where: {
              creditLimitBatchId: batchId,
              statusCreditLimit: { not: "APPROVED_DIREKSI" },
            },
          });
          if (pendingCount === 0) {
            await tx.creditLimitBatch.update({
              where: { id: batchId },
              data: { status: "CLOSED" },
            });
          }
        }

        return updateRes;
      }, APPROVAL_TRANSACTION_OPTIONS);

      return NextResponse.json({ success: true, count: result.count });
    }

    // ── APPROVE PUSAT (Wajib Berstatus REQUESTED & Conditional Atomic Update) ──
    if (action === "approve") {
      try {
        const po = await prisma.$transaction(async (tx: any) => {
          const currentPo = await tx.purchaseOrder.findUnique({ 
            where: { id: poId }, 
            select: { id: true, noPo: true, statusCreditLimit: true } 
          });
          if (!currentPo) throw new Error("PO_NOT_FOUND");
          if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
            throw new Error("PO_ALREADY_COMPLETED");
          }
          if (currentPo.statusCreditLimit !== "REQUESTED") {
            throw new Error(`PO_STATUS_NOT_REQUESTED:${currentPo.noPo}:${currentPo.statusCreditLimit || "NONE"}`);
          }

          // Conditional atomic update: menjamin tidak menimpa perubahan bersamaan
          const updateRes = await tx.purchaseOrder.updateMany({
            where: {
              id: poId,
              statusCreditLimit: "REQUESTED",
            },
            data: { statusCreditLimit: "APPROVED" },
          });

          if (updateRes.count === 0) {
            throw new Error("PO_CONCURRENT_MODIFICATION");
          }

          const updatedPo = await tx.purchaseOrder.findUnique({
            where: { id: poId },
          });

          await auditActivity(tx as any, poId, "PurchaseOrder", "UPDATE", {
            id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
            name: getProfileName(sessionObj, dbUser),
            role: safeRole
          }, {
            field: "statusCreditLimit",
            oldStatus: "REQUESTED",
            newStatus: "APPROVED",
            action: "approve"
          });

          return updatedPo;
        }, APPROVAL_TRANSACTION_OPTIONS);

        return NextResponse.json({ success: true, data: po });
      } catch (err: any) {
        if (err.message === "PO_NOT_FOUND") return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
        if (err.message === "PO_ALREADY_COMPLETED") return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
        if (err.message?.startsWith("PO_STATUS_NOT_REQUESTED:")) {
          const parts = err.message.split(":");
          return NextResponse.json(
            { error: `PO #${parts[1]} berstatus '${parts[2]}'. Hanya PO berstatus REQUESTED yang dapat disetujui Pusat.` },
            { status: 400 }
          );
        }
        if (err.message === "PO_CONCURRENT_MODIFICATION") {
          return NextResponse.json({ error: "PO sedang dimodifikasi atau status telah berubah. Silakan coba kembali." }, { status: 409 });
        }
        const timeoutResponse = approvalTimeoutResponse(err);
        if (timeoutResponse) return timeoutResponse;
        const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
        return NextResponse.json({ error: err?.message || "Gagal menyetujui PO" }, { status });
      }
    }

    // ── APPROVE DIREKSI (Wajib No ND) ──────────────────────────────────
    if (action === "approveDireksi") {
      try {
        const po = await prisma.$transaction(async (tx: any) => {
          const currentPo = await tx.purchaseOrder.findUnique({
            where: { id: poId },
            select: { id: true, statusCreditLimit: true, noNd: true, noPo: true, creditLimitBatchId: true },
          });
          if (!currentPo) throw new Error("PO_NOT_FOUND");
          if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
            throw new Error("PO_ALREADY_COMPLETED");
          }
          if (currentPo.statusCreditLimit !== "APPROVED") {
            throw new Error(`PO_STATUS_INVALID:${currentPo.noPo}:${currentPo.statusCreditLimit || "NONE"}`);
          }
          if (!currentPo.noNd || !currentPo.noNd.trim()) {
            throw new Error(`PO_MISSING_ND:${currentPo.noPo}`);
          }
          if (body.noNd && String(body.noNd).trim() !== currentPo.noNd.trim()) {
            throw new Error("PO_ND_MISMATCH");
          }

          // Pembaruan bersyarat atomik terhadap status APPROVED dan ND tepat
          const updateRes = await tx.purchaseOrder.updateMany({
            where: {
              id: poId,
              statusCreditLimit: "APPROVED",
              noNd: currentPo.noNd,
            },
            data: { statusCreditLimit: "APPROVED_DIREKSI" },
          });

          if (updateRes.count === 0) {
            throw new Error("PO_CONCURRENT_MODIFICATION");
          }

          const updatedPo = await tx.purchaseOrder.findUnique({
            where: { id: poId },
          });

          await auditActivity(tx as any, poId, "PurchaseOrder", "UPDATE", {
            id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
            name: getProfileName(sessionObj, dbUser),
            role: safeRole
          }, {
            field: "statusCreditLimit",
            oldStatus: currentPo.statusCreditLimit,
            newStatus: "APPROVED_DIREKSI",
            action: "approveDireksi"
          });

          if (updatedPo?.creditLimitBatchId) {
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
        }, APPROVAL_TRANSACTION_OPTIONS);
        return NextResponse.json({ success: true, data: po });
      } catch (err: any) {
        if (err.message === "PO_NOT_FOUND") return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
        if (err.message === "PO_ALREADY_COMPLETED") return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
        if (err.message === "PO_ND_MISMATCH") return NextResponse.json({ error: "Nomor Nota Dinas tidak sesuai dengan data sistem" }, { status: 400 });
        if (err.message?.startsWith("PO_STATUS_INVALID:")) {
          const parts = err.message.split(":");
          return NextResponse.json({ error: `PO #${parts[1]} berstatus '${parts[2]}'. PO wajib berstatus APPROVED (Pusat) terlebih dahulu sebelum persetujuan Direksi.` }, { status: 400 });
        }
        if (err.message?.startsWith("PO_MISSING_ND:")) {
          const parts = err.message.split(":");
          return NextResponse.json({ error: `PO #${parts[1]} belum memiliki nomor Nota Dinas (ND). Harap lengkapi nomor ND terlebih dahulu sebelum disetujui Direksi.` }, { status: 400 });
        }
        if (err.message === "PO_CONCURRENT_MODIFICATION") {
          return NextResponse.json({ error: "PO sedang dimodifikasi atau status telah berubah. Silakan coba kembali." }, { status: 409 });
        }
        throw err;
      }
    }

    // ── REJECT (Rule 4: Conditional Atomic Update & Protected Transaction) ────
    if (action === "reject") {
      try {
        const result = await prisma.$transaction(async (tx: any) => {
          // Kunci baris PO agar status tidak diubah paralel oleh approval Direksi
          await tx.$executeRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${poId} FOR UPDATE`;

          const currentPo = await tx.purchaseOrder.findUnique({
            where: { id: poId },
            select: { id: true, noPo: true, statusCreditLimit: true, creditLimitBatchId: true },
          });
          if (!currentPo) {
            const err: any = new Error("PO tidak ditemukan");
            err.statusCode = 404;
            throw err;
          }
          if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
            const err: any = new Error("PO yang sudah disetujui Direksi (Completed) tidak dapat ditolak");
            err.statusCode = 400;
            throw err;
          }

          // Atomic conditional update: Hanya tolak jika status masih REQUESTED atau APPROVED
          const updateRes = await tx.purchaseOrder.updateMany({
            where: {
              id: poId,
              statusCreditLimit: { in: ["REQUESTED", "APPROVED"] },
            },
            data: {
              statusCreditLimit: "REJECTED",
              creditLimitBatchId: null,
              ...(remarks ? { remarksCreditLimit: remarks } : {}),
            },
          });

          if (updateRes.count === 0) {
            const err: any = new Error("PO sedang dimodifikasi atau telah disetujui Direksi");
            err.statusCode = 409;
            throw err;
          }

          const po = await tx.purchaseOrder.findUnique({ where: { id: poId } });

          await auditActivity(tx as any, poId, "PurchaseOrder", "UPDATE", {
            id: dbUser?.id || (sessionObj as any)?.user?.id || "unknown",
            name: getProfileName(sessionObj, dbUser),
            role: safeRole
          }, {
            field: "statusCreditLimit",
            oldStatus: currentPo.statusCreditLimit,
            newStatus: "REJECTED",
            action: "reject",
            remarks: remarks || null
          });

          // Jika batch asal masih memiliki PO dan seluruh sisanya sudah APPROVED_DIREKSI, auto-close batch
          const originalBatchId = currentPo.creditLimitBatchId;
          if (originalBatchId) {
            const remainingCount = await tx.purchaseOrder.count({
              where: { creditLimitBatchId: originalBatchId },
            });

            if (remainingCount > 0) {
              const pendingCount = await tx.purchaseOrder.count({
                where: {
                  creditLimitBatchId: originalBatchId,
                  statusCreditLimit: { not: "APPROVED_DIREKSI" },
                },
              });
              if (pendingCount === 0) {
                await tx.creditLimitBatch.update({
                  where: { id: originalBatchId },
                  data: { status: "CLOSED" },
                });
              }
            }
          }

          return po;
        });

        return NextResponse.json({ success: true, data: result });
      } catch (err: any) {
        const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
        return NextResponse.json({ error: err?.message || "Gagal menolak PO" }, { status });
      }
    }

    // ── UPDATE KODE VENDOR ─────────────────────────────────────────────
    if (action === "updateKodeVendor") {
      const allowed = (await hasPermission(safeRole, "po_edit")) || (await hasPermission(safeRole, "cl_appr_approve"));
      if (!allowed) {
        return NextResponse.json({ error: "Akses ditolak: Akun Anda tidak memiliki izin mengubah data vendor (po_edit)" }, { status: 403 });
      }
      const currentPo = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: { UnitProduksi: true },
      });
      if (!currentPo) {
        return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
      }
      const ownership = checkPOOwnership(currentPo, safeRole, userRegional, userSiteArea);
      if (!ownership.allowed) {
        return NextResponse.json({ error: ownership.reason || "Forbidden: Anda tidak memiliki wewenang atas PO ini" }, { status: 403 });
      }
      if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { kodeVendor: body.kodeVendor || null },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── TOGGLE ND (NOTA DINAS) ─────────────────────────────────────────
    if (action === "toggleND") {
      const allowed = (await hasPermission(safeRole, "po_edit")) || (await hasPermission(safeRole, "nd_generate")) || (await hasPermission(safeRole, "cl_appr_approve"));
      if (!allowed) {
        return NextResponse.json({ error: "Akses ditolak: Akun Anda tidak memiliki izin mengubah status Nota Dinas" }, { status: 403 });
      }
      const currentPo = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: { UnitProduksi: true },
      });
      if (!currentPo) {
        return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
      }
      const ownership = checkPOOwnership(currentPo, safeRole, userRegional, userSiteArea);
      if (!ownership.allowed) {
        return NextResponse.json({ error: ownership.reason || "Forbidden: Anda tidak memiliki wewenang atas PO ini" }, { status: 403 });
      }
      if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
        return NextResponse.json({ error: "PO sudah disetujui Direksi (Completed)" }, { status: 400 });
      }
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { isNotaDinas: body.isNotaDinas },
      });
      return NextResponse.json({ success: true, data: po });
    }

    // ── TOGGLE ALL ND (NOTA DINAS) ─────────────────────────────────────
    if (action === "toggleAllND" && poIds && Array.isArray(poIds)) {
      const allowed = (await hasPermission(safeRole, "po_edit")) || (await hasPermission(safeRole, "nd_generate")) || (await hasPermission(safeRole, "cl_appr_approve"));
      if (!allowed) {
        return NextResponse.json({ error: "Akses ditolak: Akun Anda tidak memiliki izin mengubah status Nota Dinas" }, { status: 403 });
      }
      const targetPos = await prisma.purchaseOrder.findMany({
        where: { id: { in: poIds } },
        include: { UnitProduksi: true },
      });
      if (safeRole !== "pusat") {
        for (const p of targetPos) {
          const ownership = checkPOOwnership(p, safeRole, userRegional, userSiteArea);
          if (!ownership.allowed) {
            return NextResponse.json({ error: `Forbidden: PO #${p.noPo} berada di luar wewenang regional Anda` }, { status: 403 });
          }
        }
      }
      const result = await prisma.purchaseOrder.updateMany({
        where: {
          id: { in: poIds },
          statusCreditLimit: { not: "APPROVED_DIREKSI" },
        },
        data: { isNotaDinas: body.isNotaDinas },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // ── UPDATE ND DETAILS ──────────────────────────────────────────────
    if (action === "updateNDDetails") {
      const allowed = (await hasPermission(safeRole, "po_edit")) || (await hasPermission(safeRole, "nd_generate")) || (await hasPermission(safeRole, "cl_appr_approve"));
      if (!allowed) {
        return NextResponse.json({ error: "Akses ditolak: Akun Anda tidak memiliki izin mengubah rincian Nota Dinas" }, { status: 403 });
      }
      const currentPo = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: { UnitProduksi: true },
      });
      if (!currentPo) {
        return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
      }
      const ownership = checkPOOwnership(currentPo, safeRole, userRegional, userSiteArea);
      if (!ownership.allowed) {
        return NextResponse.json({ error: ownership.reason || "Forbidden: Anda tidak memiliki wewenang atas PO ini" }, { status: 403 });
      }
      if (currentPo.statusCreditLimit === "APPROVED_DIREKSI") {
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

    // ── CLOSE BATCH (MANUAL - Rule 2: Syarat seluruh PO wajib APPROVED_DIREKSI) ──
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
        include: {
          PurchaseOrders: { select: { statusCreditLimit: true } },
        },
      });
      if (!batch) {
        return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
      }
      if (batch.status === "CLOSED") {
        return NextResponse.json({ error: "Batch sudah ditutup" }, { status: 400 });
      }

      // Rule 2: Validasi seluruh PO wajib APPROVED_DIREKSI
      const isAllApprovedDireksi = batch.PurchaseOrders.length > 0 && batch.PurchaseOrders.every((p: any) => p.statusCreditLimit === "APPROVED_DIREKSI");
      if (!isAllApprovedDireksi) {
        return NextResponse.json({
          error: `Batch ${batchCode} belum dapat ditutup karena masih ada PO yang belum disetujui Direksi (Approved Direksi).`
        }, { status: 400 });
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
    const timeoutResponse = approvalTimeoutResponse(error);
    if (timeoutResponse) return timeoutResponse;
    console.error("Credit limit API error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error?.message }, { status: 500 });
  }
}
