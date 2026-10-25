import React from "react";
import {
  FileText,
  Download,
  RotateCcw,
  Eye,
  Edit3,
  Loader2,
} from "lucide-react";

interface NdHeaderToolbarProps {
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  handleReset: () => void;
  handleGenerate: () => void;
  isGenerating: boolean;
  handleGeneratePdf: () => void;
  isGeneratingPdf: boolean;
}

export default function NdHeaderToolbar({
  previewMode,
  setPreviewMode,
  handleReset,
  handleGenerate,
  isGenerating,
  handleGeneratePdf,
  isGeneratingPdf,
}: NdHeaderToolbarProps) {
  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Nota Dinas Generator
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                ND Pengajuan Credit Limit
              </p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="lg:hidden flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
            >
              {previewMode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Preview
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="hidden sm:inline">{isGenerating ? "Generating..." : "Download Word"}</span>
              <span className="sm:hidden">Word</span>
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer shrink-0"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="hidden sm:inline">{isGeneratingPdf ? "Generating..." : "Cetak PDF"}</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
