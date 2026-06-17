import { RefreshCw, Filter, Settings2, Download } from "lucide-react";
import { formatNumber } from "../hooks/useReport";

export function ReportHeader({ hook }: { hook: any }) {
  const {
    fetchData,
    loading,
    setShowFilters,
    setShowColumns,
    exportExcel,
    exporting,
    visibleColumns,
    serverTotal,
  } = hook;

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Report PO</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Filter per kolom, pilih kolom, lalu export sesuai tampilan.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setShowFilters((v: boolean) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
        >
          <Filter size={16} />
          Filter
        </button>
        <button
          type="button"
          onClick={() => setShowColumns((v: boolean) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
        >
          <Settings2 size={16} />
          Kolom
        </button>
        <button
          type="button"
          onClick={exportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 disabled:opacity-50"
          disabled={loading || exporting || visibleColumns.length === 0}
        >
          <Download size={16} />
          {exporting ? "Exporting..." : "Export"}
        </button>
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          Terfilter: {formatNumber(serverTotal || 0)}
        </div>
      </div>
    </div>
  );
}
