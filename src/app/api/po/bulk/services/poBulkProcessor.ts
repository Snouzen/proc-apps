import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { canonicalProductName, upperClean } from "@/lib/text";
import { checkPOOwnership } from "@/lib/utils/regional";
import { auditActivity } from "@/lib/audit";
import { getProfileName } from "@/lib/auth";
import { canonicalInvoiceNumber } from "../../services/poQueryBuilder";
import {
  computeMissingCounts,
  detectBulkColumnKeys,
  parseBulkDate,
  parseBool,
  safeDebugVal,
} from "./poBulkHelpers";
import { parseExcelNumber } from "@/lib/excel";
import {
  initUnitProduksiMap,
  createRitelResolver,
  createProductResolver,
} from "./poBulkResolver";

export interface BulkProcessParams {
  body: any[];
  replaceDuplicates: boolean;
  signal?: AbortSignal;
  auth?: { session: any; role?: any; safeRole?: any; dbUser: any } | null;
}

export interface BulkProcessResult {
  count: number;
  errors: string[];
  message: string;
  addedPoCount: number;
  addedPOs: string[];
  duplicatePOs: string[];
  duplicatePoCount: number;
  missingCounts: Record<string, number>;
  replacedPoCount: number;
  replacedPOs: string[];
  addedPOsTruncated: boolean;
  duplicatePOsTruncated: boolean;
  replacedPOsTruncated: boolean;
  errorsTruncated: boolean;
  debugSamples: Array<{
    noPo: string;
    tglPoRawType: string;
    tglPoRaw: any;
    tglPoParsed: string | null;
    expiredRawType: string;
    expiredRaw: any;
    expiredParsed: string | null;
  }>;
}

export async function processBulkPO({
  body,
  replaceDuplicates,
  signal,
  auth,
}: BulkProcessParams): Promise<BulkProcessResult> {
  const safeRole = auth?.safeRole || auth?.role;
  const userRegional = auth?.dbUser?.regional || auth?.session?.regional || null;
  const userSiteArea = auth?.dbUser?.siteArea || auth?.session?.siteArea || null;

  let successCount = 0;
  let addedPoCount = 0;
  let replacedPoCount = 0;
  let duplicatePoCount = 0;
  const MAX_LIST = 200;
  const MAX_ERRORS = 200;
  const addedPOs: string[] = [];
  const duplicatePOs: string[] = [];
  const replacedPOs: string[] = [];
  const errors: string[] = [];
  let addedPOsTruncated = false;
  let duplicatePOsTruncated = false;
  let replacedPOsTruncated = false;
  let errorsTruncated = false;

  const missingCounts = computeMissingCounts(body);
  const debugSamples: BulkProcessResult["debugSamples"] = [];

  const { unitMap, fallbackUnit } = await initUnitProduksiMap();
  const { getRitel } = createRitelResolver();
  const { getProduct } = createProductResolver();

  const sample = body[0] || {};
  const colKeys = detectBulkColumnKeys(sample);

  const poGroups = new Map<string, any[]>();
  const poFirstIndex = new Map<string, number>();
  for (let idx = 0; idx < body.length; idx++) {
    const row = body[idx];
    const noPo = String(row?.[colKeys.keyNoPo] || "").trim();
    if (!noPo) continue;
    if (!poGroups.has(noPo)) {
      poGroups.set(noPo, []);
      poFirstIndex.set(noPo, idx);
    }
    poGroups.get(noPo)?.push(row);
  }

  const capPush = (
    arr: string[],
    val: string,
    kind: "added" | "dupe" | "replaced",
  ) => {
    if (arr.length < MAX_LIST) {
      arr.push(val);
      return;
    }
    if (kind === "added") addedPOsTruncated = true;
    if (kind === "dupe") duplicatePOsTruncated = true;
    if (kind === "replaced") replacedPOsTruncated = true;
  };

  const capError = (msg: string) => {
    if (errors.length < MAX_ERRORS) {
      errors.push(msg);
      return;
    }
    errorsTruncated = true;
  };

  const poNos = Array.from(poGroups.keys());
  const existingPos = poNos.length
    ? await prisma.purchaseOrder.findMany({
        where: { noPo: { in: poNos } },
        include: { UnitProduksi: true },
      })
    : [];
  const existingMap = new Map(existingPos.map((p) => [p.noPo, p]));

  const entries = Array.from(poGroups.entries());
  const CONCURRENCY = entries.length > 200 ? 5 : 8;
  let cursor = 0;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (!signal?.aborted) {
      const current = cursor++;
      if (current >= entries.length) break;
      const [noPo, rows] = entries[current];
      const firstRow = rows[0];
      const rowNum = (poFirstIndex.get(noPo) ?? 0) + 2;
      try {
        const isExisting = existingMap.has(noPo);
        const existingPo = existingMap.get(noPo);
        if (isExisting && !replaceDuplicates) {
          duplicatePoCount += 1;
          capPush(duplicatePOs, noPo, "dupe");
          continue;
        }
        if (isExisting && replaceDuplicates) {
          if (existingPo && auth) {
            const check = checkPOOwnership(existingPo, safeRole, userRegional, userSiteArea);
            if (!check.allowed) {
              capError(`Baris ${rowNum}: PO #${noPo} ditolak - ${check.reason}`);
              continue;
            }
          }
        }

        const companyName = upperClean(
          String(firstRow?.[colKeys.keyCompany] || ""),
        );
        const inisial = upperClean(
          String(firstRow?.[colKeys.keyInisial] || ""),
        );
        const tglPoRaw = firstRow?.[colKeys.keyTglPo];
        const tglKirimRaw = firstRow?.[colKeys.keyTglKirim];
        const linkPo = firstRow?.[colKeys.keyLinkPo]
          ? String(firstRow[colKeys.keyLinkPo]).trim()
          : null;
        const expiredPoRaw = firstRow?.[colKeys.keyExpired];
        const siteArea = upperClean(
          String(firstRow?.[colKeys.keySiteArea] || ""),
        );
        const noInvoice = firstRow?.[colKeys.keyNoInvoice]
          ? upperClean(String(firstRow[colKeys.keyNoInvoice]))
          : null;
        const tujuan = firstRow?.[colKeys.keyTujuan]
          ? upperClean(String(firstRow[colKeys.keyTujuan]))
          : null;

        if (!companyName) {
          throw new Error("Missing required field: Nama PT/Company");
        }
        if (!inisial) {
          throw new Error("Missing required field: Inisial");
        }
        if (!tujuan) {
          throw new Error("Missing required field: Tujuan");
        }

        const ritel = await getRitel(companyName, inisial);

        const unit = siteArea
          ? unitMap.get(siteArea.toLowerCase().trim()) || undefined
          : undefined;
        const unitToUse = unit ?? fallbackUnit;
        const effectiveBulkRegional =
          unit?.namaRegional && unit.namaRegional.toUpperCase() !== "UNKNOWN"
            ? unit.namaRegional
            : safeRole === "rm" && userRegional
              ? userRegional
              : null;

        // Validasi wewenang cabang untuk target unit (role rm dilepaskan agar bisa input PO)
        if (auth && safeRole !== "pusat" && safeRole !== "rm") {
          const checkTarget = checkPOOwnership(
            { UnitProduksi: unitToUse, regional: effectiveBulkRegional ?? unitToUse?.namaRegional, unitProduksiId: unitToUse?.idRegional },
            safeRole,
            userRegional,
            userSiteArea
          );
          if (!checkTarget.allowed) {
            capError(`Baris ${rowNum}: PO #${noPo} ditolak - Target unit ${unitToUse?.siteArea || "UNKNOWN"} di luar wewenang regional/cabang Anda`);
            continue;
          }
        }

        const tglPo = parseBulkDate(tglPoRaw);
        if (!tglPo) {
          throw new Error("Missing/invalid required field: Tanggal PO");
        }
        const tglKirim = parseBulkDate(tglKirimRaw);
        const expiredTgl = parseBulkDate(expiredPoRaw);
        if (!expiredTgl) {
          throw new Error(
            "Missing/invalid required field: Tanggal Expired PO",
          );
        }
        if (debugSamples.length < 5) {
          debugSamples.push({
            noPo,
            tglPoRawType: typeof tglPoRaw,
            tglPoRaw: safeDebugVal(tglPoRaw),
            tglPoParsed: tglPo.toISOString(),
            expiredRawType: typeof expiredPoRaw,
            expiredRaw: safeDebugVal(expiredPoRaw),
            expiredParsed: expiredTgl.toISOString(),
          });
        }

        const statusKirim = parseBool(firstRow?.[colKeys.keyKirim]);
        const statusSdif = parseBool(firstRow?.[colKeys.keySdif]);
        const statusPo = parseBool(firstRow?.[colKeys.keyStatusPo]);
        const statusFp = parseBool(firstRow?.[colKeys.keyStatusFp]);
        const statusKwi = parseBool(firstRow?.[colKeys.keyStatusKwi]);
        const statusInv = parseBool(firstRow?.[colKeys.keyStatusInv]);
        const statusTagih = parseBool(firstRow?.[colKeys.keyStatusTagih]);
        const statusBayar = parseBool(firstRow?.[colKeys.keyStatusBayar]);

        const poData = {
          ritelId: ritel.id,
          unitProduksiId: (unitToUse?.idRegional ??
            fallbackUnit?.idRegional ??
            "UNKNOWN") as string,
          tglPo,
          expiredTgl,
          tglkirim: tglKirim || null,
          linkPo,
          noInvoice: canonicalInvoiceNumber(noInvoice),
          tujuanDetail: tujuan,
          regional: effectiveBulkRegional,
          statusKirim,
          statusSdif,
          statusPo,
          statusFp,
          statusKwi,
          statusInv,
          statusTagih,
          statusBayar,
          updatedAt: new Date(),
        };

        // Prepare all items for this PO first
        const poItems: Array<{
          id: string;
          productId: string;
          pcs: number;
          pcsKirim: number;
          hargaKg: number;
          hargaPcs: number;
          nominal: number;
          rpTagih: number;
          discount: number;
        }> = [];

        for (const row of rows) {
          if (signal?.aborted) break;
          const rawProd = String(row?.[colKeys.keyNamaProduk] || "").trim();
          if (!rawProd) {
            throw new Error(`Baris produk kosong pada PO #${noPo}`);
          }
          const productName = canonicalProductName(rawProd);
          if (!productName) {
            throw new Error(`Nama produk "${rawProd}" tidak valid pada PO #${noPo}`);
          }
          const product = await getProduct(productName);
          if (!product?.id) {
            throw new Error(`Produk "${rawProd}" gagal diproses pada PO #${noPo}`);
          }

          const parseNumericCell = (val: any, fieldLabel: string): number => {
            if (val === undefined || val === null) return 0;
            if (typeof val === "string" && val.trim() === "") return 0;
            const parsed = parseExcelNumber(val);
            if (parsed === null) {
              throw new Error(`Nilai "${val}" untuk kolom ${fieldLabel} tidak valid pada PO #${noPo}`);
            }
            return parsed;
          };

          const satuan = Number(product.satuanKg ?? 1) || 1;
          let pcs = parseNumericCell(row?.[colKeys.keyPcs], "Pcs");
          let hargaPcs = parseNumericCell(row?.[colKeys.keyHargaPcs], "Harga Pcs");
          const kgRaw = parseNumericCell(row?.[colKeys.keyKg], "Kg");
          const hargaKgRaw = parseNumericCell(row?.[colKeys.keyHargaKg], "Harga Kg");
          if (!pcs && kgRaw && satuan > 0) {
            pcs = kgRaw / satuan;
          }
          if (!hargaPcs && hargaKgRaw && satuan > 0) {
            hargaPcs = hargaKgRaw * satuan;
          }
          pcs = Math.round(pcs);
          const parsedPcsKirim = parseNumericCell(row?.[colKeys.keyPcsKirim], "Pcs Kirim");
          const pcsKirim = Math.round(parsedPcsKirim || pcs || 0);
          const hargaKg = satuan > 0 ? hargaPcs / satuan : 0;

          // FEATURE: Discount Mapping
          const rawDiscount = parseNumericCell(row?.[colKeys.keyDiscount], "Discount");
          const discount = Math.max(0, rawDiscount);

          let nominal = parseNumericCell(row?.[colKeys.keyNominal], "Nominal");
          if (!nominal) {
            nominal = Math.max(0, hargaPcs * pcs - discount);
          }

          const parsedRpTagih = parseNumericCell(row?.[colKeys.keyRpTagih], "Rp Tagih");
          const rpTagih =
            parsedRpTagih ||
            Math.max(
              0,
              (hargaPcs && pcsKirim ? hargaPcs * pcsKirim : 0) - discount,
            );

          poItems.push({
            id: randomUUID(),
            productId: product.id,
            pcs,
            pcsKirim,
            hargaKg,
            hargaPcs,
            nominal,
            rpTagih,
            discount,
          });
        }

        if (signal?.aborted) break;

        // Reject PO before transaction if no valid items found (prevents item deletion on empty replace)
        if (poItems.length === 0) {
          throw new Error(`PO #${noPo} ditolak: tidak ada item produk valid.`);
        }

        // Atomically commit PO header, items, and audit log in a single transaction
        await prisma.$transaction(async (tx) => {
          const po = await tx.purchaseOrder.upsert({
            where: { noPo },
            update: poData,
            create: {
              id: existingPo ? existingPo.id : randomUUID(),
              noPo,
              RitelModern: { connect: { id: ritel.id } },
              UnitProduksi: {
                connect: {
                  idRegional: (unitToUse?.idRegional ??
                    fallbackUnit?.idRegional ??
                    "UNKNOWN") as string,
                },
              },
              tglPo,
              expiredTgl,
              tglkirim: tglKirim || null,
              linkPo,
              noInvoice,
              tujuanDetail: tujuan,
              regional: unitToUse?.namaRegional ?? null,
              statusKirim,
              statusSdif,
              statusPo,
              statusFp,
              statusKwi,
              statusInv,
              statusTagih,
              statusBayar,
              updatedAt: new Date(),
              createdAt: new Date(),
            },
          });

          if (isExisting && replaceDuplicates) {
            await tx.purchaseOrderItem.deleteMany({
              where: { purchaseOrderId: po.id },
            });
          }

          if (poItems.length > 0) {
            await tx.purchaseOrderItem.createMany({
              data: poItems.map((item) => ({
                ...item,
                purchaseOrderId: po.id,
              })),
            });
          }

          // Atomic Audit: Log mutation inside the exact same transaction
          if (auth) {
            const { session, dbUser } = auth;
            await auditActivity(
              tx as any,
              po.id,
              "PurchaseOrder",
              isExisting ? "UPDATE" : "CREATE",
              {
                id: dbUser?.id || (session as any)?.user?.id || "unknown",
                name: getProfileName(session, dbUser),
                role: safeRole,
              },
              {
                action: isExisting ? "bulk_replace" : "bulk_create",
                noPo,
                ritelId: ritel.id,
                unitProduksiId: (unitToUse?.idRegional ?? fallbackUnit?.idRegional ?? "UNKNOWN") as string,
                itemCount: poItems.length,
                tglPo: poData.tglPo,
                tglkirim: poData.tglkirim,
              }
            );
          }
        });

        // Increment committed counts only after transaction successfully commits
        successCount += poItems.length;
        if (!isExisting) {
          addedPoCount += 1;
          capPush(addedPOs, noPo, "added");
        } else if (replaceDuplicates) {
          replacedPoCount += 1;
          capPush(replacedPOs, noPo, "replaced");
        }
      } catch (err: any) {
        console.error(`PO ${noPo} error:`, err.message);
        capError(`PO ${noPo} (Row ~${rowNum}): ${err.message}`);
      }
    }
  });

  await Promise.all(workers);

  return {
    count: successCount,
    errors,
    message: `Processed ${successCount} item records.`,
    addedPoCount,
    addedPOs,
    duplicatePOs,
    duplicatePoCount,
    missingCounts,
    replacedPoCount,
    replacedPOs,
    addedPOsTruncated,
    duplicatePOsTruncated,
    replacedPOsTruncated,
    errorsTruncated,
    debugSamples,
  };
}
