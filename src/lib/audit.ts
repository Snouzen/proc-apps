import { PrismaClient } from "../../server/generated/prisma";
import type { Prisma } from "../../server/generated/prisma";
import prismaClient from "./prisma";

// Utility type for Prisma Client or Transaction
type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function auditUpdatePO(
  tx: TxClient,
  where: Prisma.PurchaseOrderWhereUniqueInput,
  data: Prisma.PurchaseOrderUpdateInput | Prisma.PurchaseOrderUncheckedUpdateInput,
  user: { id?: string; name?: string } | null
) {
  const oldData = await tx.purchaseOrder.findUnique({ where });
  const newData = await tx.purchaseOrder.update({ where, data });

  if (oldData) {
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrder",
        action: "UPDATE",
        oldData: oldData as any,
        newData: newData as any,
        userId: user?.id || null,
        userName: user?.name || null,
      },
    });
  }

  return newData;
}

export async function auditDeletePO(
  tx: TxClient,
  where: Prisma.PurchaseOrderWhereUniqueInput,
  user: { id?: string; name?: string } | null
) {
  const oldData = await tx.purchaseOrder.findUnique({ where });
  if (oldData) {
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrder",
        action: "DELETE",
        oldData: oldData as any,
        userId: user?.id || null,
        userName: user?.name || null,
      },
    });
  }
  return tx.purchaseOrder.delete({ where });
}

export async function auditUpdatePOItem(
  tx: TxClient,
  where: Prisma.PurchaseOrderItemWhereUniqueInput,
  data: Prisma.PurchaseOrderItemUpdateInput | Prisma.PurchaseOrderItemUncheckedUpdateInput,
  user: { id?: string; name?: string } | null
) {
  const oldData = await tx.purchaseOrderItem.findUnique({ where });
  const newData = await tx.purchaseOrderItem.update({ where, data });

  if (oldData) {
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrderItem",
        action: "UPDATE",
        oldData: oldData as any,
        newData: newData as any,
        userId: user?.id || null,
        userName: user?.name || null,
      },
    });
  }

  return newData;
}

export async function auditDeletePOItem(
  tx: TxClient,
  where: Prisma.PurchaseOrderItemWhereUniqueInput,
  user: { id?: string; name?: string } | null
) {
  const oldData = await tx.purchaseOrderItem.findUnique({ where });
  if (oldData) {
    await tx.auditLog.create({
      data: {
        entityId: oldData.id,
        entity: "PurchaseOrderItem",
        action: "DELETE",
        oldData: oldData as any,
        userId: user?.id || null,
        userName: user?.name || null,
      },
    });
  }
  return tx.purchaseOrderItem.delete({ where });
}
