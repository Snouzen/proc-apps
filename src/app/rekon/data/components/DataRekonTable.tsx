import React, { Fragment, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, 
  Receipt, 
  FileText, 
  RotateCcw, 
  ArrowRightCircle, 
  Percent, 
  FileSpreadsheet, 
  Paperclip, 
  Eye, 
  Trash2,
  CircleDollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { createColumnHelper } from "@tanstack/react-table";

const helper = createColumnHelper<any>();

export default function DataRekonTable({ hook }: { hook: any }) {
  const router = useRouter();
  const {
    data,
    loading,
    page,
    setPage,
    limit,
    setLimit,
    total,
    expandedRows,
    setBuktiBayarPreviewUrl,
    toggleRow,
    formatRp,
    handleDelete,
    handleRowExport
  } = hook;

  const columns = useMemo(() => [
    helper.display({
      id: "expander",
      header: "",
      size: 50,
      cell: ({ row }) => {
        const item = row.original;
        const isExpanded = expandedRows.has(item.id);
        return (
          <div className="flex items-center justify-center">
             <button
                onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
                <ChevronRight 
                  size={14} 
                  className={`text-slate-950 dark:text-slate-300 font-black transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-500 dark:text-indigo-400' : ''}`} 
                />
             </button>
          </div>
        );
      },
    }),
    helper.accessor("noRekonsiliasi", {
      header: "NO. REKON",
      size: 150,
      cell: ({ row }) => {
        const item = row.original;
        const isNew = new Date().getTime() - new Date(item.updatedAt || item.createdAt).getTime() < 48 * 60 * 60 * 1000;
        return (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg font-black tracking-tight text-[10px]">
              {item.noRekonsiliasi || 'DRAFT'}
            </span>
            {isNew && (
              <span className="px-1.5 py-0.5 bg-pink-500 text-white text-[8px] font-black uppercase rounded animate-pulse shadow-sm">
                Baru
              </span>
            )}
          </div>
        );
      },
    }),
    helper.accessor((row) => row.RitelModern?.namaPt, {
      id: "ritel",
      header: "RITEL",
      size: 200,
      cell: ({ row }) => (
        <span className="uppercase text-slate-400 dark:text-slate-500 font-black text-[10px]">
          {row.original.RitelModern?.namaPt || 'N/A'}
        </span>
      ),
    }),
    helper.accessor("bankStatement", {
      header: "BANK STATEMENT",
      size: 160,
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="text-center tabular-nums text-slate-800 dark:text-slate-200 font-black">
          {formatRp(row.original.bankStatement)}
        </div>
      ),
    }),
    helper.accessor("totalInvoices", {
      header: "INVOICE",
      size: 140,
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        const invoiceCount = item.invoices?.length || 0;
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="px-3 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-full text-[9px] font-black uppercase">
              {invoiceCount} Invoice
            </span>
            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 tabular-nums">{formatRp(item.totalInvoices || 0)}</p>
          </div>
        );
      },
    }),
    helper.accessor("totalRtvs", {
      header: "RTV",
      size: 140,
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        const rtvCount = item.rtvs?.length || 0;
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="px-3 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-full text-[9px] font-black uppercase">
              {rtvCount} RTV
            </span>
            <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 tabular-nums">{formatRp(item.totalRtvs || 0)}</p>
          </div>
        );
      },
    }),
    helper.accessor("totalPromo", {
      header: "PROMO",
      size: 140,
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="px-3 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">
              {item.promos?.length || 0} PROMO
            </span>
            <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRp(item.totalPromo || 0)}</p>
          </div>
        );
      },
    }),
    helper.accessor("biayaAdmin", {
      header: "ADMIN FEE",
      size: 140,
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="text-center text-rose-400 dark:text-rose-500 tabular-nums font-black">
          ({formatRp(row.original.biayaAdmin)})
        </div>
      ),
    }),
    helper.accessor("nominal", {
      header: "NET DUE",
      size: 140,
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="text-center w-full h-full bg-indigo-50/5 dark:bg-indigo-500/5 flex items-center justify-center p-2 rounded">
          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 tracking-tighter tabular-nums">
            {formatRp(row.original.nominal)}
          </p>
        </div>
      ),
    }),
    helper.accessor("createdAt", {
      header: "TANGGAL INPUT",
      size: 140,
      meta: { align: "center" },
      cell: ({ row }) => (
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight text-center">
          {format(new Date(row.original.createdAt), "dd MMM yyyy", { locale: localeId })}
        </p>
      ),
    }),
    helper.accessor("tglBayar", {
      header: "TANGGAL PEMBAYARAN",
      size: 160,
      meta: { align: "center" },
      cell: ({ row }) => (
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight text-center">
          {row.original.tglBayar ? format(new Date(row.original.tglBayar), "dd MMM yyyy", { locale: localeId }) : '-'}
        </p>
      ),
    }),
    helper.display({
      id: "actions",
      header: "AKSI",
      size: 160,
      meta: { align: "right" },
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {item.rincianBayarUrl && (
              <a 
                href={item.rincianBayarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500/20 transition-all shadow-sm dark:shadow-none"
                title="Lihat Rincian Bayar"
              >
                <FileSpreadsheet size={14} />
              </a>
            )}
            {item.buktiBayarUrl && (
              <button 
                onClick={() => setBuktiBayarPreviewUrl(item.buktiBayarUrl)}
                suppressHydrationWarning
                className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500/20 transition-all shadow-sm dark:shadow-none"
                title="Lihat Bukti Bayar"
              >
                <Paperclip size={14} />
              </button>
            )}
            <button 
              onClick={() => handleRowExport(item)}
              suppressHydrationWarning
              className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500/20 transition-all shadow-sm dark:shadow-none"
              title="Preview PDF"
            >
              <Eye size={14} />
            </button>
            <button 
              onClick={() => handleDelete(item)}
              suppressHydrationWarning
              className="w-8 h-8 bg-rose-50 dark:bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500/20 transition-all shadow-sm dark:shadow-none"
              title="Hapus Data"
            >
              <Trash2 size={14} />
            </button>
            {item.status === "draft" && (
              <button 
                onClick={() => router.push(`/rekon/calc?edit=${item.id}`)}
                className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-sm dark:shadow-none hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500/30 transition-all cursor-pointer group/draft"
                title="Lanjutkan Draft"
              >
                <FileText size={14} className="group-hover/draft:scale-110 transition-transform" />
              </button>
            )}
          </div>
        );
      },
    }),
  ], [expandedRows, toggleRow, formatRp, handleDelete, handleRowExport, router, setBuktiBayarPreviewUrl]);

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
      <DataTableV2
        columns={columns}
        data={data}
        loading={loading}
        getRowId={(row: any) => row.id}
        manualPagination={true}
        pageCount={Math.max(1, Math.ceil(total / limit))}
        pagination={{ pageIndex: Math.max(0, page - 1), pageSize: limit }}
        onPaginationChange={(updater: any) => {
          const next = typeof updater === "function" 
            ? updater({ pageIndex: Math.max(0, page - 1), pageSize: limit }) 
            : updater;
          if (next.pageSize !== limit) {
            setLimit(next.pageSize);
            setPage(1);
          } else {
            setPage(next.pageIndex + 1);
          }
        }}
        onRowClick={(item: any) => toggleRow(item.id)}
        expandedKeys={expandedRows}
        renderExpandedRow={(item: any) => {
          const invoiceCount = item.invoices?.length || 0;
          const rtvCount = item.rtvs?.length || 0;
          
          return (
            <tr key={`${item.id}-detail`} className="border-b border-slate-100 dark:border-slate-800/50">
              <td colSpan={12} className="px-0 py-0">
                <div 
                  className="bg-slate-50/60 dark:bg-slate-900/40 px-14 py-8"
                  style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-8 w-full">
                    {/* LEFT: Bank Statement Detail */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center">
                          <CircleDollarSign size={12} className="text-white" />
                        </div>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Bank Statement</h4>
                      </div>
                      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        {Array.isArray(item.bankStatements) && item.bankStatements.length > 0 ? (
                          <>
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700/50">
                                  <th className="px-5 py-3">#</th>
                                  <th className="px-5 py-3">Keterangan</th>
                                  <th className="px-5 py-3 text-right">Nominal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.bankStatements.map((bs: any, ni: number) => (
                                  <tr key={ni} className="border-b border-slate-50 dark:border-slate-700/50 last:border-none hover:bg-amber-50/30 dark:hover:bg-amber-500/10 transition-colors">
                                    <td className="px-5 py-3 text-[9px] text-slate-300 dark:text-slate-500 font-bold">{ni + 1}</td>
                                    <td className="px-5 py-3 text-[10px] font-bold text-slate-600 dark:text-slate-300">{bs.desc || <span className="italic text-slate-300 dark:text-slate-600">-</span>}</td>
                                    <td className="px-5 py-3 text-right text-[10px] font-black text-amber-600 dark:text-amber-400 tabular-nums">{formatRp(bs.nominal || 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="px-5 py-3 bg-amber-50/50 dark:bg-amber-500/10 flex justify-end">
                              <span className="text-[8px] font-black text-amber-400 dark:text-amber-500 uppercase tracking-widest mr-3">Total</span>
                              <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">{formatRp(item.bankStatement || 0)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="py-6 text-center">
                            <p className="text-[9px] text-slate-300 italic">Total: {formatRp(item.bankStatement || 0)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* CENTER: Invoice Breakdown */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Receipt size={12} className="text-white" />
                        </div>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Invoice ({invoiceCount})</h4>
                      </div>
                      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700/50">
                              <th className="px-5 py-3">#</th>
                              <th className="px-5 py-3">NO. INVOICE</th>
                              <th className="px-5 py-3 text-right">NOMINAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.invoices?.length > 0 ? item.invoices.map((inv: any, i: number) => (
                              <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-none hover:bg-blue-50/30 dark:hover:bg-blue-500/10 transition-colors">
                                <td className="px-5 py-3 text-[9px] text-slate-300 dark:text-slate-500 font-bold">{i + 1}</td>
                                <td className="px-5 py-3">
                                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">{inv.noInvoice}</span>
                                </td>
                                <td className="px-5 py-3 text-right tabular-nums text-[10px] font-black text-slate-700 dark:text-slate-200">
                                  {formatRp(inv.nominal)}
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="px-5 py-6 text-center text-[9px] text-slate-300 dark:text-slate-600 italic">Tidak ada invoice</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                          <span className="text-[8px] font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest mr-3">Total</span>
                          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tabular-nums">{formatRp(item.totalInvoices || 0)}</span>
                        </div>
                      </div>
                    </div>


                    {/* CENTER: Notes Detail */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
                          <FileText size={12} className="text-white" />
                        </div>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Notes</h4>
                      </div>
                      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        {Array.isArray(item.notes) && item.notes.length > 0 ? (
                          <>
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700/50">
                                  <th className="px-5 py-3">#</th>
                                  <th className="px-5 py-3">Tipe</th>
                                  <th className="px-5 py-3">Keterangan</th>
                                  <th className="px-5 py-3 text-right">Nominal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.notes.map((note: any, ni: number) => (
                                  <tr key={ni} className="border-b border-slate-50 dark:border-slate-700/50 last:border-none hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-colors">
                                    <td className="px-5 py-3 text-[9px] text-slate-300 dark:text-slate-500 font-bold">{ni + 1}</td>
                                    <td className="px-5 py-3 text-[10px] font-bold text-slate-600">
                                      {note.type === 'rtv' ? (
                                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-500/20 text-[8px] uppercase tracking-widest">RTV</span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-500/20 text-[8px] uppercase tracking-widest">Invoice</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-[10px] font-bold text-slate-600 dark:text-slate-300">{note.desc || <span className="italic text-slate-300 dark:text-slate-600">-</span>}</td>
                                    <td className="px-5 py-3 text-right text-[10px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{formatRp(note.nominal || 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="px-5 py-3 bg-indigo-50/50 dark:bg-indigo-500/10 flex justify-end">
                              <span className="text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mr-3">Total</span>
                              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{formatRp(item.notes.reduce((s: number, n: any) => s + (Number(n.nominal) || 0), 0))}</span>
                            </div>
                          </>
                        ) : (
                          <div className="py-6 text-center">
                            <p className="text-[9px] text-slate-300 italic">Tidak ada notes</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: RTV Breakdown */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-rose-500 rounded-lg flex items-center justify-center">
                          <RotateCcw size={12} className="text-white" />
                        </div>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail RTV ({rtvCount})</h4>
                      </div>
                      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700/50">
                              <th className="px-5 py-3">#</th>
                              <th className="px-5 py-3">NO. RTV</th>
                              <th className="px-5 py-3">REF. INVOICE</th>
                              <th className="px-5 py-3">LOKASI BARANG</th>
                              <th className="px-5 py-3">TUJUAN</th>
                              <th className="px-5 py-3">PRODUK</th>
                              <th className="px-5 py-3 text-right">NOMINAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.rtvs?.length > 0 ? item.rtvs.map((rtv: any, i: number) => {
                              const rtvNo = typeof rtv === 'string' ? rtv : rtv.noRtv;
                              const refInv = typeof rtv === 'object' ? rtv.refInvoice : '-';
                              const nominal = typeof rtv === 'object' ? rtv.nominal : 0;
                              const lokasi = typeof rtv === 'object' ? (rtv.lokasiBarang || '-') : '-';
                              const tujuan = typeof rtv === 'object' ? (rtv.tujuan || '-') : '-';
                              const produk = typeof rtv === 'object' ? (rtv.produk || '-') : '-';
                              return (
                                <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-none hover:bg-rose-50/30 dark:hover:bg-rose-500/10 transition-colors">
                                  <td className="px-5 py-3 text-[9px] text-slate-300 dark:text-slate-500 font-bold">{i + 1}</td>
                                  <td className="px-5 py-3">
                                    <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-tight">{rtvNo}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    {refInv && refInv !== '-' ? (
                                      <div className="flex items-center gap-1.5">
                                        <ArrowRightCircle size={10} className="text-indigo-400 dark:text-indigo-500 shrink-0" />
                                        <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-tight">{refInv}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-200 dark:text-slate-600 italic">belum di-set</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{lokasi}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px] inline-block" title={tujuan}>{tujuan}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px] inline-block" title={produk}>{produk}</span>
                                  </td>
                                  <td className="px-5 py-3 text-right tabular-nums text-[10px] font-black text-slate-700 dark:text-slate-200">
                                    {formatRp(nominal)}
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan={8} className="px-5 py-6 text-center text-[9px] text-slate-300 dark:text-slate-600 italic">Tidak ada RTV</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                          <span className="text-[8px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest mr-3">Total</span>
                          <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 tabular-nums">{formatRp(item.totalRtvs || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Promo Breakdown */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <Percent size={12} className="text-white" />
                        </div>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Promo ({item.promos?.length || 0})</h4>
                      </div>
                      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700/50">
                              <th className="px-5 py-3">#</th>
                              <th className="px-5 py-3">NO. PROMO</th>
                              <th className="px-5 py-3">KEGIATAN</th>
                              <th className="px-5 py-3 text-right">NOMINAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.promos?.length > 0 ? item.promos.map((promo: any, i: number) => (
                              <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-none hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10 transition-colors">
                                <td className="px-5 py-3 text-[9px] text-slate-300 dark:text-slate-500 font-bold">{i + 1}</td>
                                <td className="px-5 py-3">
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{promo.nomor}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{promo.kegiatan || '-'}</span>
                                </td>
                                <td className="px-5 py-3 text-right tabular-nums text-[10px] font-black text-slate-700 dark:text-slate-200">
                                  {formatRp(promo.total || 0)}
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={4} className="px-5 py-6 text-center text-[9px] text-slate-300 dark:text-slate-600 italic">Tidak ada promo</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                          <span className="text-[8px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest mr-3">Total</span>
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRp(item.totalPromo || 0)}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bukti & Rincian Bayar Section */}
                  <div className="mt-4 pt-4 border-t border-slate-100/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                        <Paperclip size={14} />
                      </div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bukti & Rincian Bayar</h4>
                      <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-700/50"></div>
                      <div className="flex items-center gap-2">
                        {item.rincianBayarUrl && (
                          <a
                            href={item.rincianBayarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all group/rincian border border-blue-100 dark:border-blue-500/20"
                          >
                            <FileSpreadsheet size={12} className="group-hover/rincian:scale-110 transition-transform" />
                            Rincian Bayar
                          </a>
                        )}
                        {item.buktiBayarUrl ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setBuktiBayarPreviewUrl(item.buktiBayarUrl); }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all group/bukti border border-amber-100 dark:border-amber-500/20"
                          >
                            <Eye size={12} className="group-hover/bukti:scale-110 transition-transform" />
                            Lihat Bukti
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 italic uppercase tracking-widest">Belum ada bukti bayar</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}
