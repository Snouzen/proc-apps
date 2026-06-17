import { Column } from "../hooks/useReport";

export function ReportColumns({ hook }: { hook: any }) {
  const { showColumns, columns, setVisibleCols, toggleCol, visibleCols } = hook;

  if (!showColumns) return null;

  return (
    <div className="mt-5 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">Pilih Kolom</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              columns.forEach((c: Column) => { next[String(c.id)] = true; });
              setVisibleCols(next);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Show all
          </button>
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              columns.forEach((c: Column) => { next[String(c.id)] = c.defaultVisible; });
              setVisibleCols(next);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {columns.map((c: Column) => (
          <button
            type="button"
            key={String(c.id)}
            onClick={() => toggleCol(String(c.id))}
            className={`px-3 py-2 rounded-xl text-xs font-black text-left border transition-colors ${
              visibleCols[String(c.id)]
                ? "bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
