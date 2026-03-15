"use client";

import { FileText, Package, X, ExternalLink } from "lucide-react";
import Modal from "./modal";
import { useRouter } from "next/navigation";

type POData = {
  id: string;
  noPo: string;
  company: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  tglPo: string;
  expiredTgl: string | null;
  linkPo: string | null;
  noInvoice: string | null;
  siteArea: string;
  tujuanDetail: string | null;
  regional: string | null;
  Items: {
    id: string;
    pcs: number;
    pcsKirim: number;
    hargaPcs: number;
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: POData | null;
};

export default function PODetailModal({ open, onClose, data }: Props) {
  const router = useRouter();
  if (!data) return null;

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail PO - ${data.noPo} (${data.Items?.length || 0} Items)`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Company
            </p>
            <h2 className="text-lg font-bold text-slate-800 uppercase">
              {data.company}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/company/${encodeURIComponent(data.company)}`);
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            title="Lihat semua PO untuk company ini"
          >
            View all PO <ExternalLink size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-700">Data Referensi</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  No PO
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {data.noPo}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  No Invoice
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {data.noInvoice || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Submit Date
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {formatDateTime(
                    data.createdAt || data.updatedAt || data.tglPo,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Tgl PO
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {formatDate(data.tglPo)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Expired
                </p>
                <p className="font-medium text-red-600 uppercase">
                  {formatDate(data.expiredTgl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Site Area
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {data.siteArea}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Regional
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {data.regional || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Tujuan
                </p>
                <p className="font-medium text-slate-800 uppercase">
                  {data.tujuanDetail || "-"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Link PO
                </p>
                {data.linkPo ? (
                  <a
                    href={data.linkPo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {data.linkPo}
                  </a>
                ) : (
                  <p className="font-medium text-slate-800">-</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Package size={18} className="text-emerald-600" />
              <h3 className="font-bold text-slate-700">Kuantitas & Harga</h3>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3 text-right">Pcs / Kirim</th>
                    <th className="px-4 py-3 text-right">Harga/Pcs</th>
                    <th className="px-4 py-3 text-right">Total Tagih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.Items?.slice(0, 5).map((item, idx) => (
                    <tr
                      key={item.id || `${item?.Product?.name || "item"}-${idx}`}
                      className="group hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {item.Product.name}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {item.pcs} /{" "}
                        <span className="text-blue-600 font-bold">
                          {item.pcsKirim}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(item.hargaPcs)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {formatCurrency(item.rpTagih)}
                      </td>
                    </tr>
                  ))}
                  {data.Items && data.Items.length > 5 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-center bg-slate-50/50"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push(
                              `/company/${encodeURIComponent(data.company)}`,
                            );
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center justify-center gap-1"
                          title="Lihat semua PO untuk company ini"
                        >
                          View All ({data.Items.length - 5} more items){" "}
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right font-black text-slate-500 uppercase tracking-wider text-xs"
                    >
                      Total Grand Tagihan
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800 text-base">
                      {formatCurrency(
                        data.Items?.reduce(
                          (acc, curr) => acc + curr.rpTagih,
                          0,
                        ) || 0,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        {data.remarks && (
          <section className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-500 font-bold uppercase mb-1">
              Remarks
            </p>
            <p className="text-sm text-slate-700">{data.remarks}</p>
          </section>
        )}
      </div>
    </Modal>
  );
}
