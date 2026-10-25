export interface Promo {
  id: string;
  nomor: string;
  linkDocs?: string;
  kegiatan: string;
  periode: string;
  tanggal: string;
  dpp: number;
  ppn: number;
  pph: number;
  total: number;
  linkFP?: string;
  ritelId?: string;
  remarks?: string;
}

export interface PromoFormData {
  nomor: string;
  linkDocs: string;
  kegiatan: string;
  periode: string;
  tanggal: string;
  dpp: number;
  ppn: number;
  pph: number;
  linkFP: string;
  ritelId: string;
  remarks: string;
}
