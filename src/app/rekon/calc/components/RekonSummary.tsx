import React from "react";
import {
  CircleDollarSign,
  Receipt,
  TrendingDown,
  Percent,
  CreditCard,
  FileText,
  Loader2,
  Save
} from "lucide-react";
import { formatRp } from "../hooks/useRekonCalc";

export default function RekonSummary({ calc }: { calc: any }) {
  const {
    bankStatement,
    totalInvoices,
    totalRtv,
    totalPromo,
    adminFee,
    notesList,
    totalNotesInvoice,
    totalNotesRtv,
    balanceNetDue,
    handleSaveRekon,
    isSubmitting
  } = calc;

  return (
    <div className="w-full lg:w-[460px] lg:sticky lg:top-12">
      <div className="bg-[#0f172a] dark:bg-slate-800/80 text-white rounded-[56px] p-12 shadow-[0_80px_100px_-20px_rgba(0,0,0,0.4)] dark:shadow-none dark:border dark:border-slate-700/50 relative overflow-hidden backdrop-blur-xl">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-14 italic">Rekon Summary</h2>
        
        <div className="space-y-10 relative z-10">
            <div className="flex justify-between items-start group cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-[#f59e0b] group-hover:text-white transition-all shrink-0"><CircleDollarSign size={16} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bank Statement</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">Rekening Koran</p>
                  </div>
              </div>
              <p className="text-sm lg:text-base font-black tabular-nums text-[#f59e0b] text-right break-all leading-tight max-w-[200px]">{formatRp(bankStatement)}</p>
            </div>

            <div className="flex justify-between items-start group cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-[#5c56f6] group-hover:text-white transition-all shrink-0"><Receipt size={16} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gross Billing</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">Total Invoices</p>
                  </div>
              </div>
              <p className="text-sm lg:text-base font-black tabular-nums text-white text-right break-all leading-tight max-w-[200px]">{formatRp(totalInvoices)}</p>
            </div>

            <div className="flex justify-between items-start group cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-[#e11d48] group-hover:text-white transition-all shrink-0"><TrendingDown size={16} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Return Deducts</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">Total RTV/CN</p>
                  </div>
              </div>
              <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(totalRtv)})</p>
            </div>

            <div className="flex justify-between items-start group cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-[#10b981] group-hover:text-white transition-all shrink-0"><Percent size={16} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Promo Deducts</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">Tagihan Promo</p>
                  </div>
              </div>
              <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(totalPromo)})</p>
            </div>

            <div className="flex justify-between items-start group cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all shrink-0"><CreditCard size={16} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Admin Fees</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">Biaya Admin</p>
                  </div>
              </div>
              <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(adminFee)})</p>
            </div>

            {totalNotesInvoice > 0 && (
              <div className="flex justify-between items-start group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0"><FileText size={16} /></div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Notes Invoices</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">{notesList.filter((n: any) => n.type === 'invoice' || !n.type).length} catatan</p>
                    </div>
                  </div>
                  <p className="text-sm lg:text-base font-black tabular-nums text-[#e11d48] text-right break-all leading-tight max-w-[200px]">({formatRp(totalNotesInvoice)})</p>
              </div>
            )}
            {totalNotesRtv > 0 && (
              <div className="flex justify-between items-start group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0"><FileText size={16} /></div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Notes RTV</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">{notesList.filter((n: any) => n.type === 'rtv').length} catatan</p>
                    </div>
                  </div>
                  <p className="text-sm lg:text-base font-black tabular-nums text-emerald-400 text-right break-all leading-tight max-w-[200px]">{formatRp(totalNotesRtv)}</p>
              </div>
            )}

            <div className="pt-10 border-t border-slate-800/50 dark:border-slate-700/50 space-y-4">
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

            <div className="pt-10 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSaveRekon("draft")}
                  disabled={isSubmitting}
                  className="group relative h-16 bg-gradient-to-br from-emerald-400 to-teal-600 disabled:from-slate-800 disabled:to-slate-900 rounded-2xl flex items-center px-6 gap-4 transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] active:scale-95 overflow-hidden"
                >
                  {isSubmitting ? (
                      <div className="w-full flex justify-center"><Loader2 size={20} className="animate-spin text-emerald-100" /></div>
                  ) : (
                      <>
                        <div className="w-10 h-10 border border-white/20 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
                            <FileText size={18} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Save as Draft</span>
                        <div className="absolute top-0 -right-4 w-12 h-full bg-white/5 skew-x-[25deg] group-hover:translate-x-4 transition-transform duration-700" />
                      </>
                  )}
                </button>

                <button 
                  onClick={() => handleSaveRekon("final")}
                  disabled={isSubmitting}
                  className="group relative h-16 bg-gradient-to-br from-indigo-500 to-violet-700 disabled:from-slate-800 disabled:to-slate-900 rounded-2xl flex items-center px-6 gap-4 transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(92,86,246,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(92,86,246,0.4)] active:scale-95 overflow-hidden"
                >
                  {isSubmitting ? (
                      <div className="w-full flex justify-center"><Loader2 size={20} className="animate-spin text-indigo-100" /></div>
                  ) : (
                      <>
                        <div className="w-10 h-10 border border-white/20 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
                            <Save size={18} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Submit Rekon</span>
                        <div className="absolute top-0 -right-4 w-12 h-full bg-white/5 skew-x-[25deg] group-hover:translate-x-4 transition-transform duration-700" />
                      </>
                  )}
                </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-8 opacity-20">
                <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic text-center">Auto-Arsip ke Database Rekon</p>
                <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            </div>
        </div>
      </div>
    </div>
  );
}
