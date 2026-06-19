"use client";

import { LayoutGrid, Loader2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useRekonCalc } from "./hooks/useRekonCalc";
import RekonForm from "./components/RekonForm";
import RekonSummary from "./components/RekonSummary";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), { ssr: false });

function RekonContent() {
  const calc = useRekonCalc();

  if (calc.isLoading) return <div className="p-24 text-center font-black text-slate-200 uppercase tracking-widest italic animate-pulse">Synchronizing Data...</div>;

  return (
    <div className="max-w-[1850px] mx-auto p-4 sm:p-8 lg:p-12 bg-[#f8fafc] dark:bg-transparent min-h-screen font-sans w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-16 gap-4 px-2 sm:px-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
           <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#5c56f6] rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-none shrink-0">
              <LayoutGrid size={28} className="sm:w-[32px] sm:h-[32px]" strokeWidth={2.5} />
           </div>
           <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none truncate">Kalkulator Rekon</h1>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 truncate">
                Rekonsiliasi &gt; Kalkulasi {calc.rekonNo && <span className="text-indigo-500 ml-1 sm:ml-2 border-l border-slate-200 dark:border-slate-700 pl-1 sm:pl-2">Draft: {calc.rekonNo}</span>}
              </p>
           </div>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
           <button 
             onClick={() => calc.setOpenExcelModal(true)}
             className="w-full sm:w-auto justify-center px-6 sm:px-10 py-3 bg-[#5c56f6] text-white rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 transition-all"
           >
              <Upload size={14} strokeWidth={3} />
              Bulk Upload
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <RekonForm calc={calc} />
        <RekonSummary calc={calc} />
      </div>

      {calc.openExcelModal && (
        <ExcelBulkModal 
          open={calc.openExcelModal}
          onClose={() => calc.setOpenExcelModal(false)}
          variant="rekon"
          title="Bulk Upload Rekon"
          onSuccess={() => {
            calc.setOpenExcelModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export default function RekonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>}>
      <RekonContent />
    </Suspense>
  );
}
