import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  canonicalProductName,
  dedupeKey,
  upperClean,
  upperCleanOrNull,
} from "@/lib/text";
import { parseYmdOrIsoToUtcNoon } from "@/lib/utils/dates";
import { ensureInvoiceNumber } from "@/lib/generatePoInvoiceNumber";
import { auditUpdatePO, auditActivity } from "@/lib/audit";
import { getProfileName } from "@/lib/auth";
import { checkPOOwnership } from "@/lib/utils/regional";
import { canonicalInvoiceNumber } from "./poQueryBuilder";

export interface CreateOrUpdatePOInput {
  company: string;
  inisial?: string | null;
  siteArea?: string | null;
  tujuan: string;
  noPo: string;
  originalNoPo?: string | null;
  tglPo: any;
  expiredTgl: any;
  linkPo?: string | null;
  noInvoice?: string | null;
  items: any[];
  remarks?: string | null;
  status?: any;
  regional?: string | null;
  tglKirim?: any;
  buktiTagih?: string | null;
  buktiBayar?: string | null;
  buktiKirim?: string | null;
  buktiFp?: string | null;
  namaSupir?: string | null;
  platNomor?: string | null;
  updatedAt?: string | null;
  lastUpdatedAt?: string | null;
}

export function isPoEditIntent(body: any): boolean {
  return Boolean(
    body?.id ||
    body?.originalNoPo ||
    body?.updatedAt ||
    body?.lastUpdatedAt ||
    body?.expectedVersion
  );
}

export async function createOrUpdatePurchaseOrder(
  body: CreateOrUpdatePOInput,
  auth: { session: any; role: string; dbUser?: any }
) {
  const { session, role: safeRole, dbUser } = auth;
  const {
    company,
    inisial,
    siteArea,
    tujuan,
    noPo,
    originalNoPo,
    tglPo,
    expiredTgl,
    linkPo,
    noInvoice,
    items,
    remarks,
    status,
    regional,
    tglKirim,
    buktiTagih,
    buktiBayar,
    buktiKirim,
    buktiFp,
  } = body;

  let effectiveRegional = regional;
  if (safeRole === "rm" && (dbUser?.regional || (session as any).regional)) {
    effectiveRegional = dbUser?.regional || (session as any).regional;
  }

  const JUNK_STRINGS = [
    "unknown",
    "site area belum ada unit produksi",
    "belum ada",
    "n/a",
    "none",
    "-",
    "",
  ];
  const sanitizeToNull = (val: string | null | undefined): string | null => {
    if (!val) return null;
    const cleaned = val.trim();
    if (!cleaned) return null;
    if (JUNK_STRINGS.includes(cleaned.toLowerCase())) return null;
    return cleaned;
  };

  const companyTrim = String(company).trim();
  const inisialTrim = String(inisial || "").trim();
  const tujuanTrim = String(tujuan).trim();
  const noPoTrim = String(noPo).trim();
  const originalNoPoTrim = String(originalNoPo ?? noPoTrim).trim();
  const siteAreaTrim = sanitizeToNull(String(siteArea || "")) ?? "";

  const companyUpper = upperClean(companyTrim);
  const inisialUpper = upperCleanOrNull(inisialTrim);
  const tujuanUpper = upperClean(tujuanTrim);
  const siteAreaUpper = sanitizeToNull(siteAreaTrim)
    ? upperCleanOrNull(siteAreaTrim)
    : null;

  const tglPoParsed = parseYmdOrIsoToUtcNoon(tglPo);
  const expiredParsed = parseYmdOrIsoToUtcNoon(expiredTgl);
  if (!tglPoParsed) {
    throw new Error("tglPo tidak valid");
  }
  if (!expiredParsed) {
    throw new Error("expiredTgl tidak valid");
  }

  let ritel =
    (await prisma.ritelModern.findFirst({
      where: inisialUpper
        ? {
            namaPt: { equals: companyUpper, mode: "insensitive" },
            inisial: { equals: inisialUpper, mode: "insensitive" },
          }
        : {
            namaPt: { equals: companyUpper, mode: "insensitive" },
          },
    })) || null;
  if (!ritel) {
    const kNama = dedupeKey(companyUpper);
    const kIni = dedupeKey(inisialUpper || "");
    const namaToken =
      companyUpper.split(/\s+/).filter(Boolean)[0] || companyUpper;
    const iniToken =
      (inisialUpper || "").split(/\s+/).filter(Boolean)[0] ||
      inisialUpper ||
      "";
    const candidates = await prisma.ritelModern.findMany({
      where: {
        namaPt: { contains: namaToken, mode: "insensitive" },
        ...(inisialUpper
          ? { inisial: { contains: iniToken, mode: "insensitive" } }
          : {}),
      } as any,
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const match =
      candidates.find((r) => {
        const n = upperClean(r?.namaPt);
        const i = upperCleanOrNull(r?.inisial);
        return dedupeKey(n) === kNama && dedupeKey(i || "") === kIni;
      }) || null;
    if (match?.id) {
      const needsUpdate =
        match.namaPt !== companyUpper ||
        (match.inisial || null) !== (inisialUpper || null) ||
        (tujuanUpper && match.tujuan !== tujuanUpper);

      if (needsUpdate) {
        ritel = await prisma.$transaction(async (tx) => {
          const lockKeys = Array.from(
            new Set([match.namaPt.toLowerCase(), companyUpper.toLowerCase()])
          ).sort();
          for (const k of lockKeys) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || lower(trim(${k}))))`;
          }

          // Baca ulang record sumber setelah advisory lock diperoleh
          const fresh = await tx.ritelModern.findUnique({
            where: { id: match.id },
          });
          if (!fresh) return null;

          // Validasi identitas dan versi record sumber
          const isModified =
            fresh.namaPt !== match.namaPt ||
            (fresh.inisial || null) !== (match.inisial || null) ||
            fresh.updatedAt.getTime() !== match.updatedAt.getTime();

          if (isModified) {
            const freshMatches =
              dedupeKey(upperClean(fresh.namaPt)) === kNama &&
              dedupeKey(upperCleanOrNull(fresh.inisial) || "") === kIni;

            if (!freshMatches) {
              // Record sumber telah diubah ke identitas lain di Master Ritel, batalkan penimpaan
              return null;
            }
          }

          if (
            fresh.namaPt === companyUpper &&
            (fresh.inisial || null) === (inisialUpper || null) &&
            (!tujuanUpper || fresh.tujuan === tujuanUpper)
          ) {
            return fresh;
          }

          const duplicate = await tx.ritelModern.findFirst({
            where: {
              id: { not: fresh.id },
              namaPt: { equals: companyUpper, mode: "insensitive" },
              inisial: inisialUpper ? { equals: inisialUpper, mode: "insensitive" } : null,
            },
          });
          if (duplicate) {
            return duplicate;
          }

          // Update bersyarat menggunakan versi updatedAt terbaru dari fresh
          const updateRes = await tx.ritelModern.updateMany({
            where: {
              id: fresh.id,
              updatedAt: fresh.updatedAt,
            },
            data: {
              namaPt: companyUpper,
              inisial: inisialUpper,
              tujuan: tujuanUpper || fresh.tujuan || null,
              updatedAt: new Date(),
            },
          });
          if (updateRes.count === 0) {
            return null;
          }

          return await tx.ritelModern.findUnique({ where: { id: fresh.id } });
        });
      } else {
        ritel = match;
      }
    }
  }
  if (!ritel) {
    ritel = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || lower(trim(${companyUpper}))))`;
      const existing = await tx.ritelModern.findFirst({
        where: {
          namaPt: { equals: companyUpper, mode: "insensitive" },
          inisial: inisialUpper ? { equals: inisialUpper, mode: "insensitive" } : null,
        },
      });
      if (existing) return existing;
      return await tx.ritelModern.create({
        data: {
          id: randomUUID(),
          namaPt: companyUpper,
          inisial: inisialUpper,
          tujuan: tujuanUpper || null,
          updatedAt: new Date(),
        },
      });
    });
  }

  let unit: any = null;
  if (siteAreaUpper) {
    unit = await prisma.unitProduksi.findFirst({
      where: { siteArea: { equals: siteAreaUpper, mode: "insensitive" } },
    });
    if (!unit) {
      throw new Error("Unit Produksi dengan siteArea tersebut belum terdaftar");
    }
  } else {
    unit = await prisma.unitProduksi.findFirst({
      where: { idRegional: "UNKNOWN" },
    });
    if (!unit) {
      try {
        unit = await prisma.unitProduksi.create({
          data: {
            idRegional: "UNKNOWN",
            siteArea: "UNKNOWN",
            namaRegional: "Unknown",
            updatedAt: new Date(),
          } as any,
        });
      } catch {
        unit = await prisma.unitProduksi.findFirst({
          where: { idRegional: "UNKNOWN" },
        });
      }
    }
    if (!unit) {
      throw new Error("Unit Produksi belum tersedia");
    }
  }

  const poRitelId = ritel.id;
  const poUnitProduksiId = unit.idRegional;
  const poTglPo = tglPoParsed as Date;
  const poExpiredTgl = expiredParsed;
  const poLinkPo = linkPo || null;
  const poNoInvoice = canonicalInvoiceNumber(noInvoice);
  const poTujuanDetail = tujuanUpper || null;
  const poRegional = sanitizeToNull(effectiveRegional)
    ? upperCleanOrNull(sanitizeToNull(effectiveRegional)!) || null
    : null;
  const poStatusKirim = !!status?.kirim;
  const poStatusSdif = !!status?.sdif;
  const poStatusPo = !!status?.po;
  const poStatusFp = !!status?.fp;
  const poStatusKwi = !!status?.kwi;
  const poStatusInv = !!status?.inv;
  const poStatusTagih = !!status?.tagih;
  const poStatusBayar =
    !!status?.bayar ||
    (Boolean(buktiBayar) && String(buktiBayar).trim() !== "");
  const poRemarks = remarks || null;
  const poTglKirim = tglKirim ? parseYmdOrIsoToUtcNoon(tglKirim) : undefined;
  const poUpdatedAt = new Date();

  return await prisma.$transaction(
    async (tx: any) => {
      // Tentukan apakah request bermaksud mengedit PO (unified validated intent)
      const isEditIntent = isPoEditIntent(body);

      // 1. Kunci row PurchaseOrder jika sudah ada menggunakan SELECT ... FOR UPDATE
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, "updatedAt" FROM "PurchaseOrder" WHERE "noPo" = ${originalNoPoTrim} FOR UPDATE
      `;

      // Jika intent adalah EDIT tetapi target tidak ditemukan di DB, tolak dengan 404
      if (isEditIntent && lockedRows.length === 0) {
        const err: any = new Error(`Data PO target "${originalNoPoTrim}" tidak ditemukan atau telah dihapus oleh pengguna lain.`);
        err.statusCode = 404;
        throw err;
      }

      // Jika intent adalah CREATE baru tetapi nomor PO sudah ada, tolak dengan 409
      if (!isEditIntent && lockedRows.length > 0) {
        const err: any = new Error(`Purchase Order dengan nomor "${originalNoPoTrim}" sudah terdaftar.`);
        err.statusCode = 409;
        throw err;
      }

      const isEdit = lockedRows.length > 0;

      let existing: any = null;
      if (isEdit) {
        existing = await tx.purchaseOrder.findUnique({
          where: { id: lockedRows[0].id },
          include: { UnitProduksi: true },
        });

        // Wajibkan versi valid pada edit (tanpa toleransi)
        const clientUpdatedAtRaw = (body as any)?.updatedAt || (body as any)?.lastUpdatedAt;
        if (!clientUpdatedAtRaw) {
          const err: any = new Error("Versi data (updatedAt) wajib disertakan untuk pembaruan PO.");
          err.statusCode = 409;
          throw err;
        }
        const clientTime = new Date(clientUpdatedAtRaw).getTime();
        if (isNaN(clientTime)) {
          const err: any = new Error("Format versi data (updatedAt) tidak valid.");
          err.statusCode = 409;
          throw err;
        }
        const serverTime = existing.updatedAt.getTime();
        if (clientTime !== serverTime) {
          const err: any = new Error("Data PO telah diubah oleh pengguna lain. Silakan muat ulang halaman.");
          err.statusCode = 409;
          throw err;
        }

        const userRegional = dbUser?.regional || (session as any)?.regional || null;
        const userSiteArea = dbUser?.siteArea || (session as any)?.siteArea || null;

        const ownershipCheck = checkPOOwnership(existing, safeRole, userRegional, userSiteArea);
        if (!ownershipCheck.allowed) {
          const err: any = new Error(ownershipCheck.reason || "Forbidden: Anda tidak memiliki wewenang untuk mengubah data PO ini");
          err.statusCode = 403;
          throw err;
        }
      }

      if (safeRole !== "pusat") {
        const userRegional = dbUser?.regional || (session as any)?.regional || null;
        const userSiteArea = dbUser?.siteArea || (session as any)?.siteArea || null;
        const targetCheck = checkPOOwnership({
          regional: poRegional,
          unitProduksiId: poUnitProduksiId,
          UnitProduksi: unit
        }, safeRole, userRegional, userSiteArea);
        if (!targetCheck.allowed) {
          const err: any = new Error(targetCheck.reason || "Forbidden: Target unit atau wilayah regional PO di luar wewenang Anda");
          err.statusCode = 403;
          throw err;
        }
      }

      if (existing && noPoTrim !== existing.noPo) {
        const conflict = await tx.purchaseOrder.findUnique({
          where: { noPo: noPoTrim },
          select: { id: true },
        });
        if (conflict && conflict.id !== existing.id) {
          throw new Error("Nomor PO sudah dipakai");
        }
      }

      let finalNoFaktur = existing?.noFaktur || null;

      if (poTglKirim && !finalNoFaktur) {
        finalNoFaktur = await ensureInvoiceNumber(
          tx,
          {
            noFaktur: finalNoFaktur,
            unitProduksiId: poUnitProduksiId,
          },
          poTglKirim,
        );
      }

      let po: any;
      if (existing) {
        // Update bersyarat versi updatedAt yang terkunci
        const updateResult = await tx.purchaseOrder.updateMany({
          where: {
            id: existing.id,
            updatedAt: existing.updatedAt,
          },
          data: {
            noPo: noPoTrim,
            ritelId: poRitelId,
            unitProduksiId: poUnitProduksiId,
            tglPo: poTglPo,
            expiredTgl: poExpiredTgl,
            linkPo: poLinkPo,
            noInvoice: poNoInvoice,
            noFaktur: finalNoFaktur,
            tujuanDetail: poTujuanDetail,
            regional: poRegional,
            statusKirim: poStatusKirim,
            statusSdif: poStatusSdif,
            statusPo: poStatusPo,
            statusFp: poStatusFp,
            statusKwi: poStatusKwi,
            statusInv: poStatusInv,
            statusTagih: poStatusTagih,
            statusBayar: poStatusBayar,
            remarks: poRemarks,
            buktiTagih,
            buktiBayar,
            buktiKirim,
            buktiFp,
            ...(poTglKirim !== undefined ? { tglkirim: poTglKirim } : {}),
            updatedAt: poUpdatedAt,
          },
        });

        if (updateResult.count === 0) {
          const err: any = new Error("Data PO telah diubah oleh pengguna lain. Silakan muat ulang halaman.");
          err.statusCode = 409;
          throw err;
        }

        po = await tx.purchaseOrder.findUnique({
          where: { id: existing.id },
        });

        // Audit log
        const { sanitizeAuditData, PO_AUDIT_WHITELIST } = await import("@/lib/audit");
        await tx.auditLog.create({
          data: {
            entityId: existing.id,
            entity: "PurchaseOrder",
            action: "UPDATE",
            oldData: sanitizeAuditData(existing, PO_AUDIT_WHITELIST) as any,
            newData: sanitizeAuditData(po, PO_AUDIT_WHITELIST) as any,
            userId: dbUser?.id || (session as any)?.user?.id || null,
            userName: getProfileName(session, dbUser) || null,
            userRole: safeRole || null,
          },
        });
      } else {
        po = await tx.purchaseOrder.create({
          data: {
            id: randomUUID(),
            noPo: noPoTrim,
            ritelId: poRitelId,
            unitProduksiId: poUnitProduksiId,
            tglPo: poTglPo,
            expiredTgl: poExpiredTgl,
            linkPo: poLinkPo,
            noInvoice: poNoInvoice,
            noFaktur: finalNoFaktur,
            tujuanDetail: poTujuanDetail,
            regional: poRegional,
            statusKirim: poStatusKirim,
            statusSdif: poStatusSdif,
            statusPo: poStatusPo,
            statusFp: poStatusFp,
            statusKwi: poStatusKwi,
            statusInv: poStatusInv,
            statusTagih: poStatusTagih,
            statusBayar: poStatusBayar,
            remarks: poRemarks,
            buktiTagih,
            buktiBayar,
            buktiKirim,
            buktiFp,
            ...(poTglKirim !== undefined ? { tglkirim: poTglKirim } : {}),
            updatedAt: poUpdatedAt,
            createdAt: new Date(),
          },
        });
      }

      if (!existing) {
        await auditActivity(tx as any, po.id, "PurchaseOrder", "CREATE", {
          id: dbUser?.id || (session as any)?.user?.id || "unknown",
          name: getProfileName(session, dbUser),
          role: safeRole,
        });
      }

      // Item Diffing: Pertahankan ID item existing jika ada
      const existingItems = existing
        ? await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: po.id },
          })
        : [];
      const existingItemMap = new Map(existingItems.map((it: any) => [it.id, it]));

      const names = Array.from(
        new Set(items.map((it: any) => canonicalProductName(it.namaProduk))),
      );
      const existingProducts = await tx.product.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true, satuanKg: true },
      });
      type ProdLite = { id: string; name: string; satuanKg?: number };
      const existingMap: Map<string, ProdLite> = new Map(
        existingProducts.map((p: any) => [p.name, p as ProdLite]),
      );
      const missing = names.filter((n) => !existingMap.has(n));
      if (missing.length > 0) {
        await tx.product.createMany({
          data: missing.map((n) => ({
            id: randomUUID(),
            name: n,
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        });
        const created = await tx.product.findMany({
          where: { name: { in: missing } },
          select: { id: true, name: true, satuanKg: true },
        });
        for (const p of created) existingMap.set(p.name, p as ProdLite);
      }

      const parseAmt = (v: any) => {
        if (typeof v === "number") return v;
        return (
          Number(
            String(v || "")
              .replace(/\./g, "")
              .replace(",", ".")
              .replace(/[^0-9.]/g, ""),
          ) || 0
        );
      };

      const matchedExistingIds = new Set<string>();
      const itemsToUpdate: Array<{ id: string; data: any }> = [];
      const itemsToCreate: any[] = [];

      for (const item of items) {
        const nm = canonicalProductName(item.namaProduk);
        const product = existingMap.get(nm)!;
        const satuan =
          Number((product?.satuanKg as number | undefined) ?? 1) || 1;
        const pcsNum = Number(item.pcs) || 0;
        const pcsKirimNum = Number(item.pcsKirim || 0) || 0;
        const hargaPcsNum = Number(item.hargaPcs) || 0;
        const discountNum = parseAmt(item.discount);
        const hargaKg = satuan > 0 ? hargaPcsNum / satuan : 0;
        const divider = pcsNum || 1;
        const nominal = Math.max(0, hargaPcsNum * pcsNum - discountNum);
        const proportionalDiscount = (discountNum / divider) * pcsKirimNum;
        const rpTagih = Math.max(
          0,
          hargaPcsNum * pcsKirimNum - proportionalDiscount,
        );

        const targetId = item.id && existingItemMap.has(item.id) ? item.id : null;
        if (targetId) {
          matchedExistingIds.add(targetId);
          itemsToUpdate.push({
            id: targetId,
            data: {
              productId: product.id,
              pcs: Math.round(pcsNum),
              pcsKirim: Math.round(pcsKirimNum),
              hargaKg,
              hargaPcs: hargaPcsNum,
              nominal,
              rpTagih,
              discount: discountNum,
            },
          });
        } else {
          itemsToCreate.push({
            id: randomUUID(),
            purchaseOrderId: po.id,
            productId: product.id,
            pcs: Math.round(pcsNum),
            pcsKirim: Math.round(pcsKirimNum),
            hargaKg,
            hargaPcs: hargaPcsNum,
            nominal,
            rpTagih,
            discount: discountNum,
          });
        }
      }

      // Hapus item lama yang sudah dikeluarkan dari PO
      if (existingItems.length > 0) {
        const idsToDelete = existingItems
          .filter((it: any) => !matchedExistingIds.has(it.id))
          .map((it: any) => it.id);
        if (idsToDelete.length > 0) {
          await tx.purchaseOrderItem.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }
      }

      // Update item existing yang dipertahankan ID-nya
      for (const updateOp of itemsToUpdate) {
        await tx.purchaseOrderItem.update({
          where: { id: updateOp.id },
          data: updateOp.data,
        });
      }

      // Buat item baru yang ditambahkan
      if (itemsToCreate.length > 0) {
        try {
          await tx.purchaseOrderItem.createMany({
            data: itemsToCreate,
            skipDuplicates: true,
          });
        } catch {
          const rowsNoDisc = itemsToCreate.map(({ discount, ...rest }) => rest);
          await tx.purchaseOrderItem.createMany({
            data: rowsNoDisc as any,
            skipDuplicates: true,
          });
        }
      }

      return { id: po.id, noPo: po.noPo };
    },
    { timeout: 20000 },
  );
}
