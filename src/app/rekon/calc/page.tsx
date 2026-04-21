"use client";

import {
  Search,
  Plus,
  X,
  ChevronDown,
  ArrowRight,
  Receipt,
  Truck,
  Percent,
  Calendar,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Download,
  Building2,
  CircleDollarSign,
  TrendingDown,
  LayoutGrid,
  ChevronRight,
  CreditCard,
  Save,
  Loader2,
  Upload,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), { ssr: false });

interface Company {
  id: string;
  namaPt: string;
}

interface Invoice {
  id: string;
  noInvoice: string;
  noPo: string;
  companyId: string;
  total: number;
}

interface Rtv {
  id: string;
  noRtv: string;
  companyId: string;
  total: number;
  qty: number;
  refInvoice?: string;
}

interface Promo {
  id: string;
  nomor: string;
  kegiatan: string;
  periode: string;
  tanggal: string;
  total: number;
}

export default function RekonPage() {
  const [masterCompanies, setMasterCompanies] = useState<Company[]>([]);
  const [masterInvoices, setMasterInvoices] = useState<any[]>([]);
  const [masterRtvs, setMasterRtvs] = useState<any[]>([]);
  const [masterInvoicesList, setMasterInvoicesList] = useState<string[]>([]);
  const [masterRtvsList, setMasterRtvsList] = useState<string[]>([]);
  const [masterPromos, setMasterPromos] = useState<Promo[]>([]);

  const [bankStatement, setBankStatement] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [selectedRtvs, setSelectedRtvs] = useState<Rtv[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [adminFee, setAdminFee] = useState<number>(0);

  const [invSearch, setInvSearch] = useState("");
  const [rtvSearch, setRtvSearch] = useState("");
  const [promoSearch, setPromoSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isInvOpen, setIsInvOpen] = useState(false);
  const [isRtvOpen, setIsRtvOpen] = useState(false);
  const [openExcelModal, setOpenExcelModal] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/ritel");
        const json = await res.json();
        setMasterCompanies(Array.isArray(json) ? json : (json.data || []));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const fetchCompanyData = async (companyName: string, ritelId?: string) => {
    try {
      setIsDataLoading(true);
      setMasterInvoicesList([]);
      setMasterRtvsList([]);
      
      const res = await fetch(`/api/rekon/lookup?companyName=${encodeURIComponent(companyName)}`);
      const json = await res.json();
      
      setMasterInvoicesList(json.invoices || []);
      setMasterRtvsList(json.rtvs || []);

      // Fetch promos specifically for this retailer
      const promoUrl = ritelId ? `/api/promo?ritelId=${ritelId}&mode=list` : "/api/promo?mode=list";
      const promoRes = await fetch(promoUrl);
      const promoJson = await promoRes.json();
      setMasterPromos(Array.isArray(promoJson) ? promoJson : (promoJson.data || []));
    } catch (err) {
      console.error("Fetch Suggestions Error:", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSelectInvoice = async (invoiceNo: string) => {
    try {
      const res = await fetch(`/api/rekon/lookup?invoiceNo=${encodeURIComponent(invoiceNo)}&companyName=${encodeURIComponent(selectedCompany?.namaPt || "")}`);
      const json = await res.json();
      const pos = json.data || [];
      if (pos.length > 0) {
        const po = pos[0];
        const newInv = {
          id: po.id,
          noInvoice: po.noInvoice,
          noPo: po.noPo,
          companyId: po.ritelId || selectedCompany?.id || "",
          total: po.totalTagihan || po.totalNominal || po.Items?.reduce((s: number, i: any) => s + (i.rpTagih || (i.hargaPcs * i.pcsKirim) || 0), 0) || 0
        };
        if (!selectedInvoices.find(x => x.id === newInv.id)) {
           setSelectedInvoices([...selectedInvoices, newInv]);
        }
      }
      setInvSearch("");
      setIsInvOpen(false);
    } catch (err) {
      console.error("Select Invoice Error:", err);
    }
  };

  const handleSelectRtv = async (rtvNo: string) => {
    try {
      const res = await fetch(`/api/rekon/lookup?rtvNo=${encodeURIComponent(rtvNo)}&companyName=${encodeURIComponent(selectedCompany?.namaPt || "")}`);
      const json = await res.json();
      const returs = json.data || [];
      
      if (returs.length > 0) {
        // Map over all records with correct schema field names
        const mappedRtvs = returs.map((r: any) => ({
          id: r.id,
          noRtv: r.rtvCn || r.noRtv || rtvNo,
          companyId: r.ritelId || selectedCompany?.id || "",
          qty: r.qtyReturn || r.qty || r.pcs || r.jumlah || 1,
          total: r.nominal || r.rpTagih || r.total || r.rpNett || r.amount || 0,
          refInvoice: ""
        }));

        // Filter out items that are already selected by ID
        setSelectedRtvs(prev => {
           const existingIds = new Set(prev.map(x => x.id));
           const newItems = mappedRtvs.filter((m: any) => !existingIds.has(m.id));
           return [...prev, ...newItems];
        });
      }
      
      setRtvSearch("");
      setIsRtvOpen(false);
    } catch (err) {
      console.error("Select RTV Error:", err);
    }
  };

  const availableInvoices = useMemo(() => {
    return masterInvoicesList.filter(no => 
       no.toLowerCase().includes(invSearch.toLowerCase()) && 
       !selectedInvoices.find(s => s.noInvoice === no)
    );
  }, [masterInvoicesList, invSearch, selectedInvoices]);

  const availableRtvs = useMemo(() => {
    return masterRtvsList.filter(no => 
       no.toLowerCase().includes(rtvSearch.toLowerCase()) && 
       !selectedRtvs.find(s => s.noRtv === no)
    );
  }, [masterRtvsList, rtvSearch, selectedRtvs]);

  const totalInvoices = useMemo(() => {
    return selectedInvoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);
  }, [selectedInvoices]);

  const totalRtv = useMemo(() => {
    return selectedRtvs.reduce((acc, rtv) => acc + Number(rtv.total || 0), 0);
  }, [selectedRtvs]);

  const totalPromo = useMemo(() => {
    return selectedPromo ? Number(selectedPromo.total || 0) : 0;
  }, [selectedPromo]);

  // FINAL CALCULATION: Rekening Koran - Total Invoice + Total RTV + Tagihan Promo + Biaya Admin
  const balanceNetDue = Number(bankStatement || 0) - totalInvoices + totalRtv + totalPromo + Number(adminFee || 0);

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const handleSaveRekon = async () => {
    if (!selectedCompany) {
      Swal.fire({ icon: "warning", title: "Oops!", text: "Pilih company terlebih dahulu!", customClass: { popup: "rounded-[32px] font-sans" } });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: "Simpan Rekonsiliasi?",
      text: "Data ini akan disimpan ke dalam arsip rekonsiliasi.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan!",
      cancelButtonText: "Batal",
      confirmButtonColor: "#5c56f6",
      customClass: { popup: "rounded-[32px] font-sans", confirmButton: "rounded-xl px-6 py-3", cancelButton: "rounded-xl px-6 py-3" }
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ritelId: selectedCompany.id,
        bankStatement: bankStatement,
        biayaAdmin: adminFee,
        totalInvoices: totalInvoices,
        totalRtvs: totalRtv,
        totalPromo: totalPromo,
        nominal: balanceNetDue,
        invoices: selectedInvoices.map(inv => inv.noInvoice),
        rtvs: selectedRtvs.map(rtv => ({ 
          noRtv: rtv.noRtv, 
          refInvoice: rtv.refInvoice || "" 
        })),
        noPromo: selectedPromo?.nomor || null
      };

      const res = await fetch("/api/rekon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Data rekonsiliasi telah disimpan ke arsip.",
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: "rounded-[32px] font-sans" }
      });

      router.push("/rekon/data");
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message, customClass: { popup: "rounded-[32px] font-sans" } });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-24 text-center font-black text-slate-200 uppercase tracking-widest italic animate-pulse">Synchronizing Data...</div>;

  return (
    <div className="max-w-[1850px] mx-auto p-8 lg:p-12 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-16 px-4">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-[#5c56f6] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
              <LayoutGrid size={32} strokeWidth={2.5} />
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Kalkulator Rekon</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Rekonsiliasi &gt; Kalkulasi</p>
           </div>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => setOpenExcelModal(true)}
             className="px-10 py-3 bg-[#5c56f6] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 transition-all"
           >
              <Upload size={14} strokeWidth={3} />
              Bulk Upload
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Left Workflow Area (LOCKED TO PREVENT SIDEBAR PUSHING) */}
        <div className="flex-1 space-y-12 min-w-0">
           
           {/* STEP 1: Bank Statement */}
           <div className="bg-white rounded-[40px] p-10 border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] space-y-8 relative">
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-black text-xs shadow-lg">1</div>
                 <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Rekening Koran (Bank Statement)</h3>
              </div>
              <div className="relative group">
                 <div className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#f59e0b] transition-colors">
                    <CircleDollarSign size={36} />
                 </div>
                 <input 
                    type="text" 
                    placeholder="Input Nominal Rp..." 
                    className="w-full h-28 pl-32 pr-12 bg-[#f8fafc] rounded-[36px] border-none outline-none font-black text-4xl text-slate-700 placeholder:text-slate-200 transition-all focus:bg-white focus:ring-4 focus:ring-orange-50/50"
                    onChange={e => setBankStatement(Number(e.target.value.replace(/[^0-9]/g, '')))}
                    value={bankStatement ? new Intl.NumberFormat("id-ID").format(bankStatement) : ""}
                 />
                 <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-200 uppercase tracking-widest">Rekening Koran</span>
              </div>
           </div>

           {/* STEP 2: Lookup Invoice & Retur (REDESIGNED FOR GRID TABLE) */}
           <div className="bg-white rounded-[48px] p-10 border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] space-y-10 relative">
              <div className="flex items-center gap-4 mb-2">
                 <div className="w-8 h-8 rounded-full bg-[#5c56f6] text-white flex items-center justify-center font-black text-xs shadow-lg">2</div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Lookup Invoice, Retur & Promo</h3>
              </div>

              {/* Company Selection Dropdown - Premium */}
              <div className="w-full">
                 <Popover.Root open={isCompanyOpen} onOpenChange={setIsCompanyOpen}>
                    <Popover.Trigger asChild>
                       <button className={`w-full h-16 px-10 rounded-[28px] border transition-all flex items-center justify-between outline-none ${selectedCompany ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-xl shadow-indigo-100/30' : 'bg-[#f8fafc] border-slate-50 text-slate-400 hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-5">
                             <Building2 size={22} className={selectedCompany ? 'text-indigo-500' : 'text-slate-300'} />
                             <span className="font-black uppercase tracking-[0.2em] text-[10px] italic">{selectedCompany ? selectedCompany.namaPt : "Pilih Company / Ritel Modern..."}</span>
                          </div>
                          <ChevronDown size={18} className={selectedCompany ? 'text-indigo-400' : 'text-slate-200'} />
                       </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                       <Popover.Content className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white rounded-[40px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.18)] border border-slate-50 p-6 animate-in fade-in zoom-in-95" align="start">
                          <div className="max-h-[350px] overflow-y-auto no-scrollbar space-y-1">
                             {Array.from(new Map(masterCompanies.map(item => [item.namaPt, item])).values()).map(c => (
                                <button key={c.id} onClick={() => { setSelectedCompany(c); setIsCompanyOpen(false); setSelectedInvoices([]); setSelectedRtvs([]); setSelectedPromo(null); fetchCompanyData(c.namaPt, c.id); }} className={`w-full text-left p-5 rounded-[22px] transition-all font-black text-[11px] uppercase flex items-center justify-between ${selectedCompany?.id === c.id ? 'bg-[#5c56f6] text-white shadow-2xl' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                                   {c.namaPt}
                                   <ChevronRight size={14} className={selectedCompany?.id === c.id ? 'opacity-100' : 'opacity-0'} />
                                </button>
                             ))}
                          </div>
                       </Popover.Content>
                    </Popover.Portal>
                 </Popover.Root>
              </div>

               {selectedCompany ? (
                  <div className="space-y-8 animate-in fade-in duration-500 pt-4">
                     <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-x-12">
                    
                    {/* LEFT COLUMN: LOOKUP INVOICE */}
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2 uppercase">Lookup Invoice</h4>
                       {/* Search Input Invoice with Suggestions */}
                       <div className="relative group" onClick={() => setIsInvOpen(true)}>
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={20} />
                          <Popover.Root open={isInvOpen} onOpenChange={setIsInvOpen} modal={false}>
                             <Popover.Anchor asChild>
                                <input 
                                   type="text" 
                                   placeholder="Input Nomor Invoice..." 
                                   className="w-full h-18 pl-16 pr-8 bg-[#f8fafc] rounded-[28px] border-none outline-none font-bold text-xs text-slate-600 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all uppercase cursor-pointer" 
                                   value={invSearch} 
                                   onChange={e => { setInvSearch(e.target.value); setIsInvOpen(true); }}
                                   onFocus={() => setIsInvOpen(true)}
                                   onBlur={() => setTimeout(() => setIsInvOpen(false), 300)}
                                />
                             </Popover.Anchor>
                             <Popover.Portal>
                                <Popover.Content 
                                   className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] border border-slate-50 p-4 animate-in fade-in zoom-in-95 duration-200" 
                                   align="start" 
                                   sideOffset={10}
                                   onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                   <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-1">
                                      {isDataLoading ? (
                                         <div className="p-8 text-center text-[10px] font-black text-indigo-400 uppercase italic tracking-widest animate-pulse">
                                            Sedang menarik data...
                                         </div>
                                      ) : availableInvoices.length === 0 ? (
                                         <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                                            Tidak ada invoice tersedia
                                         </div>
                                      ) : (
                                         availableInvoices.map(invNo => (
                                            <button 
                                               key={invNo} 
                                               onClick={() => handleSelectInvoice(invNo)} 
                                               className="w-full p-5 hover:bg-indigo-50 rounded-2xl transition-all flex justify-between items-center group text-left border border-transparent hover:border-indigo-100"
                                            >
                                               <div>
                                                  <p className="font-black text-[12px] text-slate-800 uppercase tracking-tight">{invNo}</p>
                                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Pilih Invoice ini</p>
                                               </div>
                                               <div className="text-right">
                                                  <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase">
                                                     <Plus size={8} /> Ambil Detail
                                                  </div>
                                               </div>
                                            </button>
                                         ))
                                      )}
                                   </div>
                                </Popover.Content>
                             </Popover.Portal>
                          </Popover.Root>
                       </div>

                       {/* Table Invoice Container */}
                       <div className="bg-[#f8fafc] rounded-[32px] border border-slate-100 shadow-sm w-full relative overflow-hidden">
                          <div className="max-h-[280px] overflow-auto no-scrollbar scroll-smooth relative">
                             <table className="w-full text-left border-collapse min-w-[520px] table-auto">
                                <thead>
                                   <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-white sticky top-0 bg-[#f8fafc] z-10">
                                      <th className="px-6 py-5 min-w-[180px]">Invoice</th>
                                      <th className="px-4 py-5 min-w-[120px] font-black text-center">PO</th>
                                      <th className="px-6 py-5 min-w-[140px] text-right font-black">Nominal</th>
                                      <th className="px-4 py-5 w-12 text-center">#</th>
                                   </tr>
                                </thead>
                                <tbody className="text-[11px] font-black">
                                   {selectedInvoices.map(inv => (
                                      <tr key={inv.id} className="group hover:bg-white transition-colors border-b border-indigo-50/20">
                                         <td className="px-6 py-4 text-[#5c56f6] uppercase whitespace-nowrap">{inv.noInvoice}</td>
                                         <td className="px-4 py-4 text-slate-400 uppercase tracking-tighter text-center whitespace-nowrap">{inv.noPo}</td>
                                         <td className="px-6 py-4 text-right text-slate-800 tabular-nums font-black whitespace-nowrap">{formatRp(inv.total)}</td>
                                         <td className="px-4 py-4 text-center">
                                            <button onClick={() => setSelectedInvoices(selectedInvoices.filter(x => x.id !== inv.id))} className="w-6 h-6 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto opacity-40 group-hover:opacity-100 transition-opacity hover:bg-rose-100"><X size={12} /></button>
                                         </td>
                                      </tr>
                                   ))}
                             {selectedInvoices.length === 0 && (
                                <tr>
                                   <td colSpan={3} className="px-8 py-16 text-center text-slate-300 italic uppercase italic text-[10px]">Belum ada Invoice terpilih</td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

                    {/* VERTICAL SEPARATOR */}
                    <div className="hidden lg:block w-[1px] bg-slate-100 h-full self-stretch my-4"></div>

                    {/* RIGHT COLUMN: LOOKUP RTV */}
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2 uppercase">Lookup RTV</h4>
                       {/* Search Input RTV with Suggestions */}
                       <div className="relative group" onClick={() => setIsRtvOpen(true)}>
                          <Plus className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors pointer-events-none" size={20} />
                          <Popover.Root open={isRtvOpen} onOpenChange={setIsRtvOpen} modal={false}>
                             <Popover.Anchor asChild>
                                <input 
                                   type="text" 
                                   placeholder="Input Nomor RTV/CN..." 
                                   className="w-full h-18 pl-16 pr-8 bg-[#f8fafc] rounded-[28px] border-none outline-none font-bold text-xs text-slate-600 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-rose-50/50 transition-all uppercase cursor-pointer" 
                                   value={rtvSearch} 
                                   onChange={e => { setRtvSearch(e.target.value); setIsRtvOpen(true); }}
                                   onFocus={() => setIsRtvOpen(true)}
                                   onBlur={() => setTimeout(() => setIsRtvOpen(false), 300)}
                                />
                             </Popover.Anchor>
                             <Popover.Portal>
                                <Popover.Content 
                                   className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] border border-slate-50 p-4 animate-in fade-in zoom-in-95 duration-200" 
                                   align="start" 
                                   sideOffset={10}
                                   onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                   <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-1">
                                      {isDataLoading ? (
                                         <div className="p-8 text-center text-[10px] font-black text-rose-400 uppercase italic tracking-widest animate-pulse">
                                            Sedang menarik data...
                                         </div>
                                      ) : availableRtvs.length === 0 ? (
                                         <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                                            Tidak ada RTV tersedia
                                         </div>
                                      ) : (
                                         availableRtvs.map(rtvNo => (
                                            <button 
                                               key={rtvNo} 
                                               onClick={() => handleSelectRtv(rtvNo)} 
                                               className="w-full p-5 hover:bg-rose-50 rounded-2xl transition-all flex justify-between items-center group text-left border border-transparent hover:border-rose-100"
                                            >
                                               <div>
                                                  <p className="font-black text-[12px] text-slate-800 uppercase tracking-tight">{rtvNo}</p>
                                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic tracking-widest italic">Pilih RTV ini</p>
                                               </div>
                                               <div className="text-right">
                                                  <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase">
                                                     <Plus size={8} /> Ambil Detail
                                                  </div>
                                               </div>
                                            </button>
                                         ))
                                      )}
                                   </div>
                                </Popover.Content>
                             </Popover.Portal>
                          </Popover.Root>
                       </div>

                       {/* Table RTV Container */}
                       <div className="bg-[#f8fafc] rounded-[32px] border border-slate-100 shadow-sm w-full relative overflow-hidden">
                          <div className="max-h-[250px] overflow-auto no-scrollbar scroll-smooth relative">
                             <table className="w-full text-left border-collapse min-w-[420px] table-auto">
                                <thead>
                                   <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-white sticky top-0 bg-[#f8fafc] z-10 transition-colors">
                                      <th className="px-4 py-5 min-w-[140px]">RTV/CN</th>
                                      <th className="px-2 py-5 min-w-[50px] text-center font-black">QTY</th>
                                      <th className="px-4 py-5 min-w-[150px] font-black">Ref Invoice</th>
                                      <th className="px-4 py-5 min-w-[110px] text-right font-black">NOMINAL</th>
                                      <th className="px-3 py-5 w-10 text-center">#</th>
                                   </tr>
                                </thead>
                                <tbody className="text-[11px] font-black">
                                   {selectedRtvs.map(rtv => (
                                      <tr key={rtv.id} className="group hover:bg-white transition-colors border-b border-rose-50/20">
                                         <td className="px-4 py-4 text-rose-500 uppercase whitespace-nowrap tracking-tight">{rtv.noRtv}</td>
                                         <td className="px-2 py-4 text-center text-slate-400 tabular-nums whitespace-nowrap">{rtv.qty}</td>
                                         <td className="px-4 py-4">
                                            <Popover.Root>
                                               <Popover.Trigger asChild>
                                                  <button className="flex items-center justify-between w-full h-8 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all text-slate-600 group">
                                                     <span className="truncate">{rtv.refInvoice || "Pilih Invoice..."}</span>
                                                     <ChevronDown size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 ml-2" />
                                                  </button>
                                               </Popover.Trigger>
                                               <Popover.Portal>
                                                  <Popover.Content 
                                                     className="z-[110] w-[200px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in zoom-in-95" 
                                                     sideOffset={5}
                                                     align="start"
                                                  >
                                                     <div className="max-h-[200px] overflow-y-auto no-scrollbar space-y-1">
                                                        <button 
                                                           onClick={() => setSelectedRtvs(selectedRtvs.map(x => x.id === rtv.id ? { ...x, refInvoice: "" } : x))}
                                                           className="w-full text-left px-4 py-3 hover:bg-rose-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-400 transition-colors"
                                                        >
                                                           • Reset Pilihan
                                                        </button>
                                                        {selectedInvoices.map(inv => (
                                                           <button 
                                                              key={inv.id}
                                                              onClick={() => setSelectedRtvs(selectedRtvs.map(x => x.id === rtv.id ? { ...x, refInvoice: inv.noInvoice } : x))}
                                                              className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 transition-colors"
                                                           >
                                                              {inv.noInvoice}
                                                           </button>
                                                        ))}
                                                        {selectedInvoices.length === 0 && (
                                                           <p className="px-4 py-4 text-[8px] font-black text-slate-300 uppercase italic">Belum ada invoice terpilih di kiri</p>
                                                        )}
                                                     </div>
                                                  </Popover.Content>
                                               </Popover.Portal>
                                            </Popover.Root>
                                         </td>
                                         <td className="px-4 py-4 text-right text-slate-800 tabular-nums font-black whitespace-nowrap">{formatRp(rtv.total)}</td>
                                         <td className="px-3 py-4 text-center">
                                            <button onClick={() => setSelectedRtvs(selectedRtvs.filter(x => x.id !== rtv.id))} className="w-5 h-5 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto opacity-40 group-hover:opacity-100 transition-opacity hover:bg-rose-100 transition-all"><X size={10} /></button>
                                         </td>
                                      </tr>
                                   ))}
                                   {selectedRtvs.length === 0 && (
                                      <tr>
                                         <td colSpan={4} className="px-8 py-16 text-center text-slate-300 italic uppercase text-[10px]">Belum ada RTV terpilih</td>
                                      </tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                        </div>
                     </div>
                     </div>

                  {/* HORIZONTAL SEPARATOR */}
                  <div className="py-2">
                     <div className="h-[1px] bg-slate-100 w-full"></div>
                  </div>

                  {/* BOTTOM ROW: LOOKUP PROMO (FULL WIDTH) */}
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2 uppercase">Lookup Promo</h4>
                        <div className="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">Retailer-Linked Promo</div>
                     </div>
                     <div className="relative group" onClick={() => setIsPromoOpen(true)}>
                        <Percent className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={20} />
                        <Popover.Root open={isPromoOpen} onOpenChange={setIsPromoOpen} modal={false}>
                           <Popover.Anchor asChild>
                              <input 
                                 type="text" 
                                 placeholder="Input Nomor Promo..." 
                                 className="w-full h-16 pl-16 pr-8 bg-[#f8fafc] rounded-[28px] border-none outline-none font-bold text-xs text-slate-600 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all uppercase cursor-pointer" 
                                 value={promoSearch} 
                                 onChange={e => { setPromoSearch(e.target.value); setIsPromoOpen(true); }}
                                 onFocus={() => setIsPromoOpen(true)}
                                 onBlur={() => setTimeout(() => setIsPromoOpen(false), 300)}
                              />
                           </Popover.Anchor>
                           <Popover.Portal>
                              <Popover.Content 
                                 className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] border border-slate-50 p-4 animate-in fade-in zoom-in-95 duration-200" 
                                 align="start" 
                                 sideOffset={10}
                                 onOpenAutoFocus={(e) => e.preventDefault()}
                              >
                                 <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-1">
                                    {isDataLoading ? (
                                       <div className="p-8 text-center text-[10px] font-black text-emerald-400 uppercase italic tracking-widest animate-pulse">
                                          Sedang menarik data...
                                       </div>
                                    ) : (masterPromos || []).filter(p => ((p.nomor || "") + (p.kegiatan || "")).toLowerCase().includes(promoSearch.toLowerCase())).length === 0 ? (
                                       <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                                          Tidak ada Promo tersedia untuk retailer ini
                                       </div>
                                    ) : (
                                       masterPromos.filter(p => ((p.nomor || "") + (p.kegiatan || "")).toLowerCase().includes(promoSearch.toLowerCase())).map(promo => (
                                          <button 
                                             key={promo.id} 
                                             onClick={() => { setSelectedPromo(promo); setIsPromoOpen(false); setPromoSearch(""); }} 
                                             className="w-full p-5 hover:bg-emerald-50 rounded-2xl transition-all flex justify-between items-center group text-left border border-transparent hover:border-emerald-100"
                                          >
                                             <div className="flex items-center gap-5">
                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                   <Percent size={18} />
                                                </div>
                                                <div>
                                                   <p className="font-black text-[12px] text-slate-800 uppercase tracking-tight">{promo.nomor}</p>
                                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">{promo.kegiatan} • {promo.periode}</p>
                                                </div>
                                             </div>
                                             <div className="text-right">
                                                <div className="text-[12px] font-black text-emerald-600 uppercase">
                                                   {formatRp(promo.total)}
                                                </div>
                                             </div>
                                          </button>
                                       ))
                                    )}
                                 </div>
                              </Popover.Content>
                           </Popover.Portal>
                        </Popover.Root>
                     </div>

                     {/* Selected Promo Summary Card (Sleek & Compact) */}
                     {selectedPromo && (
                        <div className="bg-white rounded-[32px] p-6 border border-emerald-100 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)] animate-in slide-in-from-top-4 flex items-center justify-between group relative overflow-hidden">
                           <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                                 <Percent size={24} />
                              </div>
                              <div className="space-y-1">
                                 <h5 className="font-black text-sm text-slate-800 uppercase tracking-tight leading-none">{selectedPromo.nomor}</h5>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{selectedPromo.kegiatan} • {selectedPromo.periode}</p>
                                 <div className="flex items-center gap-3 mt-1">
                                    <span className="px-2 py-0.5 bg-slate-50 text-[8px] font-black text-slate-400 rounded-md border border-slate-100 uppercase italic">
                                       {selectedPromo.tanggal ? new Date(selectedPromo.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                    </span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-8">
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Total Promo</p>
                                 <p className="text-2xl font-black tabular-nums text-emerald-600 tracking-tighter leading-none">{formatRp(selectedPromo.total)}</p>
                              </div>
                              <button 
                                 onClick={() => setSelectedPromo(null)} 
                                 className="w-10 h-10 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                 title="Hapus Promo"
                              >
                                 <X size={18} />
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
              ) : (
                 <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-50 rounded-[40px] bg-slate-50/20">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm">
                       <Building2 size={32} />
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic leading-relaxed">Pilih rujukan company terlebih dahulu <br/> untuk membuka database Invoice & RTV</p>
                 </div>
              )}
           </div>

           {/* STEP 3: Biaya Admin (INDIGO THEME) */}
           <div className="bg-white rounded-[40px] p-10 border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] space-y-8 relative">
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shadow-lg">3</div>
                 <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Biaya Admin (Bank Charges)</h3>
              </div>
              <div className="relative group">
                 <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-slate-800 transition-colors">
                    <CreditCard size={28} />
                 </div>
                 <input 
                    type="text" 
                    placeholder="Input Biaya Admin..." 
                    className="w-full h-20 pl-24 pr-12 bg-[#f8fafc] rounded-[28px] border-none outline-none font-black text-2xl text-slate-700 placeholder:text-slate-200 transition-all focus:bg-white focus:ring-4 focus:ring-slate-100/50"
                    onChange={e => setAdminFee(Number(e.target.value.replace(/[^0-9]/g, '')))}
                    value={adminFee ? new Intl.NumberFormat("id-ID").format(adminFee) : ""}
                 />
              </div>
           </div>

        </div>

        {/* REKON SUMMARY (SIDEBAR) */}
        <div className="w-full lg:w-[460px] lg:sticky lg:top-12">
           <div className="bg-[#0f172a] text-white rounded-[56px] p-12 shadow-[0_80px_100px_-20px_rgba(0,0,0,0.4)]">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-14 italic">Rekon Summary</h2>
              
              <div className="space-y-10">
                 {/* Item Row 1 */}
                 <div className="flex justify-between items-start group cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-[#f59e0b] group-hover:text-white transition-all shrink-0"><CircleDollarSign size={16} /></div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bank Statement</p>
                          <p className="text-[10px] font-bold text-slate-400 italic">Rekening Koran</p>
                       </div>
                    </div>
                    <p className="text-sm lg:text-base font-black tabular-nums text-[#f59e0b] text-right break-all leading-tight max-w-[200px]">{formatRp(bankStatement)}</p>
                 </div>

                 {/* Item Row 2 */}
                 <div className="flex justify-between items-start group cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-[#5c56f6] group-hover:text-white transition-all shrink-0"><Receipt size={16} /></div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gross Billing</p>
                          <p className="text-[10px] font-bold text-slate-400 italic">Total Invoices</p>
                       </div>
                    </div>
                    <p className="text-sm lg:text-base font-black tabular-nums text-white text-right break-all leading-tight max-w-[200px]">{formatRp(totalInvoices)}</p>
                 </div>

                 {/* Item Row 3 */}
                 <div className="flex justify-between items-start group cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-[#e11d48] group-hover:text-white transition-all shrink-0"><TrendingDown size={16} /></div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Return Deducts</p>
                          <p className="text-[10px] font-bold text-slate-400 italic">Total RTV/CN</p>
                       </div>
                    </div>
                    <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(totalRtv)})</p>
                 </div>

                 {/* Item Row 4 */}
                 <div className="flex justify-between items-start group cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-[#10b981] group-hover:text-white transition-all shrink-0"><Percent size={16} /></div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Promo Deducts</p>
                          <p className="text-[10px] font-bold text-slate-400 italic">Tagihan Promo</p>
                       </div>
                    </div>
                    <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(totalPromo)})</p>
                 </div>

                 {/* Item Row 5: Admin Fee */}
                 <div className="flex justify-between items-start group cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-slate-900 transition-all shrink-0"><CreditCard size={16} /></div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Admin Fees</p>
                          <p className="text-[10px] font-bold text-slate-400 italic">Biaya Admin</p>
                       </div>
                    </div>
                    <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(adminFee)})</p>
                 </div>

                 <div className="pt-10 border-t border-slate-800/50 space-y-4">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] italic">Balance Net Due</p>
                    <h2 className={`text-3xl lg:text-4xl xl:text-5xl font-black tracking-tighter tabular-nums drop-shadow-2xl break-all leading-none ${balanceNetDue === 0 ? 'text-emerald-400' : balanceNetDue < 0 ? 'text-rose-400' : 'text-white'}`}>
                       {balanceNetDue < 0 ? `-${formatRp(Math.abs(balanceNetDue))}` : formatRp(balanceNetDue)}
                    </h2>
                     {balanceNetDue === 0 && (
                        <div className="inline-flex px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-widest mt-2">
                           Reconciliation Matched
                        </div>
                     )}
                 </div>

                 {/* SUBMIT BUTTON AREA */}
                 <div className="pt-10">
                    <button 
                       onClick={handleSaveRekon}
                       disabled={isSubmitting}
                       className="w-full h-20 bg-[#5c56f6] hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-[30px] flex items-center justify-center gap-4 transition-all shadow-[0_20px_40px_-10px_rgba(92,86,246,0.3)] group active:scale-95 text-white"
                    >
                       {isSubmitting ? (
                          <Loader2 size={24} className="animate-spin text-indigo-200" />
                       ) : (
                          <>
                             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                                <Save size={18} />
                             </div>
                             <span className="text-[11px] font-black uppercase tracking-[0.25em]">Submit Rekonsiliasi</span>
                          </>
                       )}
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-8 opacity-40">
                       <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic text-center">Auto-Arsip ke Database Rekon</p>
                       <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* MODAL BULK UPLOAD */}
      {openExcelModal && (
        <ExcelBulkModal 
          open={openExcelModal}
          onClose={() => setOpenExcelModal(false)}
          variant="rekon"
          title="Bulk Upload Rekon"
          onSuccess={() => {
            setOpenExcelModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
