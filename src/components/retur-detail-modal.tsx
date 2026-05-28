"use client";

import { useState } from "react";
import { X, Calendar, Package, MapPin, Coins, ClipboardList, TrendingDown, Store, UserCircle, BadgeCheck, FileText, ExternalLink, History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface ReturDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export default function ReturDetailModal({ isOpen, onClose, data }: ReturDetailModalProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  if (!isOpen || !data) return null;

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: id });
    } catch {
      return "-";
    }
  };

  const formatIDR = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-slate-100">
        
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl">
              <ClipboardList size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Detail Data Retur</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{data.rtvCn || "N/A"}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 pt-4 max-h-[70vh] overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl transition-hover hover:border-indigo-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ritel / PT</p>
                <p className="text-xs font-black text-slate-700 truncate">{data.RitelModern?.namaPt || "-"}</p>
             </div>
             <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Toko</p>
                <p className="text-xs font-black text-slate-700 truncate tracking-tighter">{data.namaCompany || "-"}</p>
             </div>
             <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kode Toko</p>
                <p className="text-xs font-black text-slate-700 tabular-nums">{data.kodeToko || "-"}</p>
             </div>
             <div className={`p-4 rounded-3xl border ${data.statusBarang?.toLowerCase() === "sudah diambil" ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${data.statusBarang?.toLowerCase() === "sudah diambil" ? "text-emerald-400" : "text-rose-400"}`}>Status Barang</p>
                <p className={`text-[10px] font-black uppercase tracking-tighter ${data.statusBarang?.toLowerCase() === "sudah diambil" ? "text-emerald-600" : "text-rose-600"}`}>{data.statusBarang || "BELUM DIAMBIL"}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Col: Info Produk */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Package size={14} className="text-indigo-500" />
                Informasi Produk
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Nama Produk</span>
                  <span className="text-xs font-black text-slate-800 text-right max-w-[150px] truncate">{data.produk || "-"}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Qty Return</span>
                  <span className="text-sm font-black text-indigo-600 tabular-nums">{data.qtyReturn || 0} PCS</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Nominal (Total)</span>
                  <span className="text-sm font-black text-rose-600 tabular-nums">{formatIDR(data.nominal)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Harga / Kg</span>
                  <span className="text-xs font-black text-slate-700 tabular-nums italic">{formatIDR(data.rpKg)}</span>
                </div>
              </div>
            </div>

            {/* Right Col: Timeline & Lokasi */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Calendar size={14} className="text-rose-500" />
                Timeline & Lokasi
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Tanggal RTV</span>
                  <span className="text-xs font-black text-slate-700">{formatDate(data.tanggalRtv)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Deadline Pickup</span>
                  <span className="text-[11px] font-black text-rose-500">{formatDate(data.maxPickup)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                   <div className="flex items-center gap-2">
                     <MapPin size={14} className="text-amber-500" />
                     <span className="text-xs font-bold text-slate-500">Lokasi / DC</span>
                   </div>
                  <span className="text-xs font-black text-slate-700">{data.LokasiBarang?.siteArea || "-"}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                   <div className="flex items-center gap-2">
                     <TrendingDown size={14} className="text-indigo-400" />
                     <span className="text-xs font-bold text-slate-500">Pembebanan</span>
                   </div>
                  <span className="text-xs font-black text-indigo-600 truncate max-w-[120px]">{data.PembebananReturn?.siteArea || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="space-y-6 pt-4 border-t border-slate-50">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <FileText size={14} className="text-amber-500" />
                Keterangan & Finance
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex flex-col gap-2 p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan Status</span>
                    <p className="text-xs font-bold text-slate-600 italic whitespace-pre-wrap">{data.refKetStatus || "-"}</p>
                 </div>
                 <div className="flex flex-col gap-2 p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remarks / Catatan</span>
                    <p className="text-xs font-bold text-slate-600 whitespace-pre-wrap">{data.remarks || "-"}</p>
                 </div>
                 <div className="flex flex-col gap-2 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer" onClick={() => setIsHistoryOpen(true)}>
                     <div className={`absolute top-0 right-0 p-4 ${data.invoiceRekon ? "text-emerald-500" : "text-slate-200"}`}>
                       <BadgeCheck size={32} strokeWidth={1} />
                    </div>
                    <div className="flex justify-between items-center w-full">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice Rekon</span>
                       <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-2 py-1 rounded-full"><History size={10} /> Riwayat</span>
                    </div>
                    <p className={`text-sm font-black mt-1 ${data.invoiceRekon ? "text-emerald-600" : "text-slate-400"}`}>
                       {data.invoiceRekon || "TIDAK TERSEDIA"}
                    </p>
                 </div>
                 <div className="flex flex-col gap-2 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SDI Retur</span>
                    <p className="text-sm font-black text-amber-600">{data.sdiReturn || "-"}</p>
                 </div>
              </div>
          </div>

          {/* Payment Info */}
          <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl shadow-slate-200">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Referensi Pembayaran</p>
                   <p className="text-sm font-black tracking-tight">{data.referensiPembayaran || "MENUNGGU PEMBAYARAN"}</p>
                </div>
                <div className="h-px md:h-8 md:w-px bg-slate-800" />
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-left md:text-right">Tanggal Bayar</p>
                   <p className="text-sm font-black text-emerald-400 tabular-nums">{formatDate(data.tanggalPembayaran)}</p>
                </div>
             </div>
          </div>

          {/* External Link */}
          {data.link && (
            <div className="pt-2">
               <a 
                 href={data.link} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white font-black rounded-[24px] hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 group"
               >
                 <ExternalLink size={20} className="group-hover:rotate-12 transition-transform" />
                 LIHAT DOKUMEN / HASIL RETUR
               </a>
            </div>
          )}

        </div>

      </div>

      {/* HISTORY MODAL (SUB-MODAL) */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsHistoryOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            {/* Header Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-rose-500" />
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Riwayat Invoice Rekon</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{data.rtvCn || "-"}</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 pt-2 bg-slate-50/50 space-y-6">
               <div className="relative">
                  {/* Line connecting nodes */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200 rounded-full" />
                  
                  {/* Before Node */}
                  <div className="flex gap-4 relative z-10 opacity-60">
                     <div className="w-12 h-12 bg-white rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <FileText size={18} />
                     </div>
                     <div className="pt-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sebelumnya (Before)</p>
                        <p className={`text-sm font-black ${data.referensiPembayaran ? 'text-slate-500' : 'text-slate-400 italic'}`}>
                           {data.referensiPembayaran || "Belum ada referensi"}
                        </p>
                     </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-100 rounded-full border-2 border-white flex items-center justify-center text-slate-300 z-20">
                     <ArrowRight size={8} />
                  </div>

                  {/* To-Be Node */}
                  <div className="flex gap-4 relative z-10 mt-6">
                     <div className="w-12 h-12 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                        <BadgeCheck size={20} />
                     </div>
                     <div className="pt-1">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Diperbarui (To-Be)</p>
                        <p className="text-sm font-black text-emerald-700">{data.invoiceRekon || "Belum ada invoice"}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase tracking-widest">Sistem</span>
                           <span className="text-[8px] font-bold text-slate-400">{data.updatedAt ? format(new Date(data.updatedAt), "dd MMM yyyy, HH:mm") : data.createdAt ? format(new Date(data.createdAt), "dd MMM yyyy, HH:mm") : "-"}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 text-center">
               <button onClick={() => setIsHistoryOpen(false)} className="px-6 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all w-full">Tutup Riwayat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
