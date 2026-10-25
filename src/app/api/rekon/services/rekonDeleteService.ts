import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auditActivity } from "@/lib/audit";
import { getProfileName } from "@/lib/auth";
import { withTransactionRetry } from "@/lib/generatePoInvoiceNumber";
import { checkReconcileAccess } from "./rekonAccessHelper";

export async function deleteRekon(id: string, auth?: { session: any; role?: any; safeRole?: any; dbUser: any }) {
  return await withTransactionRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // 1. Kunci record Reconcile terlebih dahulu sebelum pembacaan untuk mencegah race condition
      await tx.$executeRaw`SELECT id FROM "reconciliations" WHERE id = ${id} FOR UPDATE`;

      const rekon = await tx.reconcile.findUnique({ where: { id } });
      if (!rekon) return { notFound: true };

      if (auth) {
        const accessCheck = await checkReconcileAccess(rekon, auth as any, tx);
        if (!accessCheck.allowed) {
          return { forbidden: true, reason: accessCheck.reason || "Forbidden: Anda tidak memiliki wewenang atas data rekonsiliasi ini" };
        }
      }

      const rekonNo = rekon.noRekonsiliasi;

      // 2. Kunci dan reset Purchase Orders dalam urutan ID deterministik (ORDER BY id ASC FOR UPDATE)
      if (rekon.invoices && rekon.invoices.length > 0 && rekonNo) {
        await tx.$queryRaw(
          Prisma.sql`
            SELECT id FROM "PurchaseOrder"
            WHERE "noInvoice" IN (${Prisma.join(rekon.invoices)})
            ORDER BY "id" ASC
            FOR UPDATE
          `
        );

        await tx.purchaseOrder.updateMany({
          where: { 
            noInvoice: { in: rekon.invoices },
            buktiBayar: rekonNo
          },
          data: { statusBayar: false, buktiBayar: null }
        });
      }

      // 3. Kunci dan reset DataRetur dalam urutan ID deterministik (ORDER BY id ASC FOR UPDATE)
      if (rekonNo) {
        const boundReturs = await tx.dataRetur.findMany({
          where: { referensiPembayaran: rekonNo },
          select: { id: true }
        });

        if (boundReturs.length > 0) {
          const boundIds = boundReturs.map((r) => r.id);
          await tx.$queryRaw(
            Prisma.sql`
              SELECT id FROM "data_retur"
              WHERE "id" IN (${Prisma.join(boundIds)})
              ORDER BY "id" ASC
              FOR UPDATE
            `
          );

          await tx.dataRetur.updateMany({
            where: { 
              id: { in: boundIds },
              referensiPembayaran: rekonNo
            },
            data: {
              invoiceRekon: null,
              referensiPembayaran: null,
              pembebananReturnId: null
            }
          });
        }
      }

      // 4. Catat audit log penghapusan sebelum delete
      if (auth) {
        await auditActivity(tx as any, id, "Reconcile", "DELETE", {
          id: auth.dbUser?.id || (auth.session as any)?.user?.id || "unknown",
          name: getProfileName(auth.session, auth.dbUser),
          role: auth.safeRole || auth.role || "unknown"
        }, {
          noRekonsiliasi: rekon.noRekonsiliasi,
          invoices: rekon.invoices,
          rtvs: rekon.rtvs,
          nominal: Number(rekon.nominal || 0),
          status: rekon.status
        });
      }

      await tx.reconcile.delete({
        where: { id }
      });

      return { success: true };
    }, {
      timeout: 20000
    });
  });
}
