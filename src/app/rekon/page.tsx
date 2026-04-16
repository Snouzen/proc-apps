"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { 
  Calculator, 
  Search, 
  Plus, 
  Loader2,
  Building2,
  ChevronDown,
  ArrowLeft,
  FileSpreadsheet,
  X,
  Check,
  Calendar,
  Download,
  Receipt,
  Trash2,
  TrendingDown,
  Coins,
  FileText,
  BadgeCheck,
  Building,
  ArrowRight
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import * as Popover from "@radix-ui/react-popover";

interface PoResult {
  noInvoice: string;
  noPo: string;
  nominal: number;
  company: string;
  items: any[];
}

interface RtvResult {
  rtvCn: string;
  nominal: number;
  produk: string;
  qty: number;
}

export default function RekonPage() {
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [rekonInvoices, setRekonInvoices] = useState<PoResult[]>([]);
  const [rtvQuery, setRtvQuery] = useState("");
  const [rekonItems, setRekonItems] = useState<RtvResult[]>([]);
  const [promoAmount, setPromoAmount] = useState<number>(0);
  
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [promos, setPromos] = useState<any[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [loadingPo, setLoadingPo] = useState(false);
  const [loadingRtv, setLoadingRtv] = useState(false);
  
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");

  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoSearch, setPromoSearch] = useState("");

  const filteredRetailers = useMemo(() => {
    return retailers.filter(r => r.namaPt.toLowerCase().includes(companySearch.toLowerCase()));
  }, [retailers, companySearch]);

  const selectedRetailer = useMemo(() => {
    return retailers.find(r => r.namaPt === selectedCompanyName);
  }, [retailers, selectedCompanyName]);

  useEffect(() => {
    fetch("/api/ritel").then(res => res.json()).then(json => {
      const all = Array.isArray(json) ? json : (json.data || []);
      // Filter unique PTs
      const unique = Array.from(new Map(all.map((r: any) => [r.namaPt, r])).values());
      setRetailers(unique);
    });

    fetch("/api/promo").then(res => res.json()).then(json => {
      setPromos(json.data || []);
    });
  }, []);

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSearchInvoice = async () => {
    const q = invoiceQuery.trim();
    if (!q) return;

    if (rekonInvoices.some(i => i.noInvoice === q)) {
      Swal.fire('Info', 'Invoice ini sudah ada di daftar', 'info');
      return;
    }
    
    setLoadingPo(true);
    try {
      // Use dedicated reliable rekon lookup + Selected Company filter
      const res = await fetch(`/api/rekon/lookup?invoiceNo=${encodeURIComponent(q)}&companyName=${encodeURIComponent(selectedCompanyName)}`);
      if (!res.ok) throw new Error("API Response Error");
      
      const json = await res.json();
      const all = json.data || [];
      
      if (all.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Invoice Tidak Ditemukan',
          text: `Tidak ada data PO untuk invoice: ${q}`,
          confirmButtonColor: '#004a87'
        });
        return;
      }

      // Sum all products (rpTagih) for this specific invoice
      const totalNominal = all.reduce((sum: number, p: any) => {
        const itemTotal = (p.Items || []).reduce((iSum: number, item: any) => iSum + (item.rpTagih || 0), 0);
        return sum + itemTotal;
      }, 0);
      
      const first = all[0];
      const newItem: PoResult = {
        noInvoice: first.noInvoice,
        noPo: first.noPo,
        nominal: totalNominal,
        company: first.RitelModern?.namaPt || "Unknown",
        items: all
      };

      setRekonInvoices(prev => [...prev, newItem]);
      setInvoiceQuery("");
      
      Swal.fire({
        icon: 'success',
        title: 'Invoice Ditambahkan',
        toast: true,
        position: 'top-end',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
       Swal.fire('Error', 'Gagal menarik data Invoice', 'error');
    } finally {
      setLoadingPo(false);
    }
  };

  const handleSearchRtv = async () => {
    if (!rtvQuery.trim()) return;
    
    if (rekonItems.some(i => i.rtvCn === rtvQuery.trim())) {
      Swal.fire('Info', 'RTV ini sudah ada di daftar', 'info');
      setRtvQuery("");
      return;
    }

    setLoadingRtv(true);
    try {
      const res = await fetch(`/api/rekon/lookup?rtvNo=${encodeURIComponent(rtvQuery.trim())}`);
      const json = await res.json();
      const all = json.data || [];

      if (all.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'RTV Tidak Ditemukan',
          text: `Nomor RTV/CN: ${rtvQuery} tidak terdaftar`,
          confirmButtonColor: '#004a87'
        });
        return;
      }

      const totalNominal = all.reduce((sum: number, r: any) => sum + Number(r.nominal || 0), 0);
      const first = all[0];

      const newItem: RtvResult = {
        rtvCn: first.rtvCn,
        nominal: totalNominal,
        produk: first.produk || "-",
        qty: all.reduce((sum: number, r: any) => sum + (r.qtyReturn || 0), 0)
      };

      setRekonItems(prev => [...prev, newItem]);
      setRtvQuery("");
      
      Swal.fire({
        icon: 'success',
        title: 'RTV Ditambahkan',
        toast: true,
        position: 'top-end',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
       Swal.fire('Error', 'Gagal menarik data RTV', 'error');
    } finally {
      setLoadingRtv(false);
    }
  };

  // Calculations
  const totalInvoiceNominal = useMemo(() => rekonInvoices.reduce((s, i) => s + i.nominal, 0), [rekonInvoices]);
  const totalRtvNominal = useMemo(() => rekonItems.reduce((s, i) => s + i.nominal, 0), [rekonItems]);
  const selectedPromo = useMemo(() => promos.find(p => p.id === selectedPromoId), [promos, selectedPromoId]);
  const currentPromoAmount = selectedPromo ? selectedPromo.nominal : 0;
  const netDue = totalInvoiceNominal - totalRtvNominal - currentPromoAmount;
  const finalDiff = bankAmount - netDue;

  const exportRekon = () => {
    if (rekonInvoices.length === 0) {
      Swal.fire('Batal', 'Masukkan Invoice terlebih dahulu', 'error');
      return;
    }

    const data = [
      ["REKONSILIASI PENJUALAN"],
      ["Waktu Export", new Date().toLocaleString()],
      [""],
      ["1. BANK STATEMENT (REKENING KORAN)"],
      ["Nominal Bank", bankAmount],
      [""],
      ["2. DAFTAR INVOICE"],
      ["No Invoice", "No PO", "Customer", "Nominal"],
      ...rekonInvoices.map(i => [i.noInvoice, i.noPo, i.company, i.nominal]),
      ["TOTAL INVOICE", "", "", totalInvoiceNominal],
      [""],
      ["3. DAFTAR RETUR (RTV/CN)"],
      ["RTV/CN", "Produk", "Qty", "Nominal"],
      ...rekonItems.map(r => [r.rtvCn, r.produk, r.qty, r.nominal]),
      ["TOTAL RETUR", "", "", totalRtvNominal],
      [""],
      ["4. ADJUSTMENT (PROMO/POTONGAN)"],
      ["Promo Terpilih", selectedPromo?.namaPromo || "-"],
      ["Tagihan Promo", currentPromoAmount],
      [""],
      ["KESIMPULAN"],
      ["Total Invoice (Gross)", totalInvoiceNominal],
      ["Total Retur (-)", totalRtvNominal],
      ["Promo / Potongan (-)", currentPromoAmount],
      ["TAGIHAN BERSIH (NET)", netDue],
      [""],
      ["REKENING KORAN (BANK)", bankAmount],
      ["SELISIH REKONSILIASI", finalDiff],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekon Result");
    XLSX.writeFile(wb, `Rekon_Multi_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Calculator size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">REKONSILIASI</h1>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Interactive Audit Tool</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => {
                setBankAmount(0);
                setRekonInvoices([]);
                setRekonItems([]);
                setPromoAmount(0);
                setInvoiceQuery("");
                setRtvQuery("");
                setSelectedCompanyName("");
             }}
             className="px-6 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all text-xs"
           >
             RESET SYSTEM
           </button>
           <button 
             onClick={exportRekon}
             className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 text-xs"
           >
             <Download size={16} />
             EXPORT REPORT
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Input Sections */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* SECTION 1: REKENING KORAN */}
          <div className="bg-white border border-slate-100 p-8 rounded-[48px] shadow-2xl shadow-slate-100/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
               <Receipt size={120} />
            </div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
              Rekening Koran (Bank Statement)
            </h2>
            <div className="relative">
               <Coins size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
               <input 
                 type="text" 
                 inputMode="numeric"
                 placeholder="Input Nominal Rp..."
                 className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[32px] focus:outline-none focus:ring-8 focus:ring-amber-500/10 focus:bg-white focus:border-amber-400 transition-all font-black text-3xl text-slate-800 tabular-nums"
                 value={bankAmount ? formatRp(bankAmount) : ""}
                 onChange={(e) => {
                   const rawValue = e.target.value.replace(/[^0-9]/g, '');
                   setBankAmount(Number(rawValue) || 0);
                 }}
               />
               <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">Rekening Koran</div>
            </div>
            <p className="mt-4 text-[10px] font-bold text-slate-400 flex items-center gap-2 italic">
               * Masukkan nominal total yang tertera pada rekening koran untuk dicocokkan.
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-8 rounded-[48px] shadow-2xl shadow-slate-100/50 relative overflow-hidden group">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">2</span>
              Lookup Invoice (Multi-Matching)
            </h2>

            <div className="flex flex-col gap-4 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Smooth Select Company */}
                 <Popover.Root open={isCompanyOpen} onOpenChange={setIsCompanyOpen}>
                    <Popover.Trigger asChild>
                       <div className="relative group cursor-pointer">
                          <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                          <div className={`w-full pl-12 pr-10 py-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${selectedCompanyName ? 'border-indigo-100 text-slate-700' : 'border-slate-50 text-slate-300'}`}>
                             <span className="truncate">{selectedCompanyName || "Pilih Company / PT..."}</span>
                             <ChevronDown size={16} className={`transition-transform duration-300 ${isCompanyOpen ? 'rotate-180' : ''}`} />
                          </div>
                       </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                       <Popover.Content 
                         className="z-[100] w-[350px] bg-white rounded-3xl border border-slate-100 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                         align="start"
                         side="bottom"
                         sideOffset={8}
                       >
                          <div className="relative mb-2">
                             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                             <input 
                               type="text"
                               placeholder="Cari Company..."
                               className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl focus:ring-0 text-xs font-bold text-slate-700 placeholder:text-slate-300"
                               value={companySearch}
                               onChange={(e) => setCompanySearch(e.target.value)}
                             />
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                             {filteredRetailers.length === 0 ? (
                               <div className="p-4 text-center text-[10px] font-black text-slate-300 uppercase italic">Tidak ditemukan</div>
                             ) : (
                               filteredRetailers.map(r => (
                                 <button 
                                   key={r.id}
                                   onClick={() => {
                                      setSelectedCompanyName(r.namaPt);
                                      setIsCompanyOpen(false);
                                      setCompanySearch("");
                                   }}
                                   className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${selectedCompanyName === r.namaPt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-slate-50 text-slate-600'}`}
                                 >
                                    <span className="text-xs font-black uppercase tracking-tight">{r.namaPt}</span>
                                    {selectedCompanyName === r.namaPt && <Check size={14} strokeWidth={3} />}
                                 </button>
                               ))
                             )}
                          </div>
                       </Popover.Content>
                    </Popover.Portal>
                 </Popover.Root>

                 {/* Input Search */}
                 <div className="relative flex group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                    <input 
                      type="text" 
                      placeholder="Input Nomor Invoice..."
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-400 transition-all font-bold text-slate-700 text-sm"
                      value={invoiceQuery}
                      onChange={(e) => setInvoiceQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                    />
                    <button 
                      type="button"
                      onClick={handleSearchInvoice}
                      disabled={loadingPo}
                      className="ml-2 px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all disabled:opacity-30 active:scale-95 text-xs whitespace-nowrap"
                    >
                       {loadingPo ? 'SEARCHING...' : 'ADD INVOICE'}
                    </button>
                 </div>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="border border-slate-50 rounded-[32px] overflow-hidden bg-slate-50/20 shadow-inner">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100/50">
                      <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-6">No Invoice</th>
                      <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">No PO</th>
                      <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">Nominal</th>
                      <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rekonInvoices.length === 0 ? (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-300 italic text-xs">Belum ada invoice yang dipadankan.</td></tr>
                    ) : (
                      rekonInvoices.map((inv, idx) => (
                        <tr key={idx} className="bg-white transition-colors hover:bg-slate-50 group">
                           <td className="p-4 pl-6 text-xs font-black text-indigo-600 italic tracking-tight">{inv.noInvoice}</td>
                           <td className="p-4 text-[11px] font-bold text-slate-400">{inv.noPo}</td>
                           <td className="p-4 text-right pr-6 text-xs font-black text-slate-700 tabular-nums">{formatRp(inv.nominal)}</td>
                           <td className="p-4 text-center">
                              <button 
                                onClick={() => setRekonInvoices(prev => prev.filter((_, i) => i !== idx))}
                                className="p-2 text-slate-200 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
            {rekonInvoices.length > 0 && (
              <div className="mt-4 flex justify-end px-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase">Subtotal Invoices: <span className="text-slate-900 ml-2">{formatRp(totalInvoiceNominal)}</span></p>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-100 p-8 rounded-[48px] shadow-2xl shadow-slate-100/50 relative overflow-hidden group">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">3</span>
              Add Retur (RTV/CN)
            </h2>

            <div className="flex flex-col md:flex-row gap-4 mb-8 relative z-20">
              <div className="relative flex-1 group">
                <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Input Nomor RTV/CN..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:bg-white focus:border-rose-400 transition-all font-bold text-slate-700 text-sm"
                  value={rtvQuery}
                  onChange={(e) => setRtvQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchRtv()}
                />
              </div>
              <button 
                type="button"
                onClick={handleSearchRtv}
                disabled={loadingRtv}
                className="px-8 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-slate-900 active:scale-95 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 relative z-30"
              >
                {loadingRtv ? 'ADDING...' : 'ADD RTV'}
              </button>
            </div>

            <div className="overflow-hidden border border-slate-50 rounded-[32px] bg-slate-50/20 shadow-inner">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100/50">
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-6">RTV/CN</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">Nominal</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekonItems.length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-slate-300 italic text-xs">Belum ada RTV yang ditambahkan.</td></tr>
                  ) : (
                    rekonItems.map((item, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors group">
                        <td className="p-4 pl-6 font-black text-slate-700 text-xs italic">{item.rtvCn}</td>
                        <td className="p-4 text-center font-bold text-slate-400 text-[11px] tabular-nums">{item.qty}</td>
                        <td className="p-4 text-right pr-6 font-black text-rose-600 text-xs tabular-nums">{formatRp(item.nominal)}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setRekonItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-8 rounded-[48px] shadow-2xl shadow-slate-100/50 relative overflow-hidden group">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-400 text-white flex items-center justify-center text-[10px]">4</span>
              Tagihan Promo (Potongan)
            </h2>
            
            <div className="space-y-4">
              <Popover.Root open={isPromoOpen} onOpenChange={setIsPromoOpen}>
                 <Popover.Trigger asChild>
                    <div className="relative group cursor-pointer">
                       <TrendingDown size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-300 group-hover:text-rose-600 transition-colors" />
                       <div className={`w-full pl-16 pr-10 py-5 bg-slate-50 border-2 rounded-[24px] font-black text-xl transition-all flex items-center justify-between ${selectedPromoId ? 'border-rose-100 text-rose-600' : 'border-slate-50 text-slate-300'}`}>
                          <span className="truncate">{selectedPromo ? selectedPromo.namaPromo : "Pilih Promo..."}</span>
                          <ChevronDown size={20} className={`transition-transform duration-300 ${isPromoOpen ? 'rotate-180' : ''}`} />
                       </div>
                    </div>
                 </Popover.Trigger>
                 <Popover.Portal>
                    <Popover.Content 
                      className="z-[100] w-[400px] bg-white rounded-[32px] border border-slate-100 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200"
                      align="start"
                      side="bottom"
                      sideOffset={8}
                    >
                       <div className="relative mb-3">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Cari Master Promo..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-0 text-xs font-bold text-slate-700 placeholder:text-slate-300"
                            value={promoSearch}
                            onChange={(e) => setPromoSearch(e.target.value)}
                          />
                       </div>
                       <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                          {promos.filter(p => p.namaPromo.toLowerCase().includes(promoSearch.toLowerCase())).length === 0 ? (
                            <div className="p-6 text-center text-[11px] font-black text-slate-300 uppercase italic tracking-widest">Master promo kosong</div>
                          ) : (
                            promos.filter(p => p.namaPromo.toLowerCase().includes(promoSearch.toLowerCase())).map(p => (
                              <button 
                                key={p.id}
                                onClick={() => {
                                   setSelectedPromoId(p.id);
                                   setIsPromoOpen(false);
                                   setPromoSearch("");
                                }}
                                className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between group transition-all ${selectedPromoId === p.id ? 'bg-rose-600 text-white shadow-xl shadow-rose-100' : 'hover:bg-slate-50 text-slate-600'}`}
                              >
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-tight">{p.namaPromo}</span>
                                    <span className={`text-[9px] font-bold ${selectedPromoId === p.id ? 'text-rose-100' : 'text-slate-400'}`}>Nominal: {formatRp(p.nominal)}</span>
                                 </div>
                                 {selectedPromoId === p.id && <Check size={18} strokeWidth={3} />}
                              </button>
                            ))
                          )}
                       </div>
                    </Popover.Content>
                 </Popover.Portal>
              </Popover.Root>

              {selectedPromo && (
                <div className="p-6 bg-rose-50 rounded-[24px] border border-rose-100/50 animate-in fade-in slide-in-from-top-2 flex justify-between items-center">
                   <div>
                      <p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.2em] mb-1">Nominal Terpilih</p>
                      <p className="text-3xl font-black text-rose-600 tabular-nums">{formatRp(selectedPromo.nominal)}</p>
                   </div>
                   <button 
                     onClick={() => setSelectedPromoId("")}
                     className="p-3 bg-white text-rose-400 hover:text-rose-600 rounded-xl shadow-sm transition-all"
                   >
                     <X size={20} />
                   </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Calculations & Results */}
        <div className="xl:col-span-4 space-y-6 sticky top-24">
          <div className="bg-slate-900 p-10 rounded-[56px] shadow-2xl shadow-slate-900/40 relative overflow-hidden min-h-[600px] flex flex-col">
            {/* Background glows */}
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/10 rounded-full blur-[80px]"></div>

            <h2 className="relative z-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12">
              REKON SUMMARY
            </h2>

            <div className="space-y-8 relative z-10 flex-1">
              {/* Bank Statement */}
              <div className="flex justify-between items-center group">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all ring-1 ring-white/5">
                       <Coins size={16} />
                    </div>
                    <div>
                       <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest leading-none mb-1">Bank Statement</p>
                       <span className="text-slate-300 font-bold text-xs">Rekening Koran</span>
                    </div>
                 </div>
                 <span className="text-amber-400 font-black text-xl tabular-nums">{formatRp(bankAmount)}</span>
              </div>

              <div className="h-px bg-white/5 mx-4"></div>

              {/* Invoices */}
              <div className="flex justify-between items-center group">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all ring-1 ring-white/5">
                       <Receipt size={16} />
                    </div>
                    <div>
                       <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest leading-none mb-1">Gross Billing</p>
                       <span className="text-slate-300 font-bold text-xs">Total Invoices</span>
                    </div>
                 </div>
                 <span className="text-white font-black text-xl tabular-nums">{formatRp(totalInvoiceNominal)}</span>
              </div>

              {/* Returns */}
              <div className="flex justify-between items-center group">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all ring-1 ring-white/5">
                       <TrendingDown size={16} />
                    </div>
                    <div>
                       <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest leading-none mb-1">Return Deducts</p>
                       <span className="text-slate-300 font-bold text-xs">Total RTV/CN</span>
                    </div>
                 </div>
                 <span className="text-rose-400 font-black text-lg tabular-nums">({formatRp(totalRtvNominal)})</span>
              </div>

              {/* Promo */}
              <div className="flex justify-between items-center group">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-rose-400 group-hover:text-white transition-all ring-1 ring-white/5">
                       <TrendingDown size={16} />
                    </div>
                    <div>
                       <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest leading-none mb-1">Promo Deducts</p>
                       <span className="text-slate-300 font-bold text-xs">{selectedPromo?.namaPromo || "Tagihan Promo"}</span>
                    </div>
                 </div>
                 <span className="text-rose-300 font-black text-lg tabular-nums">({formatRp(currentPromoAmount)})</span>
              </div>

              <div className="h-px bg-white/10 mx-2"></div>

              {/* Net Expected */}
              <div className="pt-6">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3">Balance Net Due</p>
                 <div className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg scale-x-105 origin-left">
                   {formatRp(netDue)}
                 </div>
              </div>
            </div>

            {/* Final Variance */}
            <div className="mt-12 bg-white/5 border border-white/10 p-8 rounded-[40px] relative overflow-hidden">
               <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${finalDiff === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  REKON VARIANCE (Selisih)
               </div>
               <div className={`text-4xl font-black tabular-nums transition-colors ${finalDiff === 0 ? "text-emerald-400" : Math.abs(finalDiff) < 100 ? "text-amber-400" : "text-rose-500"}`}>
                  {formatRp(finalDiff)}
               </div>
               {finalDiff === 0 && (
                 <div className="mt-4 flex items-center gap-2 text-emerald-400/60 font-black text-[9px] uppercase tracking-widest">
                    <BadgeCheck size={14} /> 
                    Perfect Match
                 </div>
               )}
            </div>
            
          </div>

          {/* Quick Instructions */}
          <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-xl shadow-slate-200/50">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              Quick Instructions
            </h3>
            <ul className="space-y-3">
               {[
                 "Gunakan nomor invoice resmi untuk menarik data PO.",
                 "Satu invoice bisa dipadankan dengan banyak nomor RTV.",
                 "Sistem akan mengkalkulasi selisih secara otomatis.",
                 "Hasil dapat diunduh tanpa perlu simpan ke database."
               ].map((text, i) => (
                 <li key={i} className="flex items-start gap-3 text-xs text-slate-500 font-medium">
                   <ArrowRight size={14} className="mt-0.5 text-indigo-400 shrink-0" />
                   {text}
                 </li>
               ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
