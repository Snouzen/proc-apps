export type ItemPO = {
  id: string;
  namaProduk: string;
  pcs: number | string;
  pcsKirim: number | string;
  hargaPcs: number | string;
  discount: number;
  kg?: number;
  kgKirim?: number;
  hargaKg: number;
  nominal: number;
  rpTagih: number;
};

export type StatusDoc = {
  kirim: boolean;
  sdif: boolean;
  po: boolean;
  fp: boolean;
  kwi: boolean;
  inv: boolean;
  tagih: boolean;
  bayar: boolean;
};

export const INITIAL_STATUS: StatusDoc = {
  kirim: false,
  sdif: false,
  po: false,
  fp: false,
  kwi: false,
  inv: false,
  tagih: false,
  bayar: false,
};

export const INITIAL_FORM = {
  company: "",
  inisial: "",
  regional: "",
  noPo: "",
  tglPo: "",
  linkPo: "",
  expiredTgl: "",
  tglKirim: "",
  siteArea: "",
  noInvoice: "",
  tujuan: "",
  status: { ...INITIAL_STATUS },
  remarks: "",
  buktiTagih: "",
  buktiBayar: "",
  buktiKirim: "",
  buktiFp: "",
};
