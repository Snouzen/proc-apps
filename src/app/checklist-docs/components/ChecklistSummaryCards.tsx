import React from "react";

export default function ChecklistSummaryCards({ 
  summary, 
  activeFilter, 
  setActiveFilter, 
  setPage 
}: any) {
  return (
    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      <div 
        onClick={() => { setActiveFilter("total"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "total" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Total PO</span>
        <span className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">{summary.totalPo}</span>
      </div>
      <div 
        onClick={() => { setActiveFilter("pending"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "pending" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Pending Tagih</span>
        <span className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-500">{summary.pendingTagih}</span>
      </div>
      <div 
        onClick={() => { setActiveFilter("completed"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "completed" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Completed Tagih</span>
        <span className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-500">{summary.completedTagih}</span>
      </div>
      <div 
        onClick={() => { setActiveFilter("pending_kirim"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "pending_kirim" ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Pending Kirim</span>
        <span className="text-2xl lg:text-3xl font-bold text-purple-600 dark:text-purple-500">{summary.pendingKirim}</span>
      </div>
      <div 
        onClick={() => { setActiveFilter("completed_kirim"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "completed_kirim" ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Completed Kirim</span>
        <span className="text-2xl lg:text-3xl font-bold text-cyan-600 dark:text-cyan-500">{summary.completedKirim}</span>
      </div>
      <div 
        onClick={() => { setActiveFilter("pending_bayar"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "pending_bayar" ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Pending Payment</span>
        <span className="text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-500">{summary.pendingBayar}</span>
      </div>
      <div 
        onClick={() => { setActiveFilter("completed_bayar"); setPage(1); }}
        className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "completed_bayar" ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
      >
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Completed Payment</span>
        <span className="text-2xl lg:text-3xl font-bold text-teal-600 dark:text-teal-500">{summary.completedBayar}</span>
      </div>
    </div>
  );
}
