"use client";

import {
  FileText,
  Package,
  Truck,
  CheckCircle2,
  ExternalLink,
  Eye,
} from "lucide-react";
import Modal from "./modal";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

type POData = {
  id: string;
  noPo: string;
  company: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  inisial?: string | null;
  tglPo: string;
  tglKirim?: string | null;
  expiredTgl: string | null;
  linkPo: string | null;
  noInvoice: string | null;
  noFaktur: string | null;
  siteArea: string | null;
  regional: string | null;
  tujuanDetail: string | null;
  namaSupir?: string | null;
  platNomor?: string | null;
  buktiTagih?: string | null;
  buktiBayar?: string | null;
  buktiKirim?: string | null;
  buktiFp?: string | null;
  Items: {
    id: string;
    namaProduk?: string;
    pcs: number;
    pcsKirim: number;
    pcsKirimNum?: number;
    hargaPcs: number;
    discount?: number | string;
    diskon?: number | string;
    discountNum?: number | string;
    nominal: number;
    rpTagih: number;
    Product: {
      name: string;
      satuanKg?: number;
    };
  }[];
  status: {
    kirim: boolean;
    sdif: boolean;
    po: boolean;
    fp: boolean;
    kwi: boolean;
    inv: boolean;
    tagih: boolean;
    bayar: boolean;
  };
  remarks: string | null;
  RitelModern?: {
    namaPt?: string;
    inisial?: string;
  };
  UnitProduksi?: {
    siteArea?: string;
    namaRegional?: string;
  };
  tglkirim?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: POData | null;
};

export default function PODetailModal({ open, onClose, data }: Props) {
  const router = useRouter();
  if (!data) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (val: number | string | undefined) => {
    if (!val) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(val));
  };

  const formatLocation = (loc?: string | null) => {
    if (
      !loc ||
      loc.toLowerCase() === "unknown" ||
      loc.toLowerCase().includes("unit produksi")
    )
      return "-";
    return loc;
  };

  const renderStatus = (label: string, isChecked: boolean) => (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${isChecked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
    >
      <CheckCircle2
        size={14}
        className={isChecked ? "text-emerald-500" : "text-slate-300"}
      />
      {label}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail PO - ${data.noPo}`}
      className="max-w-5xl"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Company / Ritel
            </p>
            <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
              {data.company || data.RitelModern?.namaPt || "-"}
              {(data.RitelModern?.inisial || data.inisial) && (
                <span className="text-indigo-500 text-sm font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  [{data.RitelModern?.inisial || data.inisial}]
                </span>
              )}
              <span className="text-[9px] text-slate-300 font-normal lowercase tracking-tighter">rev.2.1</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/purchase-order/${encodeURIComponent(data.company)}`);
            }}
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            Lihat Histori PO <ExternalLink size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kolom 1: Referensi & Area */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText size={16} className="text-indigo-600" />
              <h3 className="font-bold text-slate-700 text-sm">
                Referensi & Lokasi
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  No PO
                </p>
                <p className="font-bold text-slate-800 text-xs">{data.noPo}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  No Invoice
                </p>
                <p className="font-bold text-indigo-700 text-xs">
                  {data.noInvoice || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  No Faktur Penjualan
                </p>
                <p className="font-bold text-teal-600 text-xs text-wrap">
                  {data.noFaktur || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Regional
                </p>
                <p className="font-semibold text-slate-800 text-xs text-wrap">
                  {formatLocation(data.regional || data.UnitProduksi?.namaRegional)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Site Area
                </p>
                <p className="font-semibold text-slate-800 text-xs">
                  {formatLocation(data.siteArea || data.UnitProduksi?.siteArea)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Tujuan Detail
                </p>
                <p className="font-semibold text-slate-800 text-xs">
                  {data.tujuanDetail || "-"}
                </p>
              </div>
            </div>
          </section>

          {/* Kolom 2: Timeline & Status */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CheckCircle2 size={16} className="text-amber-600" />
              <h3 className="font-bold text-slate-700 text-sm">
                Timeline & Dokumen
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Tgl PO
                </p>
                <p className="font-semibold text-slate-800 text-xs">
                  {formatDate(data.tglPo)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Tgl Kirim
                </p>
                <p className="font-bold text-amber-600 text-xs">
                  {formatDate(data.tglKirim || data.tglkirim)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Due Date
                </p>
                <p className="font-bold text-rose-600 text-xs">
                  {formatDate(data.expiredTgl)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  File PO
                </p>
                {data.linkPo ? (
                  <a
                    href={data.linkPo}
                    target="_blank"
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Buka PDF
                  </a>
                ) : (
                  <span className="text-xs">-</span>
                )}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Bukti Tagih
                </p>
                <p
                  className="font-semibold text-slate-800 text-xs truncate"
                  title={data.buktiTagih || ""}
                >
                  {data.buktiTagih || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Bukti Bayar
                </p>
                <p
                  className="font-semibold text-slate-800 text-xs truncate"
                  title={data.buktiBayar || ""}
                >
                  {data.buktiBayar || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Bukti Kirim
                </p>
                <p
                  className="font-semibold text-slate-800 text-xs truncate"
                  title={data.buktiKirim || ""}
                >
                  {data.buktiKirim || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Bukti FP
                </p>
                <p
                  className="font-semibold text-slate-800 text-xs truncate"
                  title={data.buktiFp || ""}
                >
                  {data.buktiFp || "-"}
                </p>
              </div>
            </div>
          </section>

          {/* Kolom 3: Logistik & Ekspedisi */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Truck size={16} className="text-sky-600" />
              <h3 className="font-bold text-slate-700 text-sm">
                Logistik Ekspedisi
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-y-3 text-sm">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Nama Supir
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {data.namaSupir || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Plat Nomor
                </p>
                <p className="font-bold text-slate-800 text-xs uppercase">
                  {data.platNomor || "-"}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                  Checklist Progress
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {renderStatus("Delivery (Kirim)", data.status?.kirim)}
                  {renderStatus("SDIF", data.status?.sdif)}
                  {renderStatus("PO Document", data.status?.po)}
                  {renderStatus("Faktur Pajak (FP)", data.status?.fp)}
                  {renderStatus("Kwitansi (KWI)", data.status?.kwi)}
                  {renderStatus("Invoice (INV)", data.status?.inv)}
                  {renderStatus("Penagihan (Tagih)", data.status?.tagih)}
                  {renderStatus("Pembayaran (Bayar)", data.status?.bayar)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Tabel Items Full */}
        <section className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-emerald-600" />
            <h3 className="font-bold text-slate-700 text-sm">
              Rincian Items ({data.Items?.length || 0})
            </h3>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Nama Produk</th>
                  <th className="px-4 py-3 text-right">PCS</th>
                  <th className="px-4 py-3 text-right text-amber-700">Kirim</th>
                  <th className="px-4 py-3 text-right">Harga/Pcs</th>
                  <th className="px-4 py-3 text-right text-rose-600">Diskon</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3 text-right text-indigo-700">
                    Rp Tagih
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.Items?.map((item, idx) => {
                  const orderPcs = Math.max(1, Number(item.pcs) || 0);
                  const shipped = Number(item.pcsKirim || item.pcsKirimNum || 0);
                  const hargaPcs = Number(item.hargaPcs) || 0;
                  
                  // Helper robust parsing untuk diskon (menangani string berformat atau number)
                  const parseVal = (v: any) => {
                    if (typeof v === "number" && !isNaN(v)) return v;
                    const clean = String(v || "").replace(/[^0-9]/g, "");
                    return Number(clean) || 0;
                  };

                  const rawDiscount = item.discount ?? item.diskon ?? item.discountNum ?? 0;
                  const itemDiscountBase = parseVal(rawDiscount);
                  
                  // Perhitungan Aktual berdasarkan Pcs Kirim (Actual = Base / OrderPcs * Shipped)
                  const actualNominal = hargaPcs * shipped; // Gross Aktual
                  
                  // NEW: Cek jika rpTagih di DB sudah ada dan selisihnya logis, gunakan itu sebagai backup diskon
                  const dbRpTagih = Number(item.rpTagih) || 0;
                  let actualDiscount = orderPcs > 0 ? (itemDiscountBase / orderPcs) * shipped : 0; 
                  
                  // Jika di data item.rpTagih ada dlm DB tapi actualDiscount kita 0, coba cari selisihnya
                  if (Math.round(actualDiscount) === 0 && dbRpTagih > 0 && dbRpTagih < actualNominal) {
                    actualDiscount = actualNominal - dbRpTagih;
                  }

                  // [SMART RECONSTRUCTION]
                  // Jika itemDiscountBase kosong tapi kita punya actualDiscount (dari fallback),
                  // kita hitung mundur Diskon Master-nya agar icon Eye bisa muncul.
                  let finalDiscountBase = itemDiscountBase;
                  if (finalDiscountBase === 0 && actualDiscount > 0 && orderPcs > 0 && shipped > 0) {
                    finalDiscountBase = (actualDiscount / shipped) * orderPcs;
                  }

                  const actualRpTagih = Math.max(0, Math.round(actualNominal - actualDiscount));

                  return (
                    <tr
                      key={item.id || idx}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-slate-800 text-xs">
                          {item.Product?.name || item.namaProduk}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs text-center font-medium">
                        {orderPcs}
                      </td>
                      <td className="px-4 py-2.5 text-amber-600 text-xs text-center font-bold">
                        {shipped}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 text-xs font-medium">
                        {formatCurrency(hargaPcs)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-rose-500 font-bold">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{Math.round(actualDiscount) > 0 ? formatCurrency(Math.round(actualDiscount)) : "-"}</span>
                          {finalDiscountBase > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                Swal.fire({
                                  title: "<strong>INFO DISKON AWAL</strong>",
                                  icon: "info",
                                  html: `
                                    <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                                      <div style="margin-bottom: 8px;"><b>Produk:</b> <br/><span style="color: #64748b">${item.Product?.name || item.namaProduk}</span></div>
                                      <div style="margin-bottom: 8px;"><b>Diskon Master (100%):</b> <br/><span style="color: #e11d48; font-weight: 800; font-size: 16px;">${formatCurrency(finalDiscountBase)}</span></div>
                                      <div><b>Untuk Qty Total:</b> <br/><span style="color: #64748b">${item.pcs} PCS</span></div>
                                      <div style="margin-top: 10px; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; pt-2;">* Direkonstruksi dari Rp Tagih</div>
                                    </div>
                                  `,
                                  confirmButtonText: "Tutup",
                                  confirmButtonColor: "#004a87",
                                  customClass: {
                                    container: "z-[999999]",
                                    popup: "rounded-[24px]"
                                  }
                                });
                              }}
                              className="p-1 hover:bg-rose-50 rounded-md transition-all group/eye"
                              title="Klik untuk lihat diskon awal"
                            >
                              <Eye 
                                size={14} 
                                className="text-slate-300 group-hover/eye:text-rose-400 transition-colors"
                              />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {formatCurrency(actualNominal)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-indigo-700">
                        {formatCurrency(actualRpTagih)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-right font-black text-slate-500 uppercase tracking-wider text-[11px]"
                  >
                    Total Tagihan
                  </td>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-right font-black text-slate-900 text-sm"
                  >
                    {formatCurrency(
                      data.Items?.reduce((acc, curr) => {
                        const ord = Math.max(1, Number(curr.pcs) || 0);
                        const shp = Number(curr.pcsKirim || curr.pcsKirimNum || 0);
                        const hrg = Number(curr.hargaPcs) || 0;
                        const nom = hrg * shp;
                        
                        const parseV = (v: any) => {
                          if (typeof v === "number" && !isNaN(v)) return v;
                          return Number(String(v || "").replace(/[^0-9]/g, "")) || 0;
                        };

                        const dBase = parseV(curr.discount ?? curr.diskon ?? curr.discountNum ?? 0);
                        const dbRpT = Number(curr.rpTagih) || 0;
                        
                        let actDisc = ord > 0 ? (dBase / ord) * shp : 0;
                        // Fallback jika diskon master kosong tapi rpTagih ada selisih
                        if (Math.round(actDisc) === 0 && dbRpT > 0 && dbRpT < nom) {
                          actDisc = nom - dbRpT;
                        }
                        
                        return acc + Math.max(0, Math.round(nom - actDisc));
                      }, 0) || 0,
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </Modal>
  );
}
