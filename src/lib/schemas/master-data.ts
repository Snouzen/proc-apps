import { z } from "zod";

/** Helper: accept number or numeric string, coerce to number */
const coerceNumber = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) || 0 : v));

// ── Ritel Modern Schemas ──

export const RitelCreateSchema = z.object({
  namaPt: z.string().min(1, "namaPt wajib diisi").transform((v) => v.trim()),
  inisial: z.string().nullable().optional(),
  tujuan: z.string().nullable().optional(),
});

export const RitelPatchSchema = z.object({
  id: z.string().optional(),
  namaPt: z.string().min(1, "namaPt wajib diisi").transform((v) => v.trim()),
  newNamaPt: z.string().optional().transform((v) => v?.trim()),
  inisial: z.string().nullable().optional(),
  newInisial: z.string().nullable().optional(),
  logoPt: z.string().nullable().optional(),
  logoInisial: z.string().nullable().optional(),
});

// ── Product Schemas ──

export const ProductCreateSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  satuanKg: z.number().positive().optional().nullable(),
});

export const ProductUpdateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  satuanKg: z.number().positive().optional().nullable(),
}).refine((d) => d.id || d.name, {
  message: "Wajib menyertakan id atau name",
});

// ── Promo Schemas ──

const PromoBaseSchema = z.object({
  nomor: z.string().min(1, "Nomor wajib diisi"),
  linkDocs: z.string().nullable().optional(),
  kegiatan: z.string().min(1, "Kegiatan wajib diisi"),
  periode: z.string().min(1, "Periode wajib diisi"),
  tanggal: z.string().or(z.date()),
  dpp: coerceNumber,
  ppn: coerceNumber,
  pph: coerceNumber.optional().default(0),
  linkFP: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  ritelId: z.string().nullable().optional(),
});

export const PromoCreateSchema = PromoBaseSchema;

export const PromoUpdateSchema = PromoBaseSchema.extend({
  id: z.string().min(1, "ID wajib diisi"),
});

export const PromoBatchSchema = z.array(
  z.object({
    nomor: z.string().default(""),
    linkDocs: z.string().nullable().optional(),
    kegiatan: z.string().default("Lain-Lain"),
    periode: z.string().default("Januari"),
    tanggal: z.string().or(z.date()).optional(),
    dpp: coerceNumber.optional().default(0),
    ppn: coerceNumber.optional().default(0),
    pph: coerceNumber.optional().default(0),
    linkFP: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
    ritelId: z.string().nullable().optional(),
  }),
);

// ── Unit Produksi Schemas ──

export const UnitProduksiCreateSchema = z.object({
  regional: z.string().min(1, "Regional wajib diisi"),
  siteArea: z.string().default(""),
  alamat: z.string().optional(),
});

export const UnitProduksiPatchSchema = z.object({
  namaRegional: z.string().min(1),
  siteArea: z.string().min(1),
  newRegionalName: z.string().optional(),
  newSiteArea: z.string().min(1, "newSiteArea wajib diisi"),
  alamat: z.string().optional(),
});
