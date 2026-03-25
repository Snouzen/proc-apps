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
  .optional();

export const ItemSchema = z.object({
  namaProduk: z.string().min(1),
  pcs: z.union([z.number(), z.string()]).transform((v) =>
    typeof v === "string" ? Number(v) || 0 : v,
  ),
  pcsKirim: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) || 0 : v))
    .optional(),
  hargaPcs: z.union([z.number(), z.string()]).transform((v) =>
    typeof v === "string" ? Number(v) || 0 : v,
  ),
  discount: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) || 0 : v))
    .optional(),
});

export const POBodySchema = z.object({
  company: z.string().min(1),
  inisial: z.string().optional(),
  siteArea: z.string().optional(),
  tujuan: z.string().min(1),
  noPo: z.string().min(1),
  originalNoPo: z.string().optional(),
  tglPo: z.string().min(1),
  expiredTgl: z.string().min(1),
  linkPo: z.string().url().optional(),
  noInvoice: z.string().optional(),
  items: z.array(ItemSchema).min(1),
  remarks: z.string().optional(),
  status: StatusSchema,
  regional: z.string().optional(),
});
