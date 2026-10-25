import { NdFormData } from "@/lib/generateNdWord";

export interface FieldConfig {
  key: keyof Omit<NdFormData, "list_piutang">;
  label: string;
  placeholder: string;
  group: string;
  type?: "text" | "textarea";
}

export const fieldConfigs: FieldConfig[] = [
  // Header
  {
    key: "nomor_surat",
    label: "Nomor Surat",
    placeholder: "/DB602/07/2026",
    group: "Header Surat",
  },
  {
    key: "det_perihal",
    label: "Perihal",
    placeholder: "Permohonan Persetujuan Pembukaan Credit Limit...",
    group: "Header Surat",
    type: "textarea",
  },
  // Realisasi Penjualan
  {
    key: "tgl_input",
    label: "Tanggal Input",
    placeholder: "29 Juni 2026",
    group: "Realisasi Penjualan",
  },
  {
    key: "nominal_teks_1",
    label: "Realisasi Penjualan UB Industri",
    placeholder: "Rp650 Miliar",
    group: "Realisasi Penjualan",
  },
  {
    key: "nominal_teks",
    label: "Kontribusi Penjualan Ritel Modern",
    placeholder: "Rp368,31 Miliar",
    group: "Realisasi Penjualan",
  },
  {
    key: "percentage",
    label: "Persentase Kontribusi",
    placeholder: "(56,66%)",
    group: "Realisasi Penjualan",
  },
  {
    key: "qty",
    label: "Qty (Ton)",
    placeholder: "28.912",
    group: "Realisasi Penjualan",
  },
  // Posisi Piutang
  {
    key: "nominal_teks_2",
    label: "Total Piutang Eksternal",
    placeholder: "Rp149,74 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_3",
    label: "Piutang < 30 Hari",
    placeholder: "Rp137,39 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_4",
    label: "Piutang > 30 Hari",
    placeholder: "Rp12,35 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_5",
    label: "Belum Bank Reconcile",
    placeholder: "Rp54,89 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_6",
    label: "Saldo Piutang Bersih",
    placeholder: "Rp94,85 Miliar",
    group: "Posisi Piutang",
  },
];

export function groupFields(fields: FieldConfig[]): Record<string, FieldConfig[]> {
  const grouped: Record<string, FieldConfig[]> = {};
  for (const f of fields) {
    if (!grouped[f.group]) grouped[f.group] = [];
    grouped[f.group].push(f);
  }
  return grouped;
}
