export const EXPECTED_HEADERS = [
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
  "discount",
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

export const norm = (s: string) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export const findKey = (obj: any, aliases: string[]): string | null => {
  const targets = aliases.map(norm);
  for (const k of Object.keys(obj || {})) {
    if (targets.includes(norm(k))) return k;
  }
  return null;
};

export interface BulkColumnKeys {
  keyNoPo: string;
  keyTglPo: string;
  keyLinkPo: string;
  keyExpired: string;
  keyTglKirim: string;
  keySiteArea: string;
  keyNoInvoice: string;
  keyTujuan: string;
  keyNamaProduk: string;
  keyKg: string;
  keyPcs: string;
  keyHargaKg: string;
  keyHargaPcs: string;
  keyDiscount: string;
  keyNominal: string;
  keyKirim: string;
  keyPcsKirim: string;
  keyRpTagih: string;
  keySdif: string;
  keyStatusPo: string;
  keyStatusFp: string;
  keyStatusKwi: string;
  keyStatusInv: string;
  keyStatusTagih: string;
  keyStatusBayar: string;
  keyCompany: string;
  keyInisial: string;
}

export function detectBulkColumnKeys(sample: any): BulkColumnKeys {
  return {
    keyNoPo: findKey(sample, ["Nomor PO", "No PO", "NO PO", "NOPO"]) || "Nomor PO",
    keyTglPo: findKey(sample, ["Tanggal PO", "TGL PO", "TanggalPO"]) || "Tanggal PO",
    keyLinkPo: findKey(sample, ["Link PO", "Link DOC", "Link Dokumen"]) || "Link PO",
    keyExpired:
      findKey(sample, ["Tanggal Expired PO", "TGL EXP", "Expired PO"]) ||
      "Tanggal Expired PO",
    keyTglKirim:
      findKey(sample, ["Tanggal Kirim", "TGL KIRIM", "Tgl Kirim", "TanggalKirim"]) ||
      "Tanggal Kirim",
    keySiteArea:
      findKey(sample, [
        "Site Area",
        "Unit Produks",
        "Unit Produksi",
        "UNIT PRODUKS",
        "UNIT PRODUKSI",
      ]) || "Site Area",
    keyNoInvoice:
      findKey(sample, ["Nomor Invoice", "No Inv", "NO INV", "Invoice No"]) ||
      "Nomor Invoice",
    keyTujuan:
      findKey(sample, ["Tujuan", "Tujuan Kirim", "TUJUAN KIRIM"]) || "Tujuan",
    keyNamaProduk:
      findKey(sample, ["Nama Produk", "Produk", "Product"]) || "Nama Produk",
    keyKg: findKey(sample, ["kg", "KG", "QTY KG", "SATUAN KG", "KILOGRAM"]) || "kg",
    keyPcs: findKey(sample, ["pcs", "PCS", "QTY PCS", "QTY", "QUANTITY"]) || "pcs",
    keyHargaKg:
      findKey(sample, ["harga per kg", "RP/KG", "RP KG", "HARGA KG", "HARGA/KG"]) ||
      "harga per kg",
    keyHargaPcs:
      findKey(sample, ["harga per pcs", "RP/PCS", "RP PCS", "HARGA SATUAN", "HARGA PCS"]) ||
      "harga per pcs",
    keyDiscount:
      findKey(sample, ["discount", "diskon", "potongan", "PROMO", "TOTAL PROMO"]) ||
      "discount",
    keyNominal:
      findKey(sample, ["nominal", "NOMINAL", "TOTAL NOMINAL", "AMOUNT", "TOTAL", "DPP"]) ||
      "nominal",
    keyKirim: findKey(sample, ["kirim", "KIRIM"]) || "kirim",
    keyPcsKirim:
      findKey(sample, ["pcs kirim", "PCS KIRIM"]) || "pcs kirim",
    keyRpTagih:
      findKey(sample, ["rp tagih", "RP TAGIH", "Total"]) || "rp tagih",
    keySdif: findKey(sample, ["SDI/F", "SDIF", "SDI F"]) || "SDI/F",
    keyStatusPo: findKey(sample, ["PO"]) || "PO",
    keyStatusFp: findKey(sample, ["FP"]) || "FP",
    keyStatusKwi: findKey(sample, ["KWI", "KWITANSI"]) || "KWI",
    keyStatusInv: findKey(sample, ["Inv", "INVOICE"]) || "Inv",
    keyStatusTagih: findKey(sample, ["Tagih"]) || "Tagih",
    keyStatusBayar: findKey(sample, ["Bayar", "Pembayaran"]) || "Bayar",
    keyCompany:
      findKey(sample, ["Nama Company", "Nama PT", "Company"]) || "Nama Company",
    keyInisial: findKey(sample, ["Inisial", "Initial"]) || "Inisial",
  };
}

export function computeMissingCounts(body: any[]): Record<string, number> {
  const missingCounts: Record<string, number> = {};
  for (const h of EXPECTED_HEADERS) missingCounts[h] = 0;
  for (const row of body) {
    for (const h of EXPECTED_HEADERS) {
      const v = (row as any)[h];
      if (v === undefined || v === null || String(v).trim() === "") {
        missingCounts[h] = (missingCounts[h] || 0) + 1;
      }
    }
  }
  return missingCounts;
}

export const dateOnlyUtcNoon = (y: number, m0: number, d1: number) =>
  new Date(Date.UTC(y, m0, d1, 12, 0, 0, 0));

export const tzOffsetHours = 7;

export const normalizeToUtcNoonFromOffset = (date: Date) => {
  const shifted = new Date(date.getTime() + tzOffsetHours * 3600 * 1000);
  return dateOnlyUtcNoon(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
};

export const parseBulkDate = (d: any): Date | null => {
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
    if (/^\d{4,6}(\.\d+)?$/.test(s)) {
      const serialNum = Number(s);
      if (serialNum >= 30000 && serialNum <= 70000) {
        const days = Math.floor(serialNum);
        const utc = new Date((days - 25569) * 86400 * 1000);
        if (!isNaN(utc.getTime())) {
          return dateOnlyUtcNoon(
            utc.getUTCFullYear(),
            utc.getUTCMonth(),
            utc.getUTCDate(),
          );
        }
      }
    }
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

export const parseBool = (val: any) => String(val).toUpperCase() === "TRUE";

export const safeDebugVal = (v: any) => {
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
