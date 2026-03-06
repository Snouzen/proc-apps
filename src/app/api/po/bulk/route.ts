import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";

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
    const duplicatePOs: string[] = [];
    const errors: string[] = [];
    const missingCounts: Record<string, number> = {};
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
    const units = await prisma.unitProduksi.findMany();
    const unitMap = new Map(units.map((u) => [u.siteArea.toLowerCase(), u]));
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

    // 2. Group rows by No PO using detected key
    const poGroups = new Map<string, any[]>();
    for (const row of body) {
      const noPo = String(row[keyNoPo] || "").trim();
      if (!noPo) continue;
      if (!poGroups.has(noPo)) {
        poGroups.set(noPo, []);
      }
      poGroups.get(noPo)?.push(row);
    }

    // 3. Process each PO Group
    for (const [noPo, rows] of poGroups) {
      const firstRow = rows[0];
      const rowNum = body.indexOf(firstRow) + 2; // Approximate row number

      try {
        // Skip duplicate PO (do not update, only report)
        const existing = await prisma.purchaseOrder.findUnique({
          where: { noPo },
          select: { id: true },
        });
        if (existing && !replaceDuplicates) {
          duplicatePOs.push(noPo);
          continue;
        }

        // Extract Header Data from first row
        const keyCompany =
          findKey(sample, ["Nama Company", "Nama PT", "Company"]) ||
          "Nama Company";
        const keyInisial = findKey(sample, ["Inisial", "Initial"]) || "Inisial";
        const companyName = String(firstRow[keyCompany] || "").trim();
        const inisial =
          firstRow[keyInisial] != null
            ? String(firstRow[keyInisial]).trim() || null
            : null;
        const tglPoRaw = firstRow[keyTglPo];
        const linkPo = firstRow[keyLinkPo]
          ? String(firstRow[keyLinkPo]).trim()
          : null;
        const expiredPoRaw = firstRow[keyExpired];
        const siteArea = String(firstRow[keySiteArea] || "").trim();
        const noInvoice = firstRow[keyNoInvoice]
          ? String(firstRow[keyNoInvoice]).trim()
          : null;
        const tujuan = firstRow[keyTujuan]
          ? String(firstRow[keyTujuan]).trim()
          : null;

        // Validation
        if (!companyName) {
          throw new Error("Missing required field: Nama PT/Company");
        }

        // 1. Handle RitelModern (Upsert by combination Nama PT + Inisial)
        let ritel: any = null;
        if (inisial && inisial.trim()) {
          ritel = await prisma.ritelModern.findFirst({
            where: {
              namaPt: { equals: companyName, mode: "insensitive" },
              inisial: { equals: inisial, mode: "insensitive" },
            },
          });
        } else {
          ritel = await prisma.ritelModern.findFirst({
            where: {
              namaPt: { equals: companyName, mode: "insensitive" },
              OR: [{ inisial: null }, { inisial: { equals: "" } }],
            },
          });
        }
        if (!ritel) {
          ritel = await prisma.ritelModern.create({
            data: {
              id: randomUUID(),
              namaPt: companyName,
              inisial: inisial || null,
              updatedAt: new Date(),
            },
          });
        }

        // 2. Handle UnitProduksi (Optional now)
        const unit = siteArea
          ? unitMap.get(siteArea.toLowerCase()) || undefined
          : undefined;
        const unitToUse = unit ?? fallbackUnit;

        // Date Parsing
        const parseDate = (d: any) => {
          if (!d) return new Date();
          if (typeof d === "number") {
            const date = new Date(Math.round((d - 25569) * 86400 * 1000));
            return date;
          }
          const date = new Date(d);
          return isNaN(date.getTime()) ? new Date() : date;
        };

        const tglPo = parseDate(tglPoRaw);
        const expiredTgl = expiredPoRaw ? parseDate(expiredPoRaw) : null;

        // Status (take from first row, assume same for all items in PO)
        const parseBool = (val: any) => String(val).toUpperCase() === "TRUE";
        const statusKirim = parseBool(firstRow[keyKirim]);
        const statusSdif = parseBool(firstRow[keySdif]);
        const statusPo = parseBool(firstRow[keyStatusPo]);
        const statusFp = parseBool(firstRow[keyStatusFp]);
        const statusKwi = parseBool(firstRow[keyStatusKwi]);
        const statusInv = parseBool(firstRow[keyStatusInv]);
        const statusTagih = parseBool(firstRow[keyStatusTagih]);
        const statusBayar = parseBool(firstRow[keyStatusBayar]);

        // Upsert PO Header
        const poData = {
          ritelId: ritel.id,
          unitProduksiId: unitToUse?.idRegional ?? null,
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
            // gunakan nested relation untuk menghindari error "Argument `RitelModern` is missing"
            RitelModern: { connect: { id: ritel.id } },
            // Always connect UnitProduksi (use fallback when missing)
            ...(unitToUse
              ? {
                  UnitProduksi: {
                    connect: { idRegional: unitToUse.idRegional },
                  },
                }
              : {}),
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
        if (existing) {
          // treat as replacement
          // delete and recreate items below will refresh all items
        } else {
          addedPoCount += 1;
        }

        // Delete existing items to replace with new ones (Full Replacement Strategy)
        await prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: po.id },
        });

        // Create Items
        for (const row of rows) {
          const productName = String(row[keyNamaProduk] || "").trim();
          if (!productName) continue;

          // Handle Product (Upsert)
          let product = await prisma.product.findFirst({
            where: { name: { equals: productName, mode: "insensitive" } },
          });

          if (!product) {
            product = await prisma.product.create({
              data: {
                id: randomUUID(),
                name: productName,
                updatedAt: new Date(),
              },
            });
          }

          const satuan = Number((product as any).satuanKg ?? 1) || 1;
          let pcs = Number(row[keyPcs]) || 0;
          let hargaPcs = Number(row[keyHargaPcs]) || 0;
          const kgRaw = Number(row[keyKg]) || 0;
          const hargaKgRaw = Number(row[keyHargaKg]) || 0;
          if (!pcs && kgRaw && satuan > 0) {
            pcs = kgRaw / satuan;
          }
          if (!hargaPcs && hargaKgRaw && satuan > 0) {
            hargaPcs = hargaKgRaw * satuan;
          }
          pcs = Math.round(pcs);
          const pcsKirim = Math.round(Number(row[keyPcsKirim]) || 0);
          const hargaKg = satuan > 0 ? hargaPcs / satuan : 0;
          const nominal = hargaPcs * pcs;
          const rpTagih =
            Number(row[keyRpTagih]) ||
            (hargaPcs && pcsKirim ? hargaPcs * pcsKirim : 0);

          await prisma.purchaseOrderItem.create({
            data: {
              id: randomUUID(),
              purchaseOrderId: po.id,
              productId: product.id,
              pcs,
              pcsKirim,
              hargaKg,
              hargaPcs,
              nominal,
              rpTagih,
            },
          });
        }

        successCount += rows.length;
      } catch (err: any) {
        console.error(`PO ${noPo} error:`, err.message);
        errors.push(`PO ${noPo} (Row ~${rowNum}): ${err.message}`);
      }
    }

    return NextResponse.json({
      count: successCount,
      errors,
      message: `Processed ${successCount} item records.`,
      addedPoCount,
      duplicatePOs,
      missingCounts,
      replacedPoCount: replaceDuplicates ? duplicatePOs.length : 0,
    });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
