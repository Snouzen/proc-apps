"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Search,
  Loader2,
  Calendar,
  Building2,
  CircleDollarSign,
  ArrowRightCircle,
  Trash2,
  Eye,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  RotateCcw,
  FileText,
  FileDown,
  X,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import * as Popover from "@radix-ui/react-popover";
import Swal from "sweetalert2";
import DateInputHybrid from "@/components/DateInputHybrid";

// Lazy-load PDF generator (~100KB) — only when user clicks Export
const lazyGenerateRekonPdf = (
  ...args: Parameters<typeof import("@/lib/generateRekonPdf").generateRekonPdf>
) => import("@/lib/generateRekonPdf").then((m) => m.generateRekonPdf(...args));

export default function DataRekonPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchRekonData = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/rekon", window.location.origin);
      if (search) url.searchParams.set("q", search);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());

      const res = await fetch(url.toString());
      const json = await res.json();
      
      if (res.ok) {
        setData(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRekonData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate, page, limit]);

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const handleDelete = async (item: any) => {
    const { isConfirmed } = await Swal.fire({
      title: "Hapus Data?",
      text: `Rekonsiliasi ${item.noRekonsiliasi} akan dihapus permanen!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-[32px] font-sans", confirmButton: "rounded-xl px-6 py-3", cancelButton: "rounded-xl px-6 py-3" }
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/rekon?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");

      Swal.fire({ icon: "success", title: "Terhapus!", timer: 1500, showConfirmButton: false, customClass: { popup: "rounded-[32px] font-sans" } });
      fetchRekonData();
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message, customClass: { popup: "rounded-[32px] font-sans" } });
    }
  };

  const handleRowExport = async (item: any) => {
    setExportLoading(true);
    try {
      const blobUrl = await lazyGenerateRekonPdf(
        [item], // Kirim sebagai array dengan 1 item
        { search: "", startDate: "", endDate: "" }, // Info filter dikosongkan karena spesifik 1 data
        "preview"
      );

      if (blobUrl) {
        setPdfPreviewUrl(blobUrl as string);
      }
    } catch (err) {
      console.error("Export PDF Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Preview",
        text: "Terjadi kesalahan saat memproses PDF.",
        customClass: { popup: "rounded-[32px] font-sans" },
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
    <style jsx global>{`
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
    <div className="max-w-full mx-auto p-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center text-white shadow-lg">
            <Layers size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">
               Arsip Rekonsiliasi
            </h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">
               Database Storage • v1.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
          {/* Custom Date Filters */}
          <div className="flex items-center bg-white rounded-full border border-slate-100 shadow-sm px-4 h-11 gap-3">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">From</span>
                <DateInputHybrid 
                  value={startDate}
                  onChange={(val) => { setStartDate(val); setPage(1); }}
                  placeholder="Mulai"
                  className="w-32 border-none ring-0 focus:ring-0 [&_input]:bg-slate-50/50 [&_input]:h-8 [&_input]:rounded-full [&_input]:text-[10px] [&_input]:border-none"
                />
             </div>
             <div className="w-[1px] h-4 bg-slate-100"></div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">To</span>
                <DateInputHybrid 
                  value={endDate}
                  onChange={(val) => { setEndDate(val); setPage(1); }}
                  placeholder="Sampai"
                  className="w-32 border-none ring-0 focus:ring-0 [&_input]:bg-slate-50/50 [&_input]:h-8 [&_input]:rounded-full [&_input]:text-[10px] [&_input]:border-none"
                />
             </div>
          </div>

          <div className="relative group w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cari..." 
              suppressHydrationWarning
              className="w-full h-11 pl-11 pr-6 bg-white rounded-full border border-slate-100 outline-none font-bold text-xs text-slate-700 shadow-sm focus:ring-4 focus:ring-indigo-50 transition-all"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        {loading && !data.length ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-200 animate-spin" strokeWidth={3} />
            </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-4 py-5 w-10"></th>
                  <th className="px-4 py-5">NO. REKON</th>
                  <th className="px-4 py-5">RITEL</th>
                  <th className="px-6 py-5 text-center">BANK STATEMENT</th>
                  <th className="px-6 py-5 text-center">INVOICE</th>
                  <th className="px-6 py-5 text-center">RTV</th>
                  <th className="px-6 py-5 text-center">PROMO</th>
                  <th className="px-6 py-5 text-center">ADMIN FEE</th>
                  <th className="px-6 py-5 text-center bg-indigo-50/5 text-indigo-500">NET DUE</th>
                  <th className="px-4 py-5 text-center">TANGGAL</th>
                  <th className="px-4 py-5 text-right pr-8">AKSI</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold text-slate-600">
                {data.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  const invoiceCount = item.invoices?.length || 0;
                  const rtvCount = item.rtvs?.length || 0;

                  return (
                    <Fragment key={item.id}>
                      {/* MAIN ROW */}
                      <tr 
                        className={`group hover:bg-slate-50/50 transition-all border-b cursor-pointer ${isExpanded ? 'bg-slate-50/80 border-slate-100' : 'border-slate-50'}`}
                        onClick={() => toggleRow(item.id)}
                      >
                        <td className="px-4 py-4 w-10">
                          <ChevronRight 
                            size={14} 
                            className={`text-slate-950 font-black transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} 
                          />
                        </td>

                        {/* No Rekon */}
                        <td className="px-4 py-4">
                           <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black tracking-tight text-[10px]">
                              {item.noRekonsiliasi}
                           </span>
                        </td>

                        {/* Ritel */}
                        <td className="px-4 py-4 uppercase text-slate-400 font-black text-[10px]">
                           {item.RitelModern?.namaPt || 'N/A'}
                        </td>

                        {/* Bank Statement */}
                        <td className="px-6 py-4 text-center tabular-nums text-slate-800 font-black">
                           {formatRp(item.bankStatement)}
                        </td>

                        {/* Invoice Summary - Badge + Total */}
                        <td className="px-6 py-4 text-center">
                           <div className="flex flex-col items-center gap-1">
                              <span className="px-3 py-0.5 bg-blue-50 text-blue-500 rounded-full text-[9px] font-black uppercase">
                                 {invoiceCount} Invoice
                              </span>
                              <p className="text-[11px] font-black text-slate-800 tabular-nums">{formatRp(item.totalInvoices || 0)}</p>
                           </div>
                        </td>

                        {/* RTV Summary - Badge + Total */}
                        <td className="px-6 py-4 text-center">
                           <div className="flex flex-col items-center gap-1">
                              <span className="px-3 py-0.5 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black uppercase">
                                 {rtvCount} RTV
                              </span>
                              <p className="text-[11px] font-black text-rose-600 tabular-nums">{formatRp(item.totalRtvs || 0)}</p>
                           </div>
                        </td>

                        {/* Promo */}
                        <td className="px-6 py-4 text-center">
                           {item.noPromo ? (
                              <div className="flex flex-col items-center gap-1">
                                 <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase border border-emerald-100/50">
                                    {item.noPromo}
                                 </span>
                                 <p className="text-[11px] font-black text-emerald-600 tabular-nums">{formatRp(item.totalPromo || 0)}</p>
                              </div>
                           ) : <span className="text-slate-200">-</span>}
                        </td>

                        {/* Admin Fee */}
                        <td className="px-6 py-4 text-center text-rose-400 tabular-nums font-black">
                           ({formatRp(item.biayaAdmin)})
                        </td>

                        {/* Net Due */}
                        <td className="px-6 py-4 text-center bg-indigo-50/5">
                           <p className="text-[13px] font-black text-slate-900 tracking-tighter tabular-nums">
                              {formatRp(item.nominal)}
                           </p>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4 text-center whitespace-nowrap opacity-50 group-hover:opacity-100">
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                              {format(new Date(item.createdAt), "dd MMM yyyy", { locale: id })}
                           </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right pr-8" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center justify-end gap-2">
                              <button 
                                 onClick={() => handleRowExport(item)}
                                 suppressHydrationWarning
                                 className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                 title="Preview PDF"
                              >
                                 <Eye size={14} />
                              </button>
                              <button 
                                 onClick={() => handleDelete(item)}
                                 suppressHydrationWarning
                                 className="w-8 h-8 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                 title="Hapus Data"
                              >
                                 <Trash2 size={14} />
                              </button>
                              {item.status === "draft" && (
                                <button 
                                  onClick={() => router.push(`/rekon/calc?edit=${item.id}`)}
                                  className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shadow-sm hover:bg-amber-600 hover:text-white transition-all cursor-pointer group/draft"
                                  title="Lanjutkan Draft"
                                >
                                  <FileText size={14} className="group-hover/draft:scale-110 transition-transform" />
                                </button>
                              )}
                           </div>
                        </td>
                      </tr>

                      {/* EXPANDED DETAIL ROW */}
                      {isExpanded && (
                        <tr key={`${item.id}-detail`} className="border-b border-slate-100">
                          <td colSpan={11} className="px-0 py-0">
                            <div 
                              className="bg-slate-50/60 px-14 py-8"
                              style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
                            >
                              <div className="grid grid-cols-2 gap-8 max-w-[1200px]">
                                
                                {/* LEFT: Invoice Breakdown */}
                                <div>
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                                      <Receipt size={12} className="text-white" />
                                    </div>
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Invoice ({invoiceCount})</h4>
                                  </div>
                                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="text-[8px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                          <th className="px-5 py-3">#</th>
                                          <th className="px-5 py-3">NO. INVOICE</th>
                                          <th className="px-5 py-3 text-right">NOMINAL</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.invoices?.length > 0 ? item.invoices.map((inv: any, i: number) => (
                                          <tr key={i} className="border-b border-slate-50 last:border-none hover:bg-blue-50/30 transition-colors">
                                            <td className="px-5 py-3 text-[9px] text-slate-300 font-bold">{i + 1}</td>
                                            <td className="px-5 py-3">
                                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{inv.noInvoice}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-[10px] font-black text-slate-700">
                                              {formatRp(inv.nominal)}
                                            </td>
                                          </tr>
                                        )) : (
                                          <tr><td colSpan={3} className="px-5 py-6 text-center text-[9px] text-slate-300 italic">Tidak ada invoice</td></tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <div className="px-4 py-2 bg-blue-50 rounded-xl">
                                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mr-3">Total</span>
                                      <span className="text-[11px] font-black text-blue-600 tabular-nums">{formatRp(item.totalInvoices || 0)}</span>
                                    </div>
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
                                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="text-[8px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                          <th className="px-5 py-3">#</th>
                                          <th className="px-5 py-3">NO. RTV</th>
                                          <th className="px-5 py-3">REF. INVOICE</th>
                                          <th className="px-5 py-3 text-right">NOMINAL</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.rtvs?.length > 0 ? item.rtvs.map((rtv: any, i: number) => {
                                          const rtvNo = typeof rtv === 'string' ? rtv : rtv.noRtv;
                                          const refInv = typeof rtv === 'object' ? rtv.refInvoice : '-';
                                          const nominal = typeof rtv === 'object' ? rtv.nominal : 0;
                                          return (
                                            <tr key={i} className="border-b border-slate-50 last:border-none hover:bg-rose-50/30 transition-colors">
                                              <td className="px-5 py-3 text-[9px] text-slate-300 font-bold">{i + 1}</td>
                                              <td className="px-5 py-3">
                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">{rtvNo}</span>
                                              </td>
                                              <td className="px-5 py-3">
                                                {refInv && refInv !== '-' ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <ArrowRightCircle size={10} className="text-indigo-400 shrink-0" />
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tight">{refInv}</span>
                                                  </div>
                                                ) : (
                                                  <span className="text-[9px] text-slate-200 italic">belum di-set</span>
                                                )}
                                              </td>
                                              <td className="px-5 py-3 text-right tabular-nums text-[10px] font-black text-slate-700">
                                                {formatRp(nominal)}
                                              </td>
                                            </tr>
                                          );
                                        }) : (
                                          <tr><td colSpan={4} className="px-5 py-6 text-center text-[9px] text-slate-300 italic">Tidak ada RTV</td></tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <div className="px-4 py-2 bg-rose-50 rounded-xl">
                                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest mr-3">Total</span>
                                      <span className="text-[11px] font-black text-rose-600 tabular-nums">{formatRp(item.totalRtvs || 0)}</span>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                
                {data.length === 0 && !loading && (
                   <tr>
                      <td colSpan={11} className="px-6 py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                         Belum ada data rekonsiliasi.
                      </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="mt-6 flex justify-between items-center px-6 py-4 bg-white rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Total {total} Data
          </p>
          <div className="h-4 w-[1px] bg-slate-100"></div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Rows per page</span>
            <Popover.Root>
              <Popover.Trigger asChild>
                <button 
                  suppressHydrationWarning
                  className="h-8 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 flex items-center gap-2 transition-all outline-none border border-transparent focus:border-indigo-100"
                >
                  {limit}
                  <ChevronDown size={12} className="text-slate-300" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-[100] w-24 bg-white rounded-2xl shadow-2xl border border-slate-50 p-2 animate-in fade-in zoom-in-95" align="start" sideOffset={8}>
                  {[10, 25, 50].map((val) => (
                    <button 
                      key={val}
                      onClick={() => { setLimit(val); setPage(1); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${limit === val ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                    >
                      {val}
                    </button>
                  ))}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(1)}
            suppressHydrationWarning
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50 transition-all"
          >
            <ChevronsLeft size={16} />
          </button>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            suppressHydrationWarning
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="px-5 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs tracking-tighter">
            {page} / {Math.ceil(total / limit) || 1}
          </div>

          <button 
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage(p => p + 1)}
            suppressHydrationWarning
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50 transition-all"
          >
            <ChevronRight size={16} />
          </button>
          <button 
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage(Math.ceil(total / limit))}
            suppressHydrationWarning
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50 transition-all"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>

    {/* ── PDF Preview Modal ─── */}
    {pdfPreviewUrl && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200">
        <div className="bg-slate-100 w-full max-w-6xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Eye className="text-indigo-600" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Preview Laporan Rekonsiliasi</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {total} Data {startDate || endDate ? `• ${startDate || "..."} s/d ${endDate || "..."}` : "• Semua Periode"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={pdfPreviewUrl}
                download={`Rekon_Report_${new Date().toISOString().slice(0,10)}.pdf`}
                className="h-10 px-5 bg-[#0f172a] text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
              >
                <Download size={14} />
                Download
              </a>
              <button
                onClick={() => setPdfPreviewUrl(null)}
                suppressHydrationWarning
                className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 w-full h-full bg-slate-200">
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full border-none"
              title="Rekon PDF Preview"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
