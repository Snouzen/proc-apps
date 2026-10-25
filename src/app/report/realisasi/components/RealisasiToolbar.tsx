import React from "react";
import { Plus, Download, Edit2, Loader2, X } from "lucide-react";

interface RealisasiToolbarProps {
  isSplitOpen: boolean;
  selectedRecord: any | null;
  exportingPdf: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (rec: any) => void;
  onCloseSplit: () => void;
  onExportPdf: () => void;
}

export default function RealisasiToolbar({
  isSplitOpen,
  selectedRecord,
  exportingPdf,
  onOpenCreate,
  onOpenEdit,
  onCloseSplit,
  onExportPdf,
}: RealisasiToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Realisasi Pemenuhan
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
            16:9 Executive Slide
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Laporan infografis pemenuhan ritel modern & export PDF 1 slide lanskap
        </p>
      </div>

      {/* Header Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isSplitOpen ? (
          <>
            <button
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              Buat Rekapan Baru
            </button>

            {selectedRecord && (
              <button
                type="button"
                onClick={() => onOpenEdit(selectedRecord)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                <Edit2 size={13} />
                Edit Data
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onCloseSplit}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            <X size={14} />
            Tutup Split Input
          </button>
        )}

        <button
          type="button"
          onClick={onExportPdf}
          disabled={exportingPdf}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {exportingPdf ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Exporting PDF...
            </>
          ) : (
            <>
              <Download size={14} />
              Export PDF (1 Slide)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
