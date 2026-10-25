"use server";

import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { RitelCreateSchema } from "@/lib/schemas/master-data";
import { cacheClearPrefix } from "@/lib/ttl-cache";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";

/**
 * Server Action to create a Ritel Modern record directly via Prisma
 * with authentication, role permission verification, schema validation, and cache invalidation.
 */
export async function createRitelServer(formData: any) {
  try {
    const auth = await getSessionWithRole();
    if (!auth) {
      return { error: "Unauthorized: Silakan login terlebih dahulu" };
    }

    const { role: safeRole } = auth;
    const allowed = await hasPermission(safeRole, "m_ritel_add");
    if (!allowed) {
      return { error: "Forbidden: Akun Anda tidak memiliki izin membuat data ritel modern (m_ritel_add)" };
    }

    const parsed = RitelCreateSchema.safeParse(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const { namaPt, inisial, tujuan, provinsi, logoPt, logoInisial } = parsed.data;
    const result = await prisma.ritelModern.create({
      data: {
        id: randomUUID(),
        namaPt,
        inisial: inisial ?? null,
        tujuan: tujuan ?? null,
        provinsi: provinsi ?? null,
        logoPt: logoPt ?? null,
        logoInisial: logoInisial ?? null,
        updatedAt: new Date(),
      },
    });

    cacheClearPrefix("ritel:");
    return { success: true, data: result };
  } catch (error: any) {
    return { error: error?.message || "Gagal menyimpan data ke database" };
  }
}

