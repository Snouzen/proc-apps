import { z } from "zod";

export const StatusSchema = z
  .object({
    kirim: z.boolean().optional(),
    sdif: z.boolean().optional(),
    po: z.boolean().optional(),
    fp: z.boolean().optional(),
    kwi: z.boolean().optional(),
    inv: z.boolean().optional(),
    tagih: z.boolean().optional(),
    bayar: z.boolean().optional(),
  })
  .strip()
  .optional();

function parseStrictFiniteNumber(val: unknown): number | null {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^(?:infinity|-infinity|nan)$/i.test(trimmed)) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export const ItemSchema = z
  .object({
    id: z.string().optional().nullable(),
    namaProduk: z.string().min(1, "Nama produk wajib diisi"),
    pcs: z
      .union([z.number(), z.string()])
      .refine((v) => parseStrictFiniteNumber(v) !== null, {
        message: "Jumlah pcs harus berupa angka numerik yang valid",
      })
      .transform((v) => parseStrictFiniteNumber(v)!)
      .refine((v) => Number.isInteger(v) && v > 0, {
        message: "Jumlah pcs harus berupa bilangan bulat positif (> 0)",
      }),
    pcsKirim: z
      .union([z.number(), z.string()])
      .refine((v) => parseStrictFiniteNumber(v) !== null, {
        message: "Jumlah pcsKirim harus berupa angka numerik yang valid",
      })
      .transform((v) => parseStrictFiniteNumber(v)!)
      .refine((v) => Number.isInteger(v) && v >= 0, {
        message: "Jumlah pcsKirim harus berupa bilangan bulat non-negatif (>= 0)",
      })
      .optional(),
    hargaPcs: z
      .union([z.number(), z.string()])
      .refine((v) => parseStrictFiniteNumber(v) !== null, {
        message: "Harga per pcs harus berupa angka numerik yang valid",
      })
      .transform((v) => parseStrictFiniteNumber(v)!)
      .refine((v) => Number.isFinite(v) && v >= 0, {
        message: "Harga per pcs tidak boleh negatif",
      }),
    discount: z
      .union([z.number(), z.string()])
      .refine((v) => parseStrictFiniteNumber(v) !== null, {
        message: "Diskon harus berupa angka numerik yang valid",
      })
      .transform((v) => parseStrictFiniteNumber(v)!)
      .refine((v) => Number.isFinite(v) && v >= 0, {
        message: "Diskon tidak boleh negatif",
      })
      .optional(),
  })
  .strip()
  .refine(
    (data) => {
      if (data.pcsKirim !== undefined && data.pcsKirim !== null) {
        return data.pcsKirim <= data.pcs;
      }
      return true;
    },
    {
      message: "pcsKirim tidak boleh melebihi jumlah pcs pesanan",
      path: ["pcsKirim"],
    }
  )
  .refine(
    (data) => {
      if (data.discount !== undefined && data.discount !== null) {
        const maxDiscount = data.hargaPcs * data.pcs;
        return data.discount <= maxDiscount;
      }
      return true;
    },
    {
      message: "Diskon tidak boleh melebihi total nilai item (hargaPcs * pcs)",
      path: ["discount"],
    }
  );

export const POBodySchema = z
  .object({
    company: z.string().min(1),
    inisial: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    siteArea: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    tujuan: z.string().min(1),
    noPo: z.string().min(1),
    originalNoPo: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    tglPo: z.string().min(1),
    expiredTgl: z.string().min(1),
    linkPo: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    noInvoice: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    items: z.array(ItemSchema).min(1),
    remarks: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    status: StatusSchema,
    regional: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional(),
    ),
    tglKirim: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    buktiTagih: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    buktiBayar: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    buktiKirim: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    buktiFp: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    namaSupir: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    platNomor: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    updatedAt: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    id: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    expectedVersion: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
    lastUpdatedAt: z.preprocess(
      (v) =>
        v == null || String(v).trim() === "" ? undefined : String(v).trim(),
      z.string().optional().nullable(),
    ),
  })
  .strip();
