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

export const ItemSchema = z
  .object({
    namaProduk: z.string().min(1),
    pcs: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) || 0 : v)),
    pcsKirim: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) || 0 : v))
      .optional(),
    hargaPcs: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) || 0 : v)),
    discount: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) || 0 : v))
      .optional(),
  })
  .strip();

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
  })
  .strip();
