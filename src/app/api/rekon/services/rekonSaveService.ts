import { normalizeRincianBayarLink } from "@/lib/rekonPaymentLink";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getProfileName } from "@/lib/auth";
import crypto from "crypto";
import { auditActivity } from "@/lib/audit";
import { withTransactionRetry } from "@/lib/generatePoInvoiceNumber";
import { supabaseAdmin } from "@/lib/supabase";
import { extractStoragePathFromUrl, validateProofFile, safelyFinalizeProofFile, rollbackFinalizedFiles } from "./rekonFileUtils";
import { checkPOOwnership, checkReturOwnership } from "@/lib/utils/regional";
import { checkReconcileAccess, resolveRitelGroup } from "./rekonAccessHelper";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

interface SaveRekonContext {
  session: any;
  role?: any;
  safeRole?: any;
  dbUser: any;
}

export async function saveRekon(body: any, ctx: SaveRekonContext) {
  const { session, dbUser } = ctx;
  const safeRole = ctx.safeRole || ctx.role;
  const { 
    ritelId, 
    companyName,
    inisial,
    bankStatement,
    bankStatements,
    biayaAdmin, 
    totalInvoices,
    totalRtvs,
    totalPromo,
    nominal, 
    invoices, 
    rtvs, 
    noPromo,
    notes,
    buktiBayarUrl,
    rincianBayarUrl,
    tglBayar,
    status = "final",
    id, // Cek apakah ini edit/update dari draft
    remarks
  } = body;

  // Keep legacy managed Storage attachments on their existing lifecycle. External
  // spreadsheet links use URL validation and never enter the Storage move flow.
  const rincianStoragePath = typeof rincianBayarUrl === "string" ? extractStoragePathFromUrl(rincianBayarUrl) : null;
  const rincianLink = rincianStoragePath ? null : normalizeRincianBayarLink(rincianBayarUrl);

  // Compute backward-compat fields from notes array
  const notesArray: Array<{type?: 'invoice' | 'rtv', desc: string, nominal: number}> = Array.isArray(notes) ? notes : [];
  const computedNotesDesc = notesArray.map((n: any) => n.desc).filter(Boolean).join(' | ') || null;
  const totalNotesInvoice = notesArray.filter(n => n.type === 'invoice' || !n.type).reduce((sum, n) => sum + (Number(n.nominal) || 0), 0);
  const totalNotesRtv = notesArray.filter(n => n.type === 'rtv').reduce((sum, n) => sum + (Number(n.nominal) || 0), 0);
  const computedNotesNominal = totalNotesInvoice + totalNotesRtv;
  const invoiceList: string[] = Array.isArray(invoices) ? invoices.filter(Boolean) : [];
  const rtvList = Array.isArray(rtvs) ? rtvs : [];
  const promoNumbers = (noPromo || "").split(",").map((p: string) => p.trim()).filter(Boolean);

  // 0. Validate Duplicates in Payload references to prevent double-counting
  const seenInvoices = new Set<string>();
  for (const inv of invoiceList) {
    if (seenInvoices.has(inv)) {
      throw new ValidationError(`Nomor invoice duplikat ditemukan dalam payload: ${inv}`);
    }
    seenInvoices.add(inv);
  }

  const seenRtvIds = new Set<string>();
  for (const r of rtvList) {
    const rId = typeof r === 'object' ? r.id : null;
    if (rId) {
      if (seenRtvIds.has(rId)) {
        throw new ValidationError(`Data retur duplikat ditemukan dalam payload: ID ${rId}`);
      }
      seenRtvIds.add(rId);
    }
  }

  const seenPromos = new Set<string>();
  for (const promo of promoNumbers) {
    if (seenPromos.has(promo)) {
      throw new ValidationError(`Nomor promo duplikat ditemukan dalam payload: ${promo}`);
    }
    seenPromos.add(promo);
  }

  // Maintain a stable destination identity across retries and storage recoveries
  const operationFinalId = id || crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
  const movedTracker: Array<{ fromPath: string; toPath: string }> = [];

  const savedRekon = await withTransactionRetry(async () => {
    try {
      return await prisma.$transaction(async (tx) => {
    let GeneratedNoRekon = "";
    const finalId = operationFinalId;

    // Check existing record if updating: Kunci record Reconcile terlebih dahulu sebelum pembacaan
    let existingRekon: any = null;
    if (id) {
      await tx.$executeRaw`SELECT id FROM "reconciliations" WHERE id = ${id} FOR UPDATE`;

      existingRekon = await tx.reconcile.findUnique({
        where: { id },
        select: { invoices: true, rtvs: true, rtvDetails: true, noRekonsiliasi: true, ritelId: true, nominal: true, status: true }
      });
      if (!existingRekon) {
        throw new ValidationError("Data rekonsiliasi tidak ditemukan.");
      }
      if (ritelId && existingRekon.ritelId && ritelId !== existingRekon.ritelId) {
        const existingGroup = await resolveRitelGroup(tx, existingRekon.ritelId);
        if (!existingGroup.siblingRitelIds.includes(ritelId)) {
          throw new ValidationError("Company tidak dapat diubah pada rekonsiliasi yang sudah tersimpan.");
        }
      }

      const accessCheck = await checkReconcileAccess(existingRekon, ctx, tx);
      if (!accessCheck.allowed) {
        throw new ValidationError(accessCheck.reason || "Forbidden: Anda tidak memiliki wewenang atas data rekonsiliasi ini.");
      }
    }

    let effectiveRitelId = existingRekon?.ritelId || ritelId || null;
    let ritelGroup = await resolveRitelGroup(tx, effectiveRitelId, companyName, inisial);
    if (!effectiveRitelId && ritelGroup.primaryRitelId) {
      effectiveRitelId = ritelGroup.primaryRitelId;
    }

    // 1. Generate No. Rekonsiliasi jika record baru
    if (!id) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const datePattern = `${month}/${year}`;
      const suffix = `/${datePattern}`;
      const lockKey = `rekon_${datePattern}`;

      // Acquire PostgreSQL advisory transaction lock to serialize numbering
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // Cari nomor tertinggi bulan/tahun ini
      const monthRekons = await tx.reconcile.findMany({
        where: {
          noRekonsiliasi: { endsWith: suffix }
        },
        select: { noRekonsiliasi: true }
      });

      let maxRekonSeq = 0;
      for (const r of monthRekons) {
        if (r.noRekonsiliasi) {
          const match = r.noRekonsiliasi.match(/R-(\d+)\//);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxRekonSeq) {
              maxRekonSeq = num;
            }
          }
        }
      }

      GeneratedNoRekon = `R-${String(maxRekonSeq + 1).padStart(3, '0')}/${datePattern}`;
    }

    // 2. Server-side Recalculation of Totals with Company Matching across initials (ignoring tujuan)
    // Kunci seluruh baris PurchaseOrder lama dan baru dalam urutan eksplisit ORDER BY id ASC FOR UPDATE
    const allTargetInvoices = Array.from(
      new Set([...invoiceList, ...(existingRekon?.invoices || [])])
    ).filter(Boolean);

    if (allTargetInvoices.length > 0) {
      await tx.$queryRaw(
        Prisma.sql`
          SELECT id FROM "PurchaseOrder"
          WHERE "noInvoice" IN (${Prisma.join(allTargetInvoices)})
          ORDER BY "id" ASC
          FOR UPDATE
        `
      );
    }

    let calculatedTotalInvoices = 0;
    if (invoiceList.length > 0) {
      const poList = await tx.purchaseOrder.findMany({
        where: { 
          noInvoice: { in: invoiceList },
          ...(effectiveRitelId ? { ritelId: { in: ritelGroup.companyRitelIds } } : {}),
        },
        include: { Items: true, UnitProduksi: true }
      });

      if (safeRole !== "pusat") {
        const userRegional = dbUser?.regional || session?.regional || null;
        const userSiteArea = dbUser?.siteArea || session?.siteArea || null;
        for (const po of poList) {
          const ownership = checkPOOwnership(po, safeRole, userRegional, userSiteArea);
          if (!ownership.allowed) {
            throw new ValidationError(`Forbidden: PO #${po.noPo} berada di luar wewenang regional Anda (${ownership.reason || "Akses ditolak"}).`);
          }
        }
      }

      // Strict validation: Reject foreign or non-existent invoices
      const foundInvoices = new Set(poList.map((p) => p.noInvoice).filter(Boolean));
      const missingInvoices = invoiceList.filter((inv) => !foundInvoices.has(inv));
      if (missingInvoices.length > 0) {
        throw new ValidationError(`Satu atau lebih nomor invoice tidak ditemukan di sistem: ${missingInvoices.slice(0, 3).join(", ")}`);
      }

      // Cegah invoice yang sudah terikat pada rekonsiliasi lain yang aktif/lunas
      const alreadyPaidPos = poList.filter(
        (p) => p.statusBayar && p.buktiBayar && (!id || p.buktiBayar !== existingRekon?.noRekonsiliasi)
      );
      if (alreadyPaidPos.length > 0) {
        throw new ValidationError(
          `Satu atau lebih nomor invoice sudah terikat pada rekonsiliasi lain yang aktif/lunas: ${alreadyPaidPos.map((p) => `${p.noInvoice} (${p.buktiBayar})`).slice(0, 3).join(", ")}`
        );
      }

      const inferredRitelId = poList.find((p) => p.ritelId)?.ritelId || null;
      if (!effectiveRitelId && inferredRitelId) {
        effectiveRitelId = inferredRitelId;
        ritelGroup = await resolveRitelGroup(tx, effectiveRitelId, companyName, inisial);
      } else if (ritelGroup.siblingRitelIds.length === 0 && effectiveRitelId) {
        ritelGroup = await resolveRitelGroup(tx, effectiveRitelId, companyName, inisial);
      }

      const siblingRitelIdsForPo =
        ritelGroup.siblingRitelIds.length > 0
          ? ritelGroup.siblingRitelIds
          : effectiveRitelId
          ? [effectiveRitelId]
          : [];
      const companyRitelIdsForPo =
        ritelGroup.companyRitelIds.length > 0
          ? ritelGroup.companyRitelIds
          : siblingRitelIdsForPo;
      const allowedRitelSetForPo = new Set([
        ...siblingRitelIdsForPo,
        ...companyRitelIdsForPo,
      ]);

      // Check cross-ritel POs (allow rows within the same company/namaPt)
      const outsidePos = poList.filter((p) => !p.ritelId || !allowedRitelSetForPo.has(p.ritelId));
      if (outsidePos.length > 0) {
        const firstPoRitelId = poList[0]?.ritelId;
        const firstPoGroup = firstPoRitelId ? await resolveRitelGroup(tx, firstPoRitelId) : null;
        const firstPoSet = new Set(
          firstPoGroup?.companyRitelIds ||
            firstPoGroup?.siblingRitelIds ||
            (firstPoRitelId ? [firstPoRitelId] : [])
        );
        const hasCrossCompany = poList.some((p) => !p.ritelId || !firstPoSet.has(p.ritelId));
        if (hasCrossCompany) {
          throw new ValidationError("Seluruh invoice dalam satu rekonsiliasi harus berasal dari company yang sama.");
        }
        throw new ValidationError("Invoice tidak sesuai dengan company yang dipilih.");
      }

      // Cek apakah invoice sudah terdaftar di rekonsiliasi final lain di tabel Reconcile (scoped by companyRitelIdsForPo)
      const conflictingRekon = await tx.reconcile.findFirst({
        where: {
          id: id ? { not: id } : undefined,
          ...(companyRitelIdsForPo.length > 0 ? { ritelId: { in: companyRitelIdsForPo } } : {}),
          status: "final",
          invoices: { hasSome: invoiceList },
        },
        select: { noRekonsiliasi: true, invoices: true },
      });
      if (conflictingRekon) {
        const conflictInvoices = invoiceList.filter((inv) => conflictingRekon.invoices.includes(inv));
        throw new ValidationError(
          `Invoice berikut sudah terikat pada rekonsiliasi final lain (${conflictingRekon.noRekonsiliasi}): ${conflictInvoices.slice(0, 3).join(", ")}`
        );
      }

      calculatedTotalInvoices = invoiceList.reduce((sum, invNo) => {
        const p = poList.find((x) => x.noInvoice === invNo);
        if (!p) return sum;
        const poTotal =
          p.Items?.reduce((itemSum: number, item: any) => {
            const lineVal =
              Number(item.rpTagih) ||
              Number(item.hargaPcs || 0) * Number(item.pcsKirim || 0) ||
              Number(item.nominal) ||
              Math.max(0, Number(item.hargaPcs || 0) * Number(item.pcs || 0) - Number(item.discount || 0)) ||
              0;
            return itemSum + (Number.isFinite(lineVal) ? lineVal : 0);
          }, 0) || 0;
        return sum + poTotal;
      }, 0);
    }

    if (!effectiveRitelId) {
      throw new ValidationError("ritelId wajib disertakan atau dapat ditentukan dari daftar invoice.");
    }

    const ritelRecord = await tx.ritelModern.findUnique({
      where: { id: effectiveRitelId },
      select: { id: true }
    });
    if (!ritelRecord) {
      throw new ValidationError(`Ritel dengan ID ${effectiveRitelId} tidak ditemukan.`);
    }

    if (ritelGroup.siblingRitelIds.length === 0) {
      ritelGroup = await resolveRitelGroup(tx, effectiveRitelId, companyName, inisial);
    }
    const siblingRitelIds =
      ritelGroup.siblingRitelIds.length > 0 ? ritelGroup.siblingRitelIds : [effectiveRitelId];
    const companyRitelIds =
      ritelGroup.companyRitelIds.length > 0 ? ritelGroup.companyRitelIds : siblingRitelIds;
    const siblingRitelSet = new Set(siblingRitelIds);

    let calculatedTotalRtvs = 0;
    const explicitRtvIds = rtvList.map((r: any) => typeof r === 'object' ? r.id : null).filter(Boolean);
    const fallbackRtvCns = rtvList
      .filter((r: any) => typeof r === 'string' || (typeof r === 'object' && !r.id))
      .map((r: any) => typeof r === 'string' ? r : r.noRtv)
      .filter(Boolean);
    const oldRtvIds = Array.isArray(existingRekon?.rtvDetails)
      ? existingRekon.rtvDetails.map((d: any) => d.id).filter(Boolean)
      : [];
    const normalizedRtvs: Array<{ id: string; noRtv: string; refInvoice: string; nominal: number }> = [];

    if (explicitRtvIds.length > 0 || fallbackRtvCns.length > 0 || oldRtvIds.length > 0 || (existingRekon && existingRekon.noRekonsiliasi)) {
      const orConds: any[] = [];
      // Jika item memiliki ID, cari berdasarkan ID saja (jangan query nomor RTV-nya)
      if (explicitRtvIds.length > 0) {
        orConds.push({ id: { in: explicitRtvIds } });
      }
      // Gunakan nomor RTV HANYA untuk item tanpa ID
      if (fallbackRtvCns.length > 0) {
        orConds.push({ rtvCn: { in: fallbackRtvCns } });
      }
      // Sertakan record retur lama untuk keperluan unbinding/cleanup saat edit
      if (oldRtvIds.length > 0) {
        orConds.push({ id: { in: oldRtvIds } });
      } else if (existingRekon?.noRekonsiliasi) {
        orConds.push({ referensiPembayaran: existingRekon.noRekonsiliasi });
      }

      // Kunci seluruh record kandidat data_retur dalam urutan eksplisit ORDER BY id ASC FOR UPDATE (scoped to companyRitelIds)
      const candidateRtvs = await tx.dataRetur.findMany({
        where: { 
          OR: orConds,
          ritelId: { in: companyRitelIds }
        },
        select: { id: true }
      });

      let candidateIds: string[] = [];
      if (candidateRtvs.length > 0) {
        candidateIds = candidateRtvs.map((r) => r.id);
        await tx.$queryRaw(
          Prisma.sql`
            SELECT id FROM "data_retur"
            WHERE "id" IN (${Prisma.join(candidateIds)})
            ORDER BY "id" ASC
            FOR UPDATE
          `
        );
      }

      // Baca data terbaru yang sudah terkunci HANYA dari candidateIds yang berhasil dikunci
      const returRecords = candidateIds.length > 0
        ? await tx.dataRetur.findMany({
            where: { 
              id: { in: candidateIds },
              ritelId: { in: companyRitelIds }
            },
            select: {
              id: true,
              rtvCn: true,
              ritelId: true,
              nominal: true,
              referensiPembayaran: true,
              lokasiBarangId: true,
              pembebananReturnId: true,
              LokasiBarang: true,
              PembebananReturn: true
            }
          })
        : [];

      const rekonTargetStatus = status || "final";

      if (safeRole !== "pusat") {
        const userRegional = dbUser?.regional || session?.regional || null;
        const userSiteArea = dbUser?.siteArea || session?.siteArea || null;
        for (const ret of returRecords) {
          const hasNoUnitYet = !ret.LokasiBarang && !ret.PembebananReturn && !ret.lokasiBarangId && !ret.pembebananReturnId;
          if (rekonTargetStatus === "draft" && hasNoUnitYet) {
            continue;
          }
          const check = checkReturOwnership(ret, safeRole, userRegional, userSiteArea);
          if (!check.allowed) {
            throw new ValidationError(`Forbidden: Retur RTV #${ret.rtvCn || ret.id} berada di luar wewenang regional Anda (${check.reason || "Akses ditolak"}).`);
          }
        }
      }

      // Normalize references to database record IDs and validate against double-counting
      const resolvedDbIds = new Set<string>();
      for (const r of rtvList) {
        const rId = typeof r === 'object' ? r.id : null;
        const noRtv = typeof r === 'string' ? r : r.noRtv;
        const refInvoice = (typeof r === 'object' ? r.refInvoice : "") || "";
        const hintNominal = typeof r === 'object' && r.nominal !== undefined ? Number(r.nominal) : null;

        let matchedRec: any = null;
        if (rId) {
          matchedRec = returRecords.find((rec: any) => rec.id === rId);
          if (!matchedRec) {
            throw new ValidationError(`Data retur RTV ID ${rId} tidak ditemukan atau bukan milik ritel ini.`);
          }
        } else if (noRtv) {
          const allMatchingForCn = returRecords.filter((rec: any) => rec.rtvCn === noRtv);
          if (allMatchingForCn.length === 0) {
            throw new ValidationError(`Data retur RTV ${noRtv} tidak ditemukan atau bukan milik ritel ini.`);
          }
          const unusedForCn = allMatchingForCn.filter((rec: any) => !resolvedDbIds.has(rec.id));
          const pool = unusedForCn.length > 0 ? unusedForCn : allMatchingForCn;
          if (pool.length !== 1) throw new ValidationError(`Nomor RTV ${noRtv} memiliki beberapa record dalam company ini. Pilih ID retur secara spesifik.`);
          matchedRec = pool[0];
        } else {
          throw new ValidationError("Item RTV tidak memiliki ID ataupun nomor RTV yang valid.");
        }

        if (resolvedDbIds.has(matchedRec.id)) {
          throw new ValidationError(`Data retur duplikat terdeteksi untuk record ID ${matchedRec.id} (RTV: ${matchedRec.rtvCn || noRtv}).`);
        }

        resolvedDbIds.add(matchedRec.id);
        const itemNominal = Number(matchedRec.nominal) || 0;
        calculatedTotalRtvs += itemNominal;
        normalizedRtvs.push({
          id: matchedRec.id,
          noRtv: matchedRec.rtvCn || noRtv,
          refInvoice,
          nominal: itemNominal
        });
      }

      // Validasi Lokasi Barang RTV: Bebas jika Draft, Wajib jika Submit Final
      if (rekonTargetStatus === "final" && normalizedRtvs.length > 0) {
        const missingLokasiRtvs = normalizedRtvs.filter((item) => {
          const rec = returRecords.find((r: any) => r.id === item.id);
          const lok = rec?.LokasiBarang?.siteArea?.trim();
          return !lok || lok === "-";
        });
        if (missingLokasiRtvs.length > 0) {
          const missingLabels = Array.from(new Set(missingLokasiRtvs.map((r) => r.noRtv || r.id))).join(", ");
          throw new ValidationError(
            `RTV berikut belum memiliki Lokasi Barang: ${missingLabels}. Silakan simpan sebagai Draft terlebih dahulu.`
          );
        }
      }

      // Periksa binding HANYA pada record yang BENAR-BENAR TERPILIH (bukan seluruh kandidat hasil query)
      const alreadyBoundRtvs = normalizedRtvs.filter((item) => {
        const rec = returRecords.find((r: any) => r.id === item.id);
        return rec?.referensiPembayaran && (!id || rec.referensiPembayaran !== existingRekon?.noRekonsiliasi);
      });
      if (alreadyBoundRtvs.length > 0) {
        throw new ValidationError(
          `Satu atau lebih data retur RTV sudah terikat pada rekonsiliasi lain: ${alreadyBoundRtvs
            .map((r: any) => `${r.noRtv} (ID: ${r.id})`)
            .slice(0, 3)
            .join(", ")}`
        );
      }

      // Cek apakah RTV sudah terdaftar di rekonsiliasi final lain di tabel Reconcile (scoped by siblingRitelIds & specific record ID)
      if (normalizedRtvs.length > 0) {
        const conflictingFinalRekons = await tx.reconcile.findMany({
          where: {
            id: id ? { not: id } : undefined,
            ritelId: { in: siblingRitelIds },
            status: "final",
          },
          select: { id: true, noRekonsiliasi: true, rtvs: true, rtvDetails: true },
        });

        const targetIdSet = new Set(normalizedRtvs.map((r) => r.id));
        const targetCnSet = new Set(normalizedRtvs.map((r) => r.noRtv));

        for (const otherRekon of conflictingFinalRekons) {
          const otherDetails = Array.isArray(otherRekon.rtvDetails)
            ? (otherRekon.rtvDetails as Array<{ id?: string; noRtv?: string }>)
            : null;

          if (otherDetails && otherDetails.length > 0) {
            // Pencocokan presisi berdasarkan ID record retur spesifik
            const conflictItem = otherDetails.find((d) => d.id && targetIdSet.has(d.id));
            if (conflictItem) {
              const matchedTarget = normalizedRtvs.find((r) => r.id === conflictItem.id);
              throw new ValidationError(
                `Data retur RTV ${matchedTarget?.noRtv || conflictItem.noRtv || conflictItem.id} (ID: ${conflictItem.id}) sudah terikat pada rekonsiliasi final lain (${otherRekon.noRekonsiliasi}).`
              );
            }
          } else if (Array.isArray(otherRekon.rtvs)) {
            // Fallback backward-compatibility untuk record lama tanpa rtvDetails dalam ritel yang sama
            const conflictCn = otherRekon.rtvs.find((cn) => targetCnSet.has(cn));
            if (conflictCn) {
              throw new ValidationError(
                `Data retur RTV ${conflictCn} sudah terikat pada rekonsiliasi final lain (${otherRekon.noRekonsiliasi}).`
              );
            }
          }
        }
      }
    }

    let calculatedTotalPromo = 0;
    if (promoNumbers.length > 0) {
      const promos = await tx.promo.findMany({
        where: { 
          nomor: { in: promoNumbers },
          ritelId: { in: companyRitelIds }
        },
        select: { nomor: true, total: true }
      });

      const foundPromos = new Set(promos.map((p) => p.nomor));
      const missingPromos = promoNumbers.filter((num: any) => !foundPromos.has(num));
      if (missingPromos.length > 0) {
        throw new ValidationError(`Promo ${missingPromos.slice(0, 3).join(", ")} tidak ditemukan atau bukan milik ritel ini.`);
      }

      calculatedTotalPromo = promos.reduce((sum: number, p: any) => sum + (Number(p.total) || 0), 0);
    }

    // Strict server-side totals: Never fall back to untrusted client nominals
    const finalTotalInvoices = calculatedTotalInvoices;
    const finalTotalRtvs = calculatedTotalRtvs;
    const finalTotalPromo = calculatedTotalPromo;

    // Authoritative Server-side Formula Calculation:
    // balanceNetDue = bankStatement - (totalInvoices + totalNotesInvoice) + (totalRtvs + totalNotesRtv) + totalPromo + adminFee
    const bankStatementsArray: Array<{desc: string, nominal: number}> = Array.isArray(bankStatements) ? bankStatements : [];
    const calculatedBankStatement = bankStatementsArray.length > 0
      ? bankStatementsArray.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0)
      : (Number(bankStatement) || 0);
    const finalAdminFee = Number(biayaAdmin) || 0;

    const computedBalanceNetDue = calculatedBankStatement 
      - (finalTotalInvoices + totalNotesInvoice) 
      + (finalTotalRtvs + totalNotesRtv) 
      + finalTotalPromo 
      + finalAdminFee;

    const finalNominal = Number.isFinite(computedBalanceNetDue) ? computedBalanceNetDue : 0;

    // 3. Diffing on update: reset PO / DataRetur yang di-remove dari reconcile
    if (existingRekon && existingRekon.noRekonsiliasi) {
        const oldInvoices: string[] = existingRekon.invoices || [];
        const removedInvoices = oldInvoices.filter(inv => !invoiceList.includes(inv));
        if (removedInvoices.length > 0) {
          await tx.purchaseOrder.updateMany({
            where: { 
              noInvoice: { in: removedInvoices },
              buktiBayar: existingRekon.noRekonsiliasi
            },
            data: { statusBayar: false, buktiBayar: null }
          });
        }

        const oldRtvIds: string[] = Array.isArray(existingRekon.rtvDetails)
          ? (existingRekon.rtvDetails as any[]).map((r: any) => r.id).filter(Boolean)
          : [];
        const currentNormalizedIds = normalizedRtvs.map((r) => r.id);
        const removedRtvIds = oldRtvIds.filter((i) => !currentNormalizedIds.includes(i));

        if (removedRtvIds.length > 0) {
          await tx.dataRetur.updateMany({
            where: { 
              id: { in: removedRtvIds },
              referensiPembayaran: existingRekon.noRekonsiliasi
            },
            data: {
              invoiceRekon: null,
              referensiPembayaran: null,
              pembebananReturnId: null
            }
          });
        }
      }

    // 3.5. Finalize proof files: validate ownership, check binding, safely move, and track for rollback compensation
    const currentUserId = String(dbUser?.id || session?.user?.id || session?.email || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const userRole = safeRole || session?.user?.role || dbUser?.role || "cabang";

    const validBukti = await validateProofFile(buktiBayarUrl, finalId, currentUserId, userRole, tx);
    const validRincian = rincianStoragePath
      ? await validateProofFile(rincianBayarUrl, finalId, currentUserId, userRole, tx, "rincian bayar")
      : null;

    let finalBuktiBayarUrl: string | undefined = undefined;
    if (validBukti) {
      finalBuktiBayarUrl = await safelyFinalizeProofFile(
        validBukti.storagePath,
        validBukti.fileName,
        finalId,
        movedTracker
      );
    } else if (buktiBayarUrl) {
      finalBuktiBayarUrl = buktiBayarUrl;
    }

    let finalRincianBayarUrl: string | null = rincianLink;
    if (validRincian) {
      finalRincianBayarUrl = await safelyFinalizeProofFile(
        validRincian.storagePath,
        validRincian.fileName,
        finalId,
        movedTracker
      );
    }

    // 4. Simpan / Upsert Record Reconcile
    const newRekon = await tx.reconcile.upsert({
      where: { id: finalId },
      update: {
        ritelId: effectiveRitelId,
        bankStatement: Number(bankStatement) || 0,
        bankStatements: Array.isArray(bankStatements) ? bankStatements : [],
        biayaAdmin: Number(biayaAdmin) || 0,
        totalInvoices: finalTotalInvoices,
        totalRtvs: finalTotalRtvs,
        totalPromo: finalTotalPromo,
        nominal: finalNominal,
        invoices: invoiceList,
        rtvs: Array.from(new Set(normalizedRtvs.map((r) => r.noRtv))),
        rtvDetails: normalizedRtvs.map((r) => ({ id: r.id, noRtv: r.noRtv, refInvoice: r.refInvoice })),
        notes: notesArray,
        notesDesc: computedNotesDesc,
        notesNominal: computedNotesNominal,
        noPromo: noPromo || null,
        buktiBayarUrl: finalBuktiBayarUrl || undefined,
        rincianBayarUrl: rincianBayarUrl === undefined ? undefined : finalRincianBayarUrl,
        tglBayar: tglBayar ? new Date(tglBayar) : undefined,
        status: status || "final",
        remarks: remarks || null,
      },
      create: {
        id: finalId,
        noRekonsiliasi: GeneratedNoRekon,
        ritelId: effectiveRitelId,
        bankStatement: Number(bankStatement) || 0,
        bankStatements: Array.isArray(bankStatements) && bankStatements.length > 0 ? bankStatements : undefined,
        biayaAdmin: Number(biayaAdmin) || 0,
        totalInvoices: finalTotalInvoices,
        totalRtvs: finalTotalRtvs,
        totalPromo: finalTotalPromo,
        nominal: finalNominal,
        invoices: invoiceList,
        rtvs: Array.from(new Set(normalizedRtvs.map((r) => r.noRtv))),
        rtvDetails: normalizedRtvs.length > 0 ? normalizedRtvs.map((r) => ({ id: r.id, noRtv: r.noRtv, refInvoice: r.refInvoice })) : undefined,
        notes: notesArray.length > 0 ? notesArray : undefined,
        notesDesc: computedNotesDesc,
        notesNominal: computedNotesNominal,
        noPromo: noPromo || null,
        buktiBayarUrl: finalBuktiBayarUrl || null,
        rincianBayarUrl: finalRincianBayarUrl || null,
        tglBayar: tglBayar ? new Date(tglBayar) : null,
        status: status || "final",
        remarks: remarks || null,
      }
    });

    const rekonStatus = status || "final";
    const rekonNo = newRekon.noRekonsiliasi;

    // 5. RESTORE / CLEANUP STATUS PEMBAYARAN JIKA EDIT REKONSILIASI
    if (id && existingRekon) {
      const oldInvoices: string[] = Array.isArray(existingRekon.invoices) ? existingRekon.invoices : [];
      const oldRtvs: string[] = Array.isArray(existingRekon.rtvs) ? existingRekon.rtvs : [];
      const existingStatus = existingRekon.status || "final";

      if (existingStatus === "final" && rekonStatus === "draft") {
        // Transisi Final -> Draft: Pulihkan seluruh PO dan Retur lama yang terikat
        if (oldInvoices.length > 0) {
          await tx.purchaseOrder.updateMany({
            where: {
              noInvoice: { in: oldInvoices },
              ritelId: { in: companyRitelIds },
              buktiBayar: existingRekon.noRekonsiliasi,
            },
            data: {
              buktiBayar: null,
              statusBayar: false,
            },
          });
        }
        await tx.dataRetur.updateMany({
          where: {
            referensiPembayaran: existingRekon.noRekonsiliasi,
            ritelId: { in: companyRitelIds },
          },
          data: {
            referensiPembayaran: null,
            invoiceRekon: null,
            tanggalPembayaran: null,
          },
        });
      } else if (rekonStatus === "final") {
        // Status tetap Final, pulihkan invoice atau RTV yang DIHAPUS dari daftar
        const removedInvoices = oldInvoices.filter((inv) => !invoiceList.includes(inv));
        if (removedInvoices.length > 0) {
          await tx.purchaseOrder.updateMany({
            where: {
              noInvoice: { in: removedInvoices },
              ritelId: { in: companyRitelIds },
              buktiBayar: existingRekon.noRekonsiliasi,
            },
            data: {
              buktiBayar: null,
              statusBayar: false,
            },
          });
        }

        const currentRtvIds = new Set(normalizedRtvs.map((r) => r.id));
        const currentRtvCns = new Set(normalizedRtvs.map((r) => r.noRtv));
        const oldRtvDetails: any[] = Array.isArray(existingRekon.rtvDetails) ? existingRekon.rtvDetails : [];

        // Hapus ikatan spesifik record ID jika rtvDetails tersedia
        const removedRtvIds = oldRtvDetails.map((d: any) => d.id).filter((id: string) => id && !currentRtvIds.has(id));
        if (removedRtvIds.length > 0) {
          await tx.dataRetur.updateMany({
            where: {
              id: { in: removedRtvIds },
              referensiPembayaran: existingRekon.noRekonsiliasi,
              ritelId: { in: companyRitelIds },
            },
            data: {
              referensiPembayaran: null,
              invoiceRekon: null,
              tanggalPembayaran: null,
            },
          });
        }

        const removedRtvs = oldRtvs.filter((rtv) => !currentRtvCns.has(rtv));
        if (removedRtvs.length > 0) {
          await tx.dataRetur.updateMany({
            where: {
              rtvCn: { in: removedRtvs },
              referensiPembayaran: existingRekon.noRekonsiliasi,
              ritelId: { in: companyRitelIds },
            },
            data: {
              referensiPembayaran: null,
              invoiceRekon: null,
              tanggalPembayaran: null,
            },
          });
        }
      }
    }

    // 6. SYNC AKTIF: Pasang referensi invoice, pembebanan retur, dan referensi pembayaran di tabel DataRetur HANYA jika rekon berstatus final
    const validRtvs = normalizedRtvs.filter((r) => r.noRtv && r.refInvoice);
    if (rekonStatus === "final" && validRtvs.length > 0 && rekonNo) {
      const allRefInvoiceNos = [...new Set(validRtvs.map((r) => r.refInvoice).filter(Boolean))];
      const invoicePOs = allRefInvoiceNos.length > 0 
        ? await tx.purchaseOrder.findMany({
            where: { noInvoice: { in: allRefInvoiceNos }, ritelId: { in: companyRitelIds } },
            include: { UnitProduksi: true }
          })
        : [];
      const missingRefs = allRefInvoiceNos.filter((ref) => !invoicePOs.some((po) => po.noInvoice === ref));
      if (missingRefs.length) throw new ValidationError("Referensi invoice RTV harus berasal dari company yang dipilih.");
      for (const po of invoicePOs) {
        const access = checkPOOwnership(po, safeRole, dbUser?.regional || session?.regional, dbUser?.siteArea || session?.siteArea);
        if (!access.allowed) throw new ValidationError("Forbidden: Referensi invoice RTV berada di luar wewenang Anda.");
      }
      const invoiceUnitMap = new Map<string, string>();
      invoicePOs.forEach((po: any) => {
        if (po.noInvoice && po.UnitProduksi?.idRegional) {
          invoiceUnitMap.set(po.noInvoice, po.UnitProduksi.idRegional);
        }
      });

      const groupedByRef = new Map<string, string[]>();
      validRtvs.forEach((r) => {
        const ref = r.refInvoice;
        if (!groupedByRef.has(ref)) {
          groupedByRef.set(ref, []);
        }
        groupedByRef.get(ref)!.push(r.id);
      });

      for (const [ref, ids] of groupedByRef.entries()) {
        const updatePayload: any = {
          invoiceRekon: ref,
          referensiPembayaran: rekonNo,
          ...(tglBayar ? { tanggalPembayaran: new Date(tglBayar) } : {}),
        };
        const unitProduksiId = invoiceUnitMap.get(ref);
        if (unitProduksiId) {
          updatePayload.pembebananReturnId = unitProduksiId;
        }

        await tx.dataRetur.updateMany({
          where: { 
            id: { in: ids },
            ritelId: { in: companyRitelIds }
          },
          data: updatePayload
        });
      }
    }

    // 7. SYNC: Auto-fill buktiBayar on PurchaseOrder HANYA jika rekon berstatus final
    if (rekonStatus === "final" && invoiceList.length > 0 && rekonNo) {
      await tx.purchaseOrder.updateMany({
        where: {
          noInvoice: { in: invoiceList },
          ritelId: { in: companyRitelIds },
        },
        data: {
          buktiBayar: rekonNo,
          statusBayar: true,
        },
      });
    }

    // 7. Audit activity
    await auditActivity(tx as any, newRekon.id, "Reconcile", id ? "UPDATE" : "CREATE", { 
      id: dbUser?.id || (session as any)?.user?.id || "unknown", 
      name: getProfileName(session, dbUser), 
      role: safeRole 
    }, {
      noRekonsiliasi: newRekon.noRekonsiliasi,
      ritelId: newRekon.ritelId,
      nominal: Number(newRekon.nominal || 0),
      invoicesCount: invoiceList.length,
      rtvsCount: rtvList.length,
      status: newRekon.status,
      diff: id ? {
        oldInvoicesCount: existingRekon?.invoices?.length || 0,
        newInvoicesCount: invoiceList.length,
        oldNominal: Number(existingRekon?.nominal || 0),
        newNominal: Number(newRekon.nominal || 0)
      } : undefined
    });

      return newRekon;
    }, {
      timeout: 30000
    });
  } catch (txErr) {
    const rbResult = await rollbackFinalizedFiles(movedTracker);
    if (!rbResult.success) {
      console.error(
        `[RekonSave] Peringatan: ${rbResult.failed.length} berkas gagal dipulihkan ke direktori temp/ saat transaksi dibatalkan.`,
        rbResult.failed
      );
    }
    throw txErr;
  }
});

  // Successful commit: files permanently belong in destination, clear tracker
  movedTracker.length = 0;
  return savedRekon;
}
