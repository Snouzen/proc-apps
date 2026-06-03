import { Building2, Trash2, ChevronRight } from "lucide-react";

interface ReturGroupedViewProps {
  loading: boolean;
  data: any[];
  role: "pusat" | "rm" | "sitearea" | "magang" | null;
  handleDeleteGroup: (id: string, name: string) => void;
  setSelectedRetailerId: (id: string | null) => void;
  setIsGroupedMode: (mode: boolean) => void;
}

export function ReturGroupedView({
  loading,
  data,
  role,
  handleDeleteGroup,
  setSelectedRetailerId,
  setIsGroupedMode
}: ReturGroupedViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-5 duration-700">
      {loading ? (
        Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-6 animate-pulse h-32" />
        ))
      ) : data.length === 0 ? (
        <div className="col-span-full py-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">
          Belum ada data retur yang tersimpan.
        </div>
      ) : (
        data.map((ritel) => (
          <div 
            key={ritel.id}
            onClick={() => {
              setSelectedRetailerId(ritel.id);
              setIsGroupedMode(false); // Switch instant
            }}
            className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-[32px] shadow-xl shadow-slate-200/40 dark:shadow-slate-900/50 hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 group-hover:text-white rounded-[24px] transition-all duration-500">
                <Building2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                  {ritel.namaPt}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-widest">
                      {ritel?._count?.DataRetur || 0} Records
                    </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {role === "pusat" && (
                  <button
                    suppressHydrationWarning
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(ritel.id, ritel.namaPt);
                    }}
                    className="p-2.5 text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-90"
                    title="Hapus Seluruh Data Peritel"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <div className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
