import { PrismaClient } from "../../server/generated/prisma";
import type { Prisma } from "../../server/generated/prisma";
import prismaClient from "./prisma";

// Utility type for Prisma Client or Transaction
type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// Centralized Field Whitelists for Audit Logging
export const PO_AUDIT_WHITELIST = new Set([
  "id",
  "noPo",
  "noInvoice",
  "tglPo",
  "expiredTgl",
  "tglkirim",
  "statusKirim",
  "statusSdif",
  "statusPo",
  "statusFp",
  "statusKwi",
  "statusInv",
  "statusTagih",
  "statusBayar",
  "statusCreditLimit",
  "noNd",
  "tujuanDetail",
  "namaSupir",
  "platNomor",
  "ritelId",
  "unitProduksiId",
  "regional",
  "catatan",
  "keterangan",
  "action",
  "addedPoCount",
  "replacedPoCount",
  "itemCount",
]);

export const PO_ITEM_AUDIT_WHITELIST = new Set([
  "id",
  "purchaseOrderId",
  "productId",
  "pcs",
  "pcsKirim",
  "hargaKg",
  "hargaPcs",
  "nominal",
  "rpTagih",
  "discount",
]);

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "salt",
  "hash",
  "jwt",
]);

/**
 * Filter and sanitize audit metadata against an optional whitelist and blacklist of sensitive keys.
 */
export function sanitizeAuditData(data: any, whitelist?: Set<string>): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.slice(0, 100).map((item) => sanitizeAuditData(item, whitelist));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) continue;

    if (whitelist && !whitelist.has(key)) {
      continue;
    }

    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeAuditData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Generic function for logging activity with sanitized metadata
export async function auditActivity(
  tx: TxClient,
  entityId: string,
  entity: string,
  action: string,
  user: { id?: string; name?: string; role?: string } | null,
  newData?: any
) {
  const sanitizedNewData = newData ? sanitizeAuditData(newData) : null;
  return tx.auditLog.create({
    data: {
      entityId,
      entity,
      action,
      newData: sanitizedNewData,
      userId: user?.id || null,
      userName: user?.name || null,
      userRole: user?.role || null,
    },
  });
}

export async function auditUpdatePO(
  tx: TxClient,
  where: Prisma.PurchaseOrderWhereUniqueInput,
  data: Prisma.PurchaseOrderUpdateInput | Prisma.PurchaseOrderUncheckedUpdateInput,
  user: { id?: string; name?: string; role?: string } | null
) {
  const oldData = await tx.purchaseOrder.findUnique({ where });
  const newData = await tx.purchaseOrder.update({ where, data });

  if (oldData) {
    const sanitizedOld = sanitizeAuditData(oldData, PO_AUDIT_WHITELIST);
    const sanitizedNew = sanitizeAuditData(newData, PO_AUDIT_WHITELIST);
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrder",
        action: "UPDATE",
        oldData: sanitizedOld as any,
        newData: sanitizedNew as any,
        userId: user?.id || null,
        userName: user?.name || null,
        userRole: user?.role || null,
      },
    });
  }

  return newData;
}

export async function auditDeletePO(
  tx: TxClient,
  where: Prisma.PurchaseOrderWhereUniqueInput,
  user: { id?: string; name?: string; role?: string } | null
) {
  const oldData = await tx.purchaseOrder.findUnique({ where });
  if (oldData) {
    const sanitizedOld = sanitizeAuditData(oldData, PO_AUDIT_WHITELIST);
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrder",
        action: "DELETE",
        oldData: sanitizedOld as any,
        userId: user?.id || null,
        userName: user?.name || null,
        userRole: user?.role || null,
      },
    });
  }
  return tx.purchaseOrder.delete({ where });
}

export async function auditUpdatePOItem(
  tx: TxClient,
  where: Prisma.PurchaseOrderItemWhereUniqueInput,
  data: Prisma.PurchaseOrderItemUpdateInput | Prisma.PurchaseOrderItemUncheckedUpdateInput,
  user: { id?: string; name?: string; role?: string } | null
) {
  const oldData = await tx.purchaseOrderItem.findUnique({ where });
  const newData = await tx.purchaseOrderItem.update({ where, data });

  if (oldData) {
    const sanitizedOld = sanitizeAuditData(oldData, PO_ITEM_AUDIT_WHITELIST);
    const sanitizedNew = sanitizeAuditData(newData, PO_ITEM_AUDIT_WHITELIST);
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrderItem",
        action: "UPDATE",
        oldData: sanitizedOld as any,
        newData: sanitizedNew as any,
        userId: user?.id || null,
        userName: user?.name || null,
        userRole: user?.role || null,
      },
    });
  }

  return newData;
}

export async function auditDeletePOItem(
  tx: TxClient,
  where: Prisma.PurchaseOrderItemWhereUniqueInput,
  user: { id?: string; name?: string; role?: string } | null
) {
  const oldData = await tx.purchaseOrderItem.findUnique({ where });
  if (oldData) {
    const sanitizedOld = sanitizeAuditData(oldData, PO_ITEM_AUDIT_WHITELIST);
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrderItem",
        action: "DELETE",
        oldData: sanitizedOld as any,
        userId: user?.id || null,
        userName: user?.name || null,
        userRole: user?.role || null,
      },
    });
  }
  return tx.purchaseOrderItem.delete({ where });
}
