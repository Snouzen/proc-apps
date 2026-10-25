export type ReturnMode = "full" | "summary";

export interface POEditModalProps {
  open: boolean;
  onClose: () => void;
  noPo: string | null;
  returnMode?: ReturnMode;
  onSaved?: (updated: any) => void;
}

export interface EditItem {
  id: string;
  namaProduk: string;
  pcs: number | string;
  pcsKirim: number | string;
  hargaPcs: number | string;
  discount: number | string;
}

export interface POStatus {
  kirim: boolean;
  sdif: boolean;
  po: boolean;
  fp: boolean;
  kwi: boolean;
  inv: boolean;
  tagih: boolean;
  bayar: boolean;
}
