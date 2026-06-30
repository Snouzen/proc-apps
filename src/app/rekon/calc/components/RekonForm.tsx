import React from "react";
import {
  Search,
  Plus,
  X,
  ChevronDown,
  Percent,
  CircleDollarSign,
  FileText,
  CreditCard,
  Upload,
  ChevronRight
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import DateInputHybrid from "@/components/DateInputHybrid";
import { highlightMatch, formatRp } from "../hooks/useRekonCalc";
import Swal from "sweetalert2";

export default function RekonForm({ calc }: { calc: any }) {
  const {
    masterCompanies,
    bankStatementsList, setBankStatementsList, bankStatement,
    tglBayar, setTglBayar,
    buktiBayarFile, setBuktiBayarFile,
    rincianBayarUrl, setRincianBayarUrl,
    selectedCompany, setSelectedCompany,
    selectedInvoices, setSelectedInvoices,
    selectedRtvs, setSelectedRtvs,
    selectedPromos, setSelectedPromos,
    adminFee, setAdminFee,
    notesList, setNotesList,
    companySearch, setCompanySearch,
    invSearch, setInvSearch,
    rtvSearch, setRtvSearch,
    promoSearch, setPromoSearch,
    refInvoiceSearch, setRefInvoiceSearch,
    isCompanyOpen, setIsCompanyOpen,
    isPromoOpen, setIsPromoOpen,
    isInvOpen, setIsInvOpen,
    isRtvOpen, setIsRtvOpen,
    openRefInvoicePopoverId, setOpenRefInvoicePopoverId,
    openNoteTypeIdx, setOpenNoteTypeIdx,
    isDataLoading,
    availableInvoices, availableRtvs,
    totalNotes,
    handleSelectInvoice, handleSelectRtv, fetchCompanyData, masterPromos
  } = calc;

  return (
    <div className="flex-1 space-y-12 min-w-0">
      {/* STEP 1: Rekening Koran & Bukti Bayar */}
      <div className="bg-white dark:bg-slate-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 border border-white dark:border-slate-700 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] dark:shadow-none space-y-8 sm:space-y-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-black text-xs shadow-lg shrink-0">1</div>
              <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-snug">Rekening Koran & Bukti Bayar</h3>
            </div>
            {tglBayar && (
              <div className="px-4 py-1.5 bg-amber-50 text-[#f59e0b] rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100/50 animate-in fade-in slide-in-from-right-2">
                  Payment Ready
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 relative z-10">
            <div className="md:col-span-12 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Rekening Koran (Bisa lebih dari 1)</label>
                <button 
                  type="button" 
                  onClick={() => setBankStatementsList([...bankStatementsList, { desc: "", nominal: 0 }])}
                  className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm"
                >
                  <Plus size={12} strokeWidth={3} />
                  Tambah Bank Statement
                </button>
              </div>
              
              {bankStatementsList.length === 0 && (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <p className="text-xs text-slate-400 font-bold">Belum ada Bank Statement, klik Tambah di atas.</p>
                </div>
              )}
              
              <div className="space-y-3">
                  {bankStatementsList.map((bs: any, idx: number) => (
                    <div key={idx} className="flex flex-col lg:flex-row gap-3 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex-1 relative h-full min-w-0">
                          <input
                              type="text"
                              placeholder="Keterangan Bank Statement..."
                              value={bs.desc}
                              onChange={(e) => {
                                const updated = [...bankStatementsList];
                                updated[idx] = { ...updated[idx], desc: e.target.value };
                                setBankStatementsList(updated);
                              }}
                              className="w-full h-full min-h-[56px] px-5 py-4 bg-white/70 dark:bg-amber-900/10 backdrop-blur-md rounded-2xl border border-white dark:border-amber-800/30 focus:border-amber-200 dark:focus:border-amber-500/50 outline-none font-bold text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-amber-900/30 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none focus:shadow-[0_4px_20px_rgba(245,158,11,0.1)] transition-all"
                          />
                        </div>
                        <div className="w-full lg:w-[35%] relative h-full shrink-0">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500">
                             <CircleDollarSign size={20} />
                          </div>
                          <input
                              type="text"
                              placeholder="0"
                              value={bs.nominal ? bs.nominal.toLocaleString('id-ID') : ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                const updated = [...bankStatementsList];
                                updated[idx] = { ...updated[idx], nominal: Number(raw) || 0 };
                                setBankStatementsList(updated);
                              }}
                              className="w-full h-full min-h-[56px] pl-12 pr-5 py-4 bg-white/70 dark:bg-amber-900/10 backdrop-blur-md rounded-2xl border border-white dark:border-amber-800/30 focus:border-amber-200 dark:focus:border-amber-500/50 outline-none font-black text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-amber-900/30 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none focus:shadow-[0_4px_20px_rgba(245,158,11,0.1)] transition-all text-right tabular-nums"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setBankStatementsList(bankStatementsList.filter((_: any, i: number) => i !== idx))}
                          className="w-12 lg:w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-400 dark:text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
                          title="Hapus baris"
                        >
                          <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                  ))}
              </div>
              {bankStatementsList.length > 0 && (
                 <div className="pt-2 flex justify-end items-center px-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Total Bank Statement</p>
                     <p className="text-xl font-black tabular-nums text-amber-500">Rp {bankStatement.toLocaleString('id-ID')}</p>
                 </div>
              )}
            </div>

            <div className="md:col-span-5 space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Pembayaran</label>
              <div className="h-16 flex items-center">
                  <DateInputHybrid 
                    value={tglBayar} 
                    onChange={setTglBayar}
                    placeholder="Pilih Tanggal..."
                    className="w-full h-full"
                  />
              </div>
            </div>

            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Rincian Bayar (Excel/Spreadsheet)</label>
                  <div className="relative group h-16">
                    <input 
                        type="url" 
                        placeholder="https://..."
                        className="w-full h-full px-6 bg-[#f8fafc] dark:bg-slate-900/50 rounded-2xl border-none outline-none font-bold text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-500/20 transition-all shadow-sm"
                        value={rincianBayarUrl}
                        onChange={(e) => setRincianBayarUrl(e.target.value)}
                    />
                  </div>
              </div>
              <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bukti Bayar (Max 1MB)</label>
                  <div className="relative group h-16">
                    <input 
                        type="file" 
                        accept="image/*,.pdf"
                        className="hidden" 
                        id="bukti-bayar-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                              if (file.size > 1024 * 1024) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'File Terlalu Besar',
                                    text: 'Maksimal ukuran file adalah 1MB bro!',
                                    customClass: { popup: "rounded-[32px] font-sans" }
                                });
                                e.target.value = '';
                                return;
                              }
                              setBuktiBayarFile(file);
                          }
                        }}
                    />
                    <label 
                        htmlFor="bukti-bayar-upload"
                        className={`w-full h-full rounded-2xl border-2 border-dashed flex items-center px-6 gap-4 cursor-pointer transition-all ${buktiBayarFile ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-500/10' : 'border-slate-100 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-900/50 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-amber-50/20 dark:hover:bg-amber-500/10'}`}
                    >
                        <div className={`p-2 rounded-xl ${buktiBayarFile ? 'bg-amber-400 text-white shadow-lg shadow-amber-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-500 shadow-sm'}`}>
                          <Upload size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-black uppercase tracking-tight truncate ${buktiBayarFile ? 'text-amber-600' : 'text-slate-400'}`}>
                              {buktiBayarFile ? buktiBayarFile.name : "Upload Bukti Bayar..."}
                          </p>
                          {buktiBayarFile && (
                              <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                                {(buktiBayarFile.size / 1024).toFixed(1)} KB • Klik untuk ganti
                              </p>
                          )}
                        </div>
                        {buktiBayarFile && (
                          <button 
                              onClick={(e) => { e.preventDefault(); setBuktiBayarFile(null); }}
                              className="p-2 hover:bg-rose-50 text-rose-400 rounded-lg transition-colors"
                          >
                              <X size={14} />
                          </button>
                        )}
                    </label>
                  </div>
              </div>
            </div>
        </div>
      </div>

      {/* STEP 2: Lookup Invoice, Retur & Promo */}
      <div className="bg-white dark:bg-slate-800 rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 border border-white dark:border-slate-700 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] dark:shadow-none space-y-8 sm:space-y-10 relative overflow-hidden w-full max-w-full min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#5c56f6] text-white flex items-center justify-center font-black text-xs shadow-lg shrink-0">2</div>
            <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-snug">Lookup Invoice, Retur & Promo</h3>
        </div>

        <div className="w-full relative group">
            <Popover.Root open={isCompanyOpen} onOpenChange={setIsCompanyOpen} modal={false}>
              <Popover.Anchor asChild>
                  <div className={`relative w-full h-16 rounded-[28px] border transition-all flex items-center justify-between overflow-hidden cursor-pointer ${selectedCompany && !isCompanyOpen ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 shadow-xl shadow-indigo-100/30 dark:shadow-none' : 'bg-[#f8fafc] dark:bg-slate-900/50 border-slate-50 dark:border-slate-700 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-50/50 dark:focus-within:ring-indigo-500/20'}`}>
                    <div className="flex items-center gap-3 sm:gap-5 w-full pl-4 sm:pl-10 pr-10 sm:pr-12">
                        <CircleDollarSign size={22} className={`shrink-0 ${selectedCompany && !isCompanyOpen ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors'}`} />
                        <input
                          type="text"
                          placeholder={selectedCompany ? selectedCompany.namaPt : "PILIH COMPANY / RITEL MODERN..."}
                          className={`w-full bg-transparent border-none outline-none font-black uppercase tracking-widest sm:tracking-[0.2em] text-[9px] sm:text-[10px] truncate ${selectedCompany && !isCompanyOpen ? 'text-indigo-600 dark:text-indigo-300 italic cursor-pointer' : 'text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:italic'}`}
                          value={companySearch}
                          onChange={e => { setCompanySearch(e.target.value); setIsCompanyOpen(true); }}
                          onFocus={() => setIsCompanyOpen(true)}
                          onBlur={() => setTimeout(() => setIsCompanyOpen(false), 300)}
                        />
                    </div>
                    <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown size={18} className={selectedCompany && !isCompanyOpen ? 'text-indigo-400' : 'text-slate-200 dark:text-slate-600'} />
                    </div>
                  </div>
              </Popover.Anchor>
              <Popover.Portal>
                  <Popover.Content className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white dark:bg-slate-800 rounded-[40px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-50 dark:border-slate-700 p-4 sm:p-6 animate-in fade-in zoom-in-95 mt-2" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <div className="max-h-[350px] overflow-y-auto no-scrollbar space-y-1">
                        {Array.from(new Map(masterCompanies.map((item: any) => [item.namaPt, item])).values())
                          .filter((c: any) => c.namaPt.toLowerCase().includes(companySearch.toLowerCase()))
                          .map((c: any) => (
                          <button key={c.id} onClick={() => { setSelectedCompany(c); setCompanySearch(""); setIsCompanyOpen(false); setSelectedInvoices([]); setSelectedRtvs([]); setSelectedPromos([]); fetchCompanyData(c.namaPt, c.id); }} className={`w-full text-left p-4 sm:p-5 rounded-[22px] transition-all font-black text-[10px] sm:text-[11px] uppercase flex items-center justify-between ${selectedCompany?.id === c.id ? 'bg-[#5c56f6] text-white shadow-2xl dark:shadow-none' : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300'}`}>
                              <span className="truncate pr-2">{highlightMatch(c.namaPt, companySearch)}</span>
                              <ChevronRight size={14} className={`shrink-0 ${selectedCompany?.id === c.id ? 'opacity-100' : 'opacity-0'}`} />
                          </button>
                        ))}
                        {Array.from(new Map(masterCompanies.map((item: any) => [item.namaPt, item])).values())
                          .filter((c: any) => c.namaPt.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                          <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                              Tidak ada Company ditemukan
                          </div>
                        )}
                    </div>
                  </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
        </div>

          {selectedCompany ? (
            <div className="space-y-8 animate-in fade-in duration-500 pt-4 w-full min-w-0">
                <div className="flex flex-col gap-12 w-full min-w-0">
              
              <div className="space-y-6 sm:space-y-8 min-w-0 w-full max-w-full">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-2">Lookup Invoice</h4>
                  <div className="relative group" onClick={() => setIsInvOpen(true)}>
                    <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={20} />
                    <Popover.Root open={isInvOpen} onOpenChange={setIsInvOpen} modal={false}>
                        <Popover.Anchor asChild>
                          <input 
                              type="text" 
                              placeholder="Input Nomor Invoice..." 
                              className="w-full h-16 pl-12 sm:pl-16 pr-4 sm:pr-8 bg-[#f8fafc] dark:bg-slate-900/50 rounded-[28px] border-none outline-none font-bold text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-500/20 transition-all uppercase cursor-pointer" 
                              value={invSearch} 
                              onChange={e => { setInvSearch(e.target.value); setIsInvOpen(true); }}
                              onFocus={() => setIsInvOpen(true)}
                              onBlur={() => setTimeout(() => setIsInvOpen(false), 300)}
                          />
                        </Popover.Anchor>
                        <Popover.Portal>
                          <Popover.Content 
                              className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white dark:bg-slate-800 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-50 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200" 
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
                                ) : availableInvoices.map((item: any) => {
                                        const invNo = typeof item === 'string' ? item : item.noInvoice;
                                        const poNo = typeof item === 'string' ? null : item.noPo;
                                        return (
                                        <button 
                                          key={invNo} 
                                          onClick={() => handleSelectInvoice(invNo)} 
                                          className="w-full p-5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-2xl transition-all flex justify-between items-center group text-left border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                                        >
                                          <div>
                                              <p className="font-black text-[12px] text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                                                {highlightMatch(invNo, invSearch)}
                                                {poNo && (
                                                    <span className="text-slate-400 text-[10px] ml-2">({highlightMatch(poNo, invSearch)})</span>
                                                )}
                                              </p>
                                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Pilih Invoice ini</p>
                                          </div>
                                          <div className="text-right">
                                              <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase">
                                                <Plus size={8} /> Ambil Detail
                                              </div>
                                          </div>
                                        </button>
                                      )})
                                }
                              </div>
                          </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>
                  </div>

                  <div className="bg-[#f8fafc] dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm w-full relative overflow-hidden min-w-0">
                    <div className="max-h-[280px] overflow-x-auto overflow-y-auto premium-scrollbar scroll-smooth relative w-full">
                        <table className="w-full text-left border-collapse min-w-[820px] table-auto">
                          <thead>
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-white dark:border-slate-700/50 sticky top-0 bg-[#f8fafc] dark:bg-slate-900/90 backdrop-blur-md z-10">
                                <th className="px-6 py-5 min-w-[180px]">Invoice</th>
                                <th className="px-4 py-5 min-w-[120px] font-black text-center">PO</th>
                                <th className="px-4 py-5 min-w-[160px] font-black">Unit Produksi</th>
                                  <th className="px-4 py-5 min-w-[160px] font-black">Produk</th>
                                  <th className="px-6 py-5 min-w-[140px] text-right font-black">Nominal</th>
                                  <th className="px-4 py-5 w-12 text-center">#</th>
                              </tr>
                          </thead>
                          <tbody className="text-[11px] font-black">
                              {selectedInvoices.map((inv: any) => (
                                <tr key={inv.id} className="group hover:bg-white dark:hover:bg-slate-800/50 transition-colors border-b border-indigo-50/20 dark:border-slate-700/50">
                                    <td className="px-6 py-4 text-[#5c56f6] dark:text-indigo-400 uppercase whitespace-nowrap">{inv.noInvoice}</td>
                                    <td className="px-4 py-4 text-slate-400 dark:text-slate-500 uppercase tracking-tighter text-center whitespace-nowrap">{inv.noPo}</td>
                                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[10px] whitespace-nowrap">{inv.siteArea || inv.unitProduksi || "-"}</td>
                                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[10px] max-w-[160px] truncate" title={inv.produk}>{inv.produk || "-"}</td>
                                    <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-200 tabular-nums font-black whitespace-nowrap">{formatRp(inv.total)}</td>
                                    <td className="px-4 py-4 text-center">
                                      <button onClick={() => setSelectedInvoices(selectedInvoices.filter((x: any) => x.id !== inv.id))} className="w-6 h-6 bg-rose-50 dark:bg-rose-500/10 text-rose-400 dark:text-rose-500 rounded-full flex items-center justify-center mx-auto opacity-40 group-hover:opacity-100 transition-opacity hover:bg-rose-100 dark:hover:bg-rose-500/20"><X size={12} /></button>
                                    </td>
                                </tr>
                              ))}
                        {selectedInvoices.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-8 py-16 text-center text-slate-300 italic uppercase text-[10px]">Belum ada Invoice terpilih</td>
                          </tr>
                        )}
                    </tbody>
                  </table>
              </div>
            </div>
          </div>

                <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-700 my-2"></div>

                <div className="space-y-6 sm:space-y-8 min-w-0 w-full max-w-full">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-2">Lookup RTV</h4>
                  <div className="relative group" onClick={() => setIsRtvOpen(true)}>
                    <Plus className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 group-focus-within:text-rose-500 transition-colors pointer-events-none" size={20} />
                    <Popover.Root open={isRtvOpen} onOpenChange={setIsRtvOpen} modal={false}>
                        <Popover.Anchor asChild>
                          <input 
                              type="text" 
                              placeholder="Input Nomor RTV/CN..." 
                              className="w-full h-16 pl-12 sm:pl-16 pr-4 sm:pr-8 bg-[#f8fafc] dark:bg-slate-900/50 rounded-[28px] border-none outline-none font-bold text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-rose-50/50 dark:focus:ring-rose-500/20 transition-all uppercase cursor-pointer" 
                              value={rtvSearch} 
                              onChange={e => { setRtvSearch(e.target.value); setIsRtvOpen(true); }}
                              onFocus={() => setIsRtvOpen(true)}
                              onBlur={() => setTimeout(() => setIsRtvOpen(false), 300)}
                          />
                        </Popover.Anchor>
                        <Popover.Portal>
                          <Popover.Content 
                              className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white dark:bg-slate-800 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-50 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200" 
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
                                ) : availableRtvs.map((item: any) => {
                                        const rtvNo = typeof item === 'string' ? item : (item as any).noRtv;
                                        return (
                                        <button 
                                          key={rtvNo} 
                                          onClick={() => handleSelectRtv(rtvNo)} 
                                          className="w-full p-5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all flex justify-between items-center group text-left border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
                                        >
                                          <div>
                                              <p className="font-black text-[12px] text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                                                {highlightMatch(rtvNo, rtvSearch)}
                                              </p>
                                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Pilih RTV ini</p>
                                          </div>
                                          <div className="text-right">
                                              <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase">
                                                <Plus size={8} /> Ambil Detail
                                              </div>
                                          </div>
                                        </button>
                                      )})
                                }
                              </div>
                          </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>
                  </div>

                  <div className="bg-[#f8fafc] dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm w-full relative overflow-hidden min-w-0">
                    <div className="max-h-[250px] overflow-x-auto overflow-y-auto premium-scrollbar scroll-smooth relative w-full">
                        <table className="w-full text-left border-collapse min-w-[1100px] table-auto">
                          <thead>
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-white dark:border-slate-700/50 sticky top-0 bg-[#f8fafc] dark:bg-slate-900/90 backdrop-blur-md z-10 transition-colors">
                                <th className="px-4 py-5 min-w-[140px]">RTV/CN</th>
                                <th className="px-2 py-5 min-w-[50px] text-center font-black">Pcs</th>
                                  <th className="px-4 py-5 min-w-[150px] font-black">Ref Invoice</th>
                                  <th className="px-4 py-5 min-w-[140px] font-black">Unit Produksi</th>
                                  <th className="px-4 py-5 min-w-[140px] font-black">Lokasi Barang</th>
                                  <th className="px-4 py-5 min-w-[140px] font-black">Tujuan</th>
                                  <th className="px-4 py-5 min-w-[120px] font-black">Produk</th>
                                  <th className="px-4 py-5 min-w-[110px] text-right font-black">Rp/Kg</th>
                                  <th className="px-4 py-5 min-w-[110px] text-right font-black">Nominal</th>
                                  <th className="px-3 py-5 w-10 text-center">#</th>
                              </tr>
                          </thead>
                          <tbody className="text-[11px] font-black">
                              {selectedRtvs.map((rtv: any) => { 
                                const refInv = selectedInvoices.find((inv: any) => inv.noInvoice === rtv.refInvoice); 
                                const unitProduksiFromInv = refInv?.siteArea || "-"; 
                                return (
                                  <tr key={rtv.id} className="group hover:bg-white dark:hover:bg-slate-800/50 transition-colors border-b border-rose-50/20 dark:border-slate-700/50">
                                    <td className="px-4 py-4 text-rose-500 uppercase whitespace-nowrap tracking-tight">{rtv.noRtv}</td>
                                    <td className="px-2 py-4 text-center text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">{rtv.qty}</td>
                                    <td className="px-4 py-4">
                                        <Popover.Root 
                                          open={openRefInvoicePopoverId === rtv.id} 
                                          onOpenChange={(open) => { 
                                              if (open) {
                                                setOpenRefInvoicePopoverId(rtv.id);
                                              } else {
                                                setOpenRefInvoicePopoverId(null);
                                                setRefInvoiceSearch("");
                                              }
                                          }}
                                        >
                                          <Popover.Trigger asChild>
                                              <button className="flex items-center justify-between w-full h-8 px-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all text-slate-600 dark:text-slate-300 group">
                                                <span className="truncate">{rtv.refInvoice || "Pilih Invoice..."}</span>
                                                <ChevronDown size={12} className="text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors shrink-0 ml-2" />
                                              </button>
                                          </Popover.Trigger>
                                          <Popover.Portal>
                                              <Popover.Content 
                                                className="z-[110] w-[220px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-700 p-2 animate-in fade-in zoom-in-95 flex flex-col gap-2" 
                                                sideOffset={5}
                                                align="start"
                                              >
                                                <div className="relative">
                                                    <input 
                                                      type="text" 
                                                      placeholder="Cari Invoice..." 
                                                      className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none outline-none font-bold text-[10px] text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-500/20 transition-all uppercase"
                                                      value={refInvoiceSearch}
                                                      onChange={(e) => setRefInvoiceSearch(e.target.value)}
                                                      onClick={(e) => e.stopPropagation()}
                                                      onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 pointer-events-none" size={12} />
                                                </div>
                                                <div className="max-h-[160px] overflow-y-auto no-scrollbar space-y-1">
                                                    <button 
                                                      onClick={() => { setSelectedRtvs(selectedRtvs.map((x: any) => x.id === rtv.id ? { ...x, refInvoice: "" } : x)); setRefInvoiceSearch(""); setOpenRefInvoicePopoverId(null); }}
                                                      className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-400 transition-colors"
                                                    >
                                                      • Reset Pilihan
                                                    </button>
                                                    {selectedInvoices
                                                      .filter((inv: any) => inv.noInvoice.toLowerCase().includes(refInvoiceSearch.toLowerCase()))
                                                      .filter((inv: any) => !selectedRtvs.some((r: any) => r.id !== rtv.id && r.refInvoice === inv.noInvoice))
                                                      .map((inv: any) => (
                                                      <button 
                                                          key={inv.id}
                                                          onClick={() => { setSelectedRtvs(selectedRtvs.map((x: any) => x.id === rtv.id ? { ...x, refInvoice: inv.noInvoice } : x)); setRefInvoiceSearch(""); setOpenRefInvoicePopoverId(null); }}
                                                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-colors"
                                                      >
                                                          {highlightMatch(inv.noInvoice, refInvoiceSearch)}
                                                      </button>
                                                    ))}
                                                    {selectedInvoices.length === 0 && (
                                                      <p className="px-4 py-4 text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase italic">Belum ada invoice terpilih di kiri</p>
                                                    )}
                                                    {selectedInvoices.length > 0 && selectedInvoices.filter((inv: any) => inv.noInvoice.toLowerCase().includes(refInvoiceSearch.toLowerCase())).length === 0 && (
                                                      <p className="px-4 py-4 text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase italic">Invoice tidak ditemukan</p>
                                                    )}
                                                </div>
                                              </Popover.Content>
                                          </Popover.Portal>
                                        </Popover.Root>
                                    </td>
                                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[10px] whitespace-nowrap">{unitProduksiFromInv}</td>
                                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[10px] whitespace-nowrap">{rtv.lokasiBarang || "-"}</td>
                                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[10px] whitespace-nowrap">{rtv.tujuan || "-"}</td>
                                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[10px] max-w-[120px] truncate" title={rtv.produk}>{rtv.produk || "-"}</td>
                                      <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400 tabular-nums font-bold whitespace-nowrap">{formatRp(rtv.rpKg || 0)}</td>
                                      <td className="px-4 py-4 text-right text-slate-800 dark:text-slate-200 tabular-nums font-black whitespace-nowrap">{formatRp(rtv.total)}</td>
                                    <td className="px-3 py-4 text-center">
                                        <button onClick={() => setSelectedRtvs(selectedRtvs.filter((x: any) => x.id !== rtv.id))} className="w-5 h-5 bg-rose-50 dark:bg-rose-500/10 text-rose-400 dark:text-rose-500 rounded-full flex items-center justify-center mx-auto opacity-40 group-hover:opacity-100 transition-opacity hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"><X size={10} /></button>
                                    </td>
                                  </tr>
                              );
                                })}
                                {selectedRtvs.length === 0 && (
                                  <tr>
                                    <td colSpan={11} className="px-8 py-16 text-center text-slate-300 italic uppercase text-[10px]">Belum ada RTV terpilih</td>
                                  </tr>
                              )}
                            </tbody>
                        </table>
                      </div>
                    </div>
                </div>
                </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[32px] p-8 border border-blue-100/50 dark:border-blue-800/30 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-none mt-4 mb-2">
                <div className="absolute -top-10 -right-10 p-8 text-blue-600/5 dark:text-blue-400/5 transform rotate-12 pointer-events-none">
                    <FileText size={180} strokeWidth={1} />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                          <h4 className="text-[13px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-[0.15em]">Notes</h4>
                          <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 font-bold mt-1">Tambahkan catatan khusus dan nominal pengganti nilai invoice</p>
                      </div>
                      <button
                          type="button"
                          onClick={() => setNotesList([...notesList, { type: "invoice", desc: "", nominal: 0 }])}
                          className="px-4 py-2 bg-white/80 dark:bg-blue-900/50 backdrop-blur-sm text-blue-700 dark:text-blue-300 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm dark:shadow-none border border-blue-100 dark:border-blue-800/50 flex items-center gap-2 w-fit hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-500 dark:hover:border-blue-600 transition-all cursor-pointer"
                      >
                          <Plus size={12} />
                          Tambah Notes
                      </button>
                    </div>
                    {notesList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="w-14 h-14 bg-white dark:bg-blue-900/50 rounded-2xl flex items-center justify-center text-blue-200 dark:text-blue-400 shadow-sm dark:shadow-none mb-4">
                            <FileText size={28} />
                          </div>
                          <p className="text-[10px] font-black text-blue-300 dark:text-blue-500 uppercase tracking-widest">Belum ada notes</p>
                          <p className="text-[9px] text-blue-300/70 dark:text-blue-500/70 font-bold mt-1">Klik tombol &quot;Tambah Notes&quot; untuk menambahkan</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                          {notesList.map((note: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1.5fr_auto] gap-3 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="relative h-full">
                                  <Popover.Root open={openNoteTypeIdx === idx} onOpenChange={(o) => setOpenNoteTypeIdx(o ? idx : null)}>
                                      <Popover.Trigger asChild>
                                        <button className="w-full h-full min-h-[56px] px-5 py-4 bg-white/70 dark:bg-blue-900/30 backdrop-blur-md rounded-2xl border border-white dark:border-blue-800/30 focus:border-blue-200 dark:focus:border-blue-500/50 outline-none font-bold text-[12px] text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-blue-900/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none focus:shadow-[0_4px_20px_rgba(59,130,246,0.1)] transition-all flex items-center justify-between text-left group">
                                            <span>{note.type === 'rtv' ? 'Notes RTV' : 'Notes Invoice'}</span>
                                            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                                        </button>
                                      </Popover.Trigger>
                                      <Popover.Portal>
                                        <Popover.Content 
                                            className="z-[120] w-[var(--radix-popover-trigger-width)] bg-white dark:bg-slate-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-700 p-1.5 animate-in fade-in zoom-in-95 flex flex-col gap-1"
                                            align="start" 
                                            sideOffset={8}
                                        >
                                            <button 
                                              onClick={() => {
                                                  const updated = [...notesList];
                                                  updated[idx] = { ...updated[idx], type: 'invoice' };
                                                  setNotesList(updated);
                                                  setOpenNoteTypeIdx(null);
                                              }}
                                              className={`w-full text-left px-4 py-3 rounded-xl text-[12px] font-bold transition-all ${note.type === 'invoice' || !note.type ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}
                                            >
                                              Notes Invoice
                                            </button>
                                            <button 
                                              onClick={() => {
                                                  const updated = [...notesList];
                                                  updated[idx] = { ...updated[idx], type: 'rtv' };
                                                  setNotesList(updated);
                                                  setOpenNoteTypeIdx(null);
                                              }}
                                              className={`w-full text-left px-4 py-3 rounded-xl text-[12px] font-bold transition-all ${note.type === 'rtv' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}
                                            >
                                              Notes RTV
                                            </button>
                                        </Popover.Content>
                                      </Popover.Portal>
                                  </Popover.Root>
                                </div>
                                <div className="relative group h-full">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center justify-center text-blue-500 dark:text-blue-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-300 group-focus-within:scale-110 transition-transform duration-300 pointer-events-none z-10">
                                      <FileText size={14} strokeWidth={2.5} />
                                  </div>
                                  <input
                                      type="text"
                                      placeholder="Keterangan notes..."
                                      value={note.desc}
                                      onChange={(e) => {
                                        const updated = [...notesList];
                                        updated[idx] = { ...updated[idx], desc: e.target.value };
                                        setNotesList(updated);
                                      }}
                                      className="w-full h-full min-h-[56px] pl-[56px] pr-5 py-4 bg-white/70 dark:bg-blue-900/30 backdrop-blur-md rounded-2xl border border-white dark:border-blue-800/30 focus:border-blue-200 dark:focus:border-blue-500/50 outline-none font-bold text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-blue-900/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none focus:shadow-[0_4px_20px_rgba(59,130,246,0.1)] transition-all"
                                  />
                                </div>
                                <div className="relative group">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white font-black text-[11px] group-focus-within:scale-110 transition-transform duration-300 pointer-events-none z-10">Rp</div>
                                  <input
                                      type="text"
                                      placeholder="0"
                                      value={note.nominal ? note.nominal.toLocaleString('id-ID') : ""}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        const updated = [...notesList];
                                        updated[idx] = { ...updated[idx], nominal: Number(raw) || 0 };
                                        setNotesList(updated);
                                      }}
                                      className="w-full h-full min-h-[56px] pl-[56px] pr-5 py-4 bg-white/70 dark:bg-blue-900/30 backdrop-blur-md rounded-2xl border border-white dark:border-blue-800/30 focus:border-blue-200 dark:focus:border-blue-500/50 outline-none font-black text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-blue-900/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none focus:shadow-[0_4px_20px_rgba(59,130,246,0.1)] transition-all text-right tabular-nums"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setNotesList(notesList.filter((_: any, i: number) => i !== idx))}
                                  className="w-10 h-10 self-center bg-rose-50 dark:bg-rose-500/10 text-rose-400 dark:text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm cursor-pointer"
                                  title="Hapus notes"
                                >
                                  <X size={14} />
                                </button>
                            </div>
                          ))}
                          <div className="flex justify-end pt-2">
                            <div className="px-5 py-2.5 bg-white/80 dark:bg-blue-900/50 backdrop-blur-sm rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm dark:shadow-none">
                                <span className="text-[8px] font-black text-blue-400 dark:text-blue-300 uppercase tracking-widest mr-3">Total Notes</span>
                                <span className="text-sm font-black text-blue-700 dark:text-blue-400 tabular-nums">{formatRp(totalNotes)}</span>
                            </div>
                          </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="py-2">
                <div className="h-[1px] bg-slate-100 dark:bg-slate-700 w-full"></div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2">Lookup Promo</h4>
                    <div className="px-4 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest">Retailer-Linked Promo</div>
                </div>
                <div className="relative group" onClick={() => setIsPromoOpen(true)}>
                    <Percent className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={20} />
                    <Popover.Root open={isPromoOpen} onOpenChange={setIsPromoOpen} modal={false}>
                      <Popover.Anchor asChild>
                          <input 
                            type="text" 
                            placeholder="Input Nomor Promo..." 
                            className="w-full h-16 pl-16 pr-8 bg-[#f8fafc] dark:bg-slate-900/50 rounded-[28px] border-none outline-none font-bold text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-50/50 dark:focus:ring-emerald-500/20 transition-all uppercase cursor-pointer" 
                            value={promoSearch} 
                            onChange={e => { setPromoSearch(e.target.value); setIsPromoOpen(true); }}
                            onFocus={() => setIsPromoOpen(true)}
                            onBlur={() => setTimeout(() => setIsPromoOpen(false), 300)}
                          />
                      </Popover.Anchor>
                      <Popover.Portal>
                          <Popover.Content 
                            className="z-[110] w-[var(--radix-popover-trigger-width)] bg-white dark:bg-slate-800 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-50 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200" 
                            align="start" 
                            sideOffset={10}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-1">
                                {isDataLoading ? (
                                  <div className="p-8 text-center text-[10px] font-black text-emerald-400 uppercase italic tracking-widest animate-pulse">
                                      Sedang menarik data...
                                  </div>
                                ) : (masterPromos || [])
                                  .filter((p: any) => !selectedPromos.find((sp: any) => sp.id === p.id))
                                  .filter((p: any) => ((p.nomor || "") + (p.kegiatan || "")).toLowerCase().includes(promoSearch.toLowerCase())).length === 0 ? (
                                  <div className="p-8 text-center text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase italic tracking-widest">
                                      Tidak ada Promo tersedia untuk retailer ini
                                  </div>
                                ) : (
                                  (masterPromos || [])
                                      .filter((p: any) => !selectedPromos.find((sp: any) => sp.id === p.id))
                                      .filter((p: any) => ((p.nomor || "") + (p.kegiatan || "")).toLowerCase().includes(promoSearch.toLowerCase())).map((promo: any) => (
                                      <button 
                                        key={promo.id} 
                                        onClick={() => { setSelectedPromos([...selectedPromos, promo]); setIsPromoOpen(false); setPromoSearch(""); }} 
                                        className="w-full p-5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl transition-all flex justify-between items-center group text-left border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/20"
                                      >
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                              <Percent size={18} />
                                            </div>
                                            <div>
                                              <p className="font-black text-[12px] text-slate-800 dark:text-slate-200 uppercase tracking-tight">{highlightMatch(promo.nomor, promoSearch)}</p>
                                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">{highlightMatch(promo.kegiatan, promoSearch)} • {promo.periode}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[12px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
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

                {selectedPromos.length > 0 && (
                    <div className="space-y-4 mt-6">
                      {selectedPromos.map((promo: any) => (
                          <div key={promo.id} className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-emerald-100 dark:border-slate-700 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)] dark:shadow-none animate-in slide-in-from-top-4 flex items-center justify-between group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <Percent size={24} />
                                </div>
                                <div className="space-y-1">
                                  <h5 className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-none">{promo.nomor}</h5>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{promo.kegiatan} • {promo.periode}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700/50 text-[8px] font-black text-slate-400 rounded-md border border-slate-100 dark:border-slate-700 uppercase italic">
                                        {promo.tanggal ? new Date(promo.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                      </span>
                                  </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Total Promo</p>
                                  <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">{formatRp(promo.total)}</p>
                                </div>
                                <button 
                                  onClick={() => setSelectedPromos(selectedPromos.filter((p: any) => p.id !== promo.id))} 
                                  className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-400 dark:text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm"
                                  title="Hapus Promo"
                                >
                                  <X size={18} />
                                </button>
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>
          </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-50 dark:border-slate-700/50 rounded-[40px] bg-slate-50/20 dark:bg-slate-800/20">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-600 shadow-sm dark:shadow-none">
                  <CircleDollarSign size={32} />
                </div>
                <p className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest italic leading-relaxed">Pilih rujukan company terlebih dahulu <br/> untuk membuka database Invoice & RTV</p>
            </div>
          )}
      </div>

      {/* STEP 3: Biaya Admin */}
      <div className="bg-white dark:bg-slate-800 rounded-[40px] p-10 border border-white dark:border-slate-700 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] dark:shadow-none space-y-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-black text-xs shadow-lg dark:shadow-none">3</div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Biaya Admin (Bank Charges)</h3>
          </div>
          <div className="relative group">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-200 dark:text-slate-600 group-focus-within:text-slate-800 dark:group-focus-within:text-slate-300 transition-colors">
                <CreditCard size={28} />
            </div>
            <input 
                type="text" 
                placeholder="Input Biaya Admin..." 
                className="w-full h-20 pl-24 pr-12 bg-[#f8fafc] dark:bg-slate-900/50 rounded-[28px] border-none outline-none font-black text-2xl text-slate-700 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-600 transition-all focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100/50 dark:focus:ring-slate-700/50"
                onChange={e => setAdminFee(Number(e.target.value.replace(/[^0-9]/g, '')))}
                value={adminFee ? new Intl.NumberFormat("id-ID").format(adminFee) : ""}
            />
          </div>
      </div>
    </div>
  );
}
