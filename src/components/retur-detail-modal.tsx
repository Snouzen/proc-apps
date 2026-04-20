"use client";

import { X, Calendar, Package, MapPin, Coins, ClipboardList, TrendingDown, Store, UserCircle, BadgeCheck, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface ReturDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export default function ReturDetailModal({ isOpen, onClose, data }: ReturDetailModalProps) {
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
                 <div className="flex flex-col gap-2 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                     <div className={`absolute top-0 right-0 p-4 ${data.invoiceRekon ? "text-emerald-500" : "text-slate-200"}`}>
                       <BadgeCheck size={32} strokeWidth={1} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice Rekon</span>
                    <p className={`text-sm font-black ${data.invoiceRekon ? "text-emerald-600" : "text-slate-400"}`}>
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
    </div>
  );
}
