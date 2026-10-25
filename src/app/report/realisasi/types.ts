import { FormRowItem, OptionRitel } from "./components/RealisasiFormModal";

export type { FormRowItem, OptionRitel };

export interface RealisasiRecordItem {
  id?: string;
  ritelId: string | null;
  companyName: string;
  provinsi: string;
  namaRitel: string;
  logoUrl: string | null;
  volumeKg: number;
  urutan: number;
}

export interface RealisasiRecord {
  id: string;
  tanggal: string | Date;
  tanggalAkhir?: string | Date | null;
  daftarTanggal?: string[];
  judul?: string;
  subjudul?: string;
  sumberCatatan?: string;
  daftarRegional?: string;
  items?: RealisasiRecordItem[];
}

export const formatDateToYYYYMMDD = (d: any): string => {
  if (!d) return "";
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (d.includes("T")) {
      const part = d.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
    }
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fallbackSampleData = {
  tanggal: new Date("2026-09-07"),
  judul: "PROGRES PEMENUHAN RITEL MODERN",
  subjudul: "REALISASI PELAYANAN 7 SEPTEMBER 2026",
  sumberCatatan: "Sumber: Realisasi Pelayanan UB Industri, Senin 7 September 2026.",
  items: [
    { namaRitel: "HYPERMART", volumeKg: 10000, provinsi: "JABODETABEK" },
    { namaRitel: "THE FOODHALL", volumeKg: 6000, provinsi: "JABODETABEK" },
    { namaRitel: "BORMA", volumeKg: 15000, provinsi: "JAWA BARAT" },
    { namaRitel: "YOGYA SWALAYAN", volumeKg: 10000, provinsi: "JAWA BARAT" },
    { namaRitel: "ANEKA JAYA", volumeKg: 1700, provinsi: "JAWA TENGAH" },
    { namaRitel: "LARIS", volumeKg: 6000, provinsi: "JAWA TENGAH" },
    { namaRitel: "GOORI", volumeKg: 2300, provinsi: "JAWA TENGAH" },
    { namaRitel: "ADA SWALAYAN", volumeKg: 13600, provinsi: "JAWA TENGAH" },
    { namaRitel: "ALFAMIDI", volumeKg: 19850, provinsi: "JAWA TIMUR" },
    { namaRitel: "INDOMARET", volumeKg: 29590, provinsi: "JAWA TENGAH" },
    { namaRitel: "SATUSAMA", volumeKg: 800, provinsi: "SULAWESI SELATAN" },
    { namaRitel: "MISI SWALAYAN", volumeKg: 1125, provinsi: "SULAWESI SELATAN" },
  ],
};
