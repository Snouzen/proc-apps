import React from "react";
import { Search, Settings2, X, Pencil, Save } from "lucide-react";

export default function ChecklistFilters({
  search,
  setSearch,
  showColumns,
  setShowColumns,
  columns,
  visibleCols,
  setVisibleCols,
  isEditAll,
  handleToggleEditAll,
  handleSave
}: any) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Checklist Docs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan PO yang belum memiliki bukti tagih atau belum di-checklist.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No PO / Company / Invoice..."
            className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 relative">
          <button
            onClick={() => setShowColumns(!showColumns)}
            className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold"
          >
            <Settings2 size={16} /> Customize Column
          </button>
          {showColumns && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-50 top-10">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Kolom Tersedia</span>
                <button onClick={() => setShowColumns(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16}/></button>
              </div>
              <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                {columns.map((c: any) => (
                    <label key={c.id as string} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={visibleCols[c.id as string] ?? false} 
                        onChange={(e) => setVisibleCols((prev: any) => ({...prev, [c.id as string]: e.target.checked}))}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.header as string}</span>
                    </label>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={handleToggleEditAll}
            className={`h-10 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              isEditAll 
                ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50' 
                : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
            }`}
          >
            {isEditAll ? (
              <>
                <X size={16} /> Batal Edit Semua
              </>
            ) : (
              <>
                <Pencil size={16} /> Edit Semua
              </>
            )}
          </button>
          
          {isEditAll && (
            <button
              onClick={() => handleSave()}
              className="h-10 px-4 rounded-xl border border-emerald-600 bg-emerald-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm whitespace-nowrap"
            >
              <Save size={16} /> Simpan Semua
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
