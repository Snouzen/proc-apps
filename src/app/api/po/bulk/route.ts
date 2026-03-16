import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";
import {
  canonicalProductName,
  dedupeKey,
  upperClean,
  upperCleanOrNull,
} from "@/lib/text";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const payload = Array.isArray(raw)
      ? { data: raw, replaceDuplicates: false }
      : raw;
    const body = payload?.data;
    const replaceDuplicates: boolean = !!payload?.replaceDuplicates;
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array." },
        { status: 400 },
      );
    }

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
    const missingCounts: Record<string, number> = {};
    const debugSamples: Array<{
      noPo: string;
      tglPoRawType: string;
      tglPoRaw: any;
      tglPoParsed: string | null;
      expiredRawType: string;
      expiredRaw: any;
      expiredParsed: string | null;
    }> = [];
    const expectedHeaders = [
      "Nama Company",
      "Inisial",
      "Nomor PO",
      "Tanggal PO",
      "Link PO",
      "Tanggal Expired PO",
      "Site Area",
      "Nama Produk",
      "Nomor Invoice",
      "Tujuan",
      "kg",
      "pcs",
      "harga per kg",
      "harga per pcs",
      "nominal",
      "kirim",
      "pcs kirim",
      "rp tagih",
      "SDI/F",
      "PO",
      "FP",
      "KWI",
      "Inv",
      "Tagih",
      "Bayar",
    ];
    // Initialize counters
    for (const h of expectedHeaders) missingCounts[h] = 0;
    // Count missing cells (treat undefined/empty string as missing)
    for (const row of body) {
      for (const h of expectedHeaders) {
        const v = (row as any)[h];
        if (v === undefined || v === null || String(v).trim() === "") {
          missingCounts[h] = (missingCounts[h] || 0) + 1;
        }
      }
    }

    // Pre-fetch UnitProduksi map + ensure placeholder exists
    type UnitLite = {
      siteArea: string;
      idRegional: string;
      namaRegional?: string;
    };
    const units =
      (await prisma.unitProduksi.findMany()) as unknown as UnitLite[];
    const AREA_ALIASES: Record<string, string[]> = {
      "spb dki jakarta": ["spb dki", "spb dki jkt", "spb dki (jakarta)"],
    };
    const unitMap = new Map<string, UnitLite>();
    for (const u of units) {
      const key = String(u.siteArea || "")
        .toLowerCase()
        .trim();
      unitMap.set(key, u);
      const aliases = AREA_ALIASES[key] || [];
      for (const a of aliases) {
        unitMap.set(a.toLowerCase(), u);
      }
    }
    // Ensure fallback placeholder (idRegional: 'UNKNOWN')
    let fallbackUnit = units.find((u) => u.idRegional === "UNKNOWN");
    if (!fallbackUnit) {
      try {
        fallbackUnit = await prisma.unitProduksi.create({
          data: {
            idRegional: "UNKNOWN",
            siteArea: "UNKNOWN",
            namaRegional: "Unknown",
            updatedAt: new Date(),
          } as any,
        });
      } catch {
        // If concurrent create, try fetch again
        fallbackUnit =
          (await prisma.unitProduksi.findFirst({
            where: { idRegional: "UNKNOWN" },
          })) || undefined;
      }
    }

    // Helper normalize + find column keys by aliases
    const norm = (s: string) =>
      (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const findKey = (obj: any, aliases: string[]): string | null => {
      const targets = aliases.map(norm);
      for (const k of Object.keys(obj || {})) {
        if (targets.includes(norm(k))) return k;
      }
      return null;
    };

    // Detect keys from first row
    const sample = body[0] || {};
    const keyNoPo =
      findKey(sample, ["Nomor PO", "No PO", "NO PO", "NOPO"]) || "Nomor PO";
    const keyTglPo =
      findKey(sample, ["Tanggal PO", "TGL PO", "TanggalPO"]) || "Tanggal PO";
    const keyLinkPo =
      findKey(sample, ["Link PO", "Link DOC", "Link Dokumen"]) || "Link PO";
    const keyExpired =
      findKey(sample, ["Tanggal Expired PO", "TGL EXP", "Expired PO"]) ||
      "Tanggal Expired PO";
    const keySiteArea =
      findKey(sample, [
        "Site Area",
        "Unit Produks",
        "Unit Produksi",
        "UNIT PRODUKS",
        "UNIT PRODUKSI",
      ]) || "Site Area";
    const keyNoInvoice =
      findKey(sample, ["Nomor Invoice", "No Inv", "NO INV", "Invoice No"]) ||
      "Nomor Invoice";
    const keyTujuan =
      findKey(sample, ["Tujuan", "Tujuan Kirim", "TUJUAN KIRIM"]) || "Tujuan";
    const keyNamaProduk =
      findKey(sample, ["Nama Produk", "Produk", "Product"]) || "Nama Produk";
    const keyKg = findKey(sample, ["kg", "KG"]) || "kg";
    const keyPcs = findKey(sample, ["pcs", "PCS"]) || "pcs";
    const keyHargaKg =
      findKey(sample, ["harga per kg", "RP/KG", "RP KG"]) || "harga per kg";
    const keyHargaPcs =
      findKey(sample, ["harga per pcs", "RP/PCS", "RP PCS"]) || "harga per pcs";
    const keyNominal = findKey(sample, ["nominal", "NOMINAL"]) || "nominal";
    const keyKirim = findKey(sample, ["kirim", "KIRIM"]) || "kirim";
    const keyPcsKirim =
      findKey(sample, ["pcs kirim", "PCS KIRIM"]) || "pcs kirim";
    const keyRpTagih =
      findKey(sample, ["rp tagih", "RP TAGIH", "Total"]) || "rp tagih";
    const keySdif = findKey(sample, ["SDI/F", "SDIF", "SDI F"]) || "SDI/F";
    const keyStatusPo = findKey(sample, ["PO"]) || "PO";
    const keyStatusFp = findKey(sample, ["FP"]) || "FP";
    const keyStatusKwi = findKey(sample, ["KWI", "KWITANSI"]) || "KWI";
    const keyStatusInv = findKey(sample, ["Inv", "INVOICE"]) || "Inv";
    const keyStatusTagih = findKey(sample, ["Tagih"]) || "Tagih";
    const keyStatusBayar = findKey(sample, ["Bayar", "Pembayaran"]) || "Bayar";

    const poGroups = new Map<string, any[]>();
    const poFirstIndex = new Map<string, number>();
    for (let idx = 0; idx < body.length; idx++) {
      const row = body[idx];
      const noPo = String(row?.[keyNoPo] || "").trim();
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
          select: { id: true, noPo: true },
        })
      : [];
    const existingMap = new Map(existingPos.map((p) => [p.noPo, p.id]));

    const ritelCache = new Map<string, Promise<{ id: string }>>();
    const productCache = new Map<
      string,
      Promise<{ id: string; satuanKg?: number | null }>
    >();
    const poIdsToReplace: string[] = [];
    const itemsToCreateAll: Array<{
      id: string;
      purchaseOrderId: string;
      productId: string;
      pcs: number;
      pcsKirim: number;
      hargaKg: number;
      hargaPcs: number;
      nominal: number;
      rpTagih: number;
      discount: number;
    }> = [];

    const getRitel = (companyName: string, inisial: string | null) => {
      const companyUpper = upperClean(companyName);
      const inisialUpper = upperCleanOrNull(inisial);
      const ritelKey = `${norm(companyUpper)}|${norm(inisialUpper || "")}`;
      const cached = ritelCache.get(ritelKey);
      if (cached) return cached;
      const p = (async () => {
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
          select: { id: true, namaPt: true, inisial: true, createdAt: true },
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
          prisma.ritelModern
            .update({
              where: { id: match.id },
              data: {
                namaPt: companyUpper,
                inisial: inisialUpper,
                updatedAt: new Date(),
              },
              select: { id: true },
            })
            .catch(() => {});
          return { id: match.id };
        }
        let ritel: { id: string } | null = null;
        if (inisialUpper) {
          ritel = await prisma.ritelModern.findFirst({
            where: {
              namaPt: { equals: companyUpper, mode: "insensitive" },
              inisial: { equals: inisialUpper, mode: "insensitive" },
            },
            select: { id: true },
          });
        } else {
          ritel = await prisma.ritelModern.findFirst({
            where: {
              namaPt: { equals: companyUpper, mode: "insensitive" },
              OR: [{ inisial: null }, { inisial: { equals: "" } }],
            },
            select: { id: true },
          });
        }
        if (ritel) {
          prisma.ritelModern
            .update({
              where: { id: ritel.id },
              data: {
                namaPt: companyUpper,
                inisial: inisialUpper,
                updatedAt: new Date(),
              },
              select: { id: true },
            })
            .catch(() => {});
          return { id: ritel.id };
        }
        const created = await prisma.ritelModern.create({
          data: {
            id: randomUUID(),
            namaPt: companyUpper,
            inisial: inisialUpper,
            updatedAt: new Date(),
          },
          select: { id: true },
        });
        return { id: created.id };
      })().catch((e) => {
        ritelCache.delete(ritelKey);
        throw e;
      });
      ritelCache.set(ritelKey, p);
      return p;
    };

    const getProduct = (productName: string) => {
      const productUpper = canonicalProductName(productName);
      const productKey = dedupeKey(productUpper);
      const cached = productCache.get(productKey);
      if (cached) return cached;
      const p = (async () => {
        const token =
          productUpper.split(/\s+/).filter(Boolean)[0] || productUpper;
        const candidates = await prisma.product.findMany({
          where: { name: { contains: token, mode: "insensitive" } },
          select: { id: true, name: true, satuanKg: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 50,
        });
        const match =
          candidates.find(
            (p) => dedupeKey(canonicalProductName(p?.name)) === productKey,
          ) || null;
        if (match?.id) {
          prisma.product
            .update({
              where: { id: match.id },
              data: { name: productUpper, updatedAt: new Date() },
              select: { id: true, satuanKg: true },
            })
            .catch(() => {});
          return { id: match.id, satuanKg: match.satuanKg ?? null };
        }
        const found = await prisma.product.findFirst({
          where: { name: { equals: productUpper, mode: "insensitive" } },
          select: { id: true, satuanKg: true },
        });
        if (found) {
          prisma.product
            .update({
              where: { id: found.id },
              data: { name: productUpper, updatedAt: new Date() },
              select: { id: true, satuanKg: true },
            })
            .catch(() => {});
          return { id: found.id, satuanKg: found.satuanKg ?? null };
        }
        const created = await prisma.product.create({
          data: {
            id: randomUUID(),
            name: productUpper,
            updatedAt: new Date(),
          },
          select: { id: true, satuanKg: true },
        });
        return { id: created.id, satuanKg: created.satuanKg ?? null };
      })().catch((e) => {
        productCache.delete(productKey);
        throw e;
      });
      productCache.set(productKey, p);
      return p;
    };

    const keyCompany =
      findKey(sample, ["Nama Company", "Nama PT", "Company"]) || "Nama Company";
    const keyInisial = findKey(sample, ["Inisial", "Initial"]) || "Inisial";
    const dateOnlyUtcNoon = (y: number, m0: number, d1: number) =>
      new Date(Date.UTC(y, m0, d1, 12, 0, 0, 0));
    const tzOffsetHours = 7;
    const normalizeToUtcNoonFromOffset = (date: Date) => {
      const shifted = new Date(date.getTime() + tzOffsetHours * 3600 * 1000);
      return dateOnlyUtcNoon(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
      );
    };
    const parseDate = (d: any) => {
      if (d === undefined || d === null) return null;
      if (typeof d === "string" && d.trim() === "") return null;

      if (typeof d === "number") {
        const days = Math.floor(d);
        const utc = new Date((days - 25569) * 86400 * 1000);
        if (isNaN(utc.getTime())) return null;
        return dateOnlyUtcNoon(
          utc.getUTCFullYear(),
          utc.getUTCMonth(),
          utc.getUTCDate(),
        );
      }

      if (d instanceof Date) {
        if (isNaN(d.getTime())) return null;
        return dateOnlyUtcNoon(d.getFullYear(), d.getMonth(), d.getDate());
      }

      if (typeof d === "string") {
        const s = d.trim();
        if (/^\d{4}-\d{2}-\d{2}t/i.test(s)) {
          const parsedIso = new Date(s);
          if (!isNaN(parsedIso.getTime())) {
            return normalizeToUtcNoonFromOffset(parsedIso);
          }
        }
        const token = s.split(/\s+/)[0];

        const dmY = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmY) {
          const da = Number(dmY[1]);
          const mo = Number(dmY[2]) - 1;
          const y = Number(dmY[3]);
          if (
            !Number.isFinite(y) ||
            !Number.isFinite(mo) ||
            !Number.isFinite(da)
          ) {
            return null;
          }
          return dateOnlyUtcNoon(y, mo, da);
        }

        const dMonY =
          token.match(
            /^(\d{1,2})[\/\-\s]([A-Za-z]{3,}\.?)([\/\-\s])(\d{2,4})$/,
          ) || token.match(/^(\d{1,2})[\-\s]([A-Za-z]{3,}\.?)[\-\s](\d{2,4})$/);
        if (dMonY) {
          const da = Number(dMonY[1]);
          const monRaw = String(dMonY[2] || "")
            .toLowerCase()
            .replace(/[^a-z]/g, "");
          const yRaw = Number(dMonY[dMonY.length - 1]);
          const y = yRaw < 100 ? 2000 + yRaw : yRaw;
          const monMap: Record<string, number> = {
            jan: 0,
            january: 0,
            feb: 1,
            february: 1,
            mar: 2,
            march: 2,
            apr: 3,
            april: 3,
            may: 4,
            mei: 4,
            jun: 5,
            june: 5,
            jul: 6,
            july: 6,
            aug: 7,
            agu: 7,
            august: 7,
            sep: 8,
            sept: 8,
            september: 8,
            oct: 9,
            october: 9,
            oktober: 9,
            nov: 10,
            november: 10,
            dec: 11,
            december: 11,
            desember: 11,
          };
          const mo = monMap[monRaw];
          if (
            !Number.isFinite(y) ||
            !Number.isFinite(da) ||
            !Number.isFinite(mo)
          ) {
            return null;
          }
          return dateOnlyUtcNoon(y, mo, da);
        }

        const yMd = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (yMd) {
          const y = Number(yMd[1]);
          const mo = Number(yMd[2]) - 1;
          const da = Number(yMd[3]);
          if (
            !Number.isFinite(y) ||
            !Number.isFinite(mo) ||
            !Number.isFinite(da)
          ) {
            return null;
          }
          return dateOnlyUtcNoon(y, mo, da);
        }

        const parsed = new Date(s);
        if (isNaN(parsed.getTime())) return null;
        return normalizeToUtcNoonFromOffset(parsed);
      }

      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return null;
      return normalizeToUtcNoonFromOffset(parsed);
    };
    const parseBool = (val: any) => String(val).toUpperCase() === "TRUE";

    const entries = Array.from(poGroups.entries());
    const CONCURRENCY = entries.length > 200 ? 5 : 8;
    let cursor = 0;

    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (!req.signal.aborted) {
        const current = cursor++;
        if (current >= entries.length) break;
        const [noPo, rows] = entries[current];
        const firstRow = rows[0];
        const rowNum = (poFirstIndex.get(noPo) ?? 0) + 2;
        try {
          const isExisting = existingMap.has(noPo);
          if (isExisting && !replaceDuplicates) {
            duplicatePoCount += 1;
            capPush(duplicatePOs, noPo, "dupe");
            continue;
          }
          if (isExisting && replaceDuplicates) {
            replacedPoCount += 1;
            capPush(replacedPOs, noPo, "replaced");
          }

          const companyName = upperClean(String(firstRow?.[keyCompany] || ""));
          const inisial = upperClean(String(firstRow?.[keyInisial] || ""));
          const tglPoRaw = firstRow?.[keyTglPo];
          const linkPo = firstRow?.[keyLinkPo]
            ? String(firstRow[keyLinkPo]).trim()
            : null;
          const expiredPoRaw = firstRow?.[keyExpired];
          const siteArea = upperClean(String(firstRow?.[keySiteArea] || ""));
          const noInvoice = firstRow?.[keyNoInvoice]
            ? upperClean(String(firstRow[keyNoInvoice]))
            : null;
          const tujuan = firstRow?.[keyTujuan]
            ? upperClean(String(firstRow[keyTujuan]))
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

          const tglPo = parseDate(tglPoRaw);
          if (!tglPo) {
            throw new Error("Missing/invalid required field: Tanggal PO");
          }
          const expiredTgl = parseDate(expiredPoRaw);
          if (!expiredTgl) {
            throw new Error(
              "Missing/invalid required field: Tanggal Expired PO",
            );
          }
          if (debugSamples.length < 5) {
            const safeVal = (v: any) => {
              if (v === null || v === undefined) return v;
              if (typeof v === "string") return v.slice(0, 120);
              if (typeof v === "number" || typeof v === "boolean") return v;
              if (v instanceof Date) return v.toISOString();
              try {
                return JSON.parse(
                  JSON.stringify(v, (_k, vv) =>
                    vv instanceof Date ? vv.toISOString() : vv,
                  ),
                );
              } catch {
                return String(v);
              }
            };
            debugSamples.push({
              noPo,
              tglPoRawType: typeof tglPoRaw,
              tglPoRaw: safeVal(tglPoRaw),
              tglPoParsed: tglPo.toISOString(),
              expiredRawType: typeof expiredPoRaw,
              expiredRaw: safeVal(expiredPoRaw),
              expiredParsed: expiredTgl.toISOString(),
            });
          }

          const statusKirim = parseBool(firstRow?.[keyKirim]);
          const statusSdif = parseBool(firstRow?.[keySdif]);
          const statusPo = parseBool(firstRow?.[keyStatusPo]);
          const statusFp = parseBool(firstRow?.[keyStatusFp]);
          const statusKwi = parseBool(firstRow?.[keyStatusKwi]);
          const statusInv = parseBool(firstRow?.[keyStatusInv]);
          const statusTagih = parseBool(firstRow?.[keyStatusTagih]);
          const statusBayar = parseBool(firstRow?.[keyStatusBayar]);

          const poData = {
            ritelId: ritel.id,
            unitProduksiId: (unitToUse?.idRegional ??
              fallbackUnit?.idRegional ??
              "UNKNOWN") as string,
            tglPo,
            expiredTgl,
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
          };

          const po = await prisma.purchaseOrder.upsert({
            where: { noPo },
            update: poData,
            create: {
              id: randomUUID(),
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

          if (!isExisting) {
            addedPoCount += 1;
            capPush(addedPOs, noPo, "added");
          }
          poIdsToReplace.push(po.id);

          for (const row of rows) {
            if (req.signal.aborted) break;
            const productName = canonicalProductName(
              String(row?.[keyNamaProduk] || ""),
            );
            if (!productName) continue;
            const product = await getProduct(productName);

            const satuan = Number(product.satuanKg ?? 1) || 1;
            let pcs = Number(row?.[keyPcs]) || 0;
            let hargaPcs = Number(row?.[keyHargaPcs]) || 0;
            const kgRaw = Number(row?.[keyKg]) || 0;
            const hargaKgRaw = Number(row?.[keyHargaKg]) || 0;
            if (!pcs && kgRaw && satuan > 0) {
              pcs = kgRaw / satuan;
            }
            if (!hargaPcs && hargaKgRaw && satuan > 0) {
              hargaPcs = hargaKgRaw * satuan;
            }
            pcs = Math.round(pcs);
            const pcsKirim = Math.round(Number(row?.[keyPcsKirim]) || 0);
            const hargaKg = satuan > 0 ? hargaPcs / satuan : 0;
            const nominal = hargaPcs * pcs;
            const rpTagih =
              Number(row?.[keyRpTagih]) ||
              (hargaPcs && pcsKirim ? hargaPcs * pcsKirim : 0);

            itemsToCreateAll.push({
              id: randomUUID(),
              purchaseOrderId: po.id,
              productId: product.id,
              pcs,
              pcsKirim,
              hargaKg,
              hargaPcs,
              nominal,
              rpTagih,
              discount: 0,
            });
          }
        } catch (err: any) {
          console.error(`PO ${noPo} error:`, err.message);
          capError(`PO ${noPo} (Row ~${rowNum}): ${err.message}`);
        }
      }
    });
    await Promise.all(workers);

    if (!req.signal.aborted && poIdsToReplace.length) {
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: { in: poIdsToReplace } },
      });
    }
    if (!req.signal.aborted && itemsToCreateAll.length) {
      const CHUNK = 2000;
      for (let i = 0; i < itemsToCreateAll.length; i += CHUNK) {
        const part = itemsToCreateAll.slice(i, i + CHUNK);
        const created = await prisma.purchaseOrderItem.createMany({
          data: part,
        });
        successCount += created.count;
      }
    }

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
