import React from "react";
import { Calendar, Plus } from "lucide-react";

interface RealisasiEmptyStateProps {
  selectedDateStr: string;
  onOpenCreate: (dateStr: string) => void;
}

export default function RealisasiEmptyState({
  selectedDateStr,
  onOpenCreate,
}: RealisasiEmptyStateProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-xl mx-auto my-12 shadow-xs space-y-4">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-[#0B2A59] dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <Calendar size={28} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Belum Ada Rekapan Pada{" "}
          {selectedDateStr
            ? new Date(selectedDateStr + "T00:00:00").toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Tanggal Ini"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Tidak ada data realisasi pemenuhan ritel modern yang tercatat untuk tanggal ini.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpenCreate(selectedDateStr)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
      >
        <Plus size={15} />
        Buat Rekapan Untuk Tanggal Ini
      </button>
    </div>
  );
}
