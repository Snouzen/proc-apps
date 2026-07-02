import { Layers, Search, Database, FileEdit, CheckCircle2, AlertCircle } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";

export default function DataRekonHeader({ hook }: { hook: any }) {
  const {
    search, setSearch,
    startDate, setStartDate,
    endDate, setEndDate,
    statusFilter, setStatusFilter,
    setPage
  } = hook;

  return (
    <div className="space-y-6 mb-6 px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#0f172a] dark:bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-lg dark:shadow-none">
            <Layers size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none">
               Arsip Rekonsiliasi
            </h1>
            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1 italic">
               Database Storage • v1.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
          {/* Custom Date Filters */}
          <div className="flex items-center bg-white dark:bg-slate-900/50 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none px-4 h-11 gap-3">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">From</span>
                <DateInputHybrid 
                  value={startDate}
                  onChange={(val) => { setStartDate(val); setPage(1); }}
                  placeholder="Mulai"
                  className="w-32 border-none ring-0 focus:ring-0 [&_input]:bg-slate-50/50 dark:[&_input]:bg-slate-800/50 [&_input]:h-8 [&_input]:rounded-full [&_input]:text-[10px] [&_input]:border-none dark:[&_input]:text-slate-300"
                />
             </div>
             <div className="w-[1px] h-4 bg-slate-100 dark:bg-slate-700/50"></div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">To</span>
                <DateInputHybrid 
                  value={endDate}
                  onChange={(val) => { setEndDate(val); setPage(1); }}
                  placeholder="Sampai"
                  className="w-32 border-none ring-0 focus:ring-0 [&_input]:bg-slate-50/50 dark:[&_input]:bg-slate-800/50 [&_input]:h-8 [&_input]:rounded-full [&_input]:text-[10px] [&_input]:border-none dark:[&_input]:text-slate-300"
                />
             </div>
          </div>

          <div className="relative group w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cari..." 
              suppressHydrationWarning
              className="w-full h-11 pl-11 pr-6 bg-white dark:bg-slate-900/50 rounded-full border border-slate-100 dark:border-slate-800 outline-none font-bold text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500 shadow-sm dark:shadow-none focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 transition-all"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Rekon Card */}
        <div 
          onClick={() => { setStatusFilter("all"); setPage(1); }}
          className={`cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl p-5 border shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] ${
            statusFilter === "all" ? "border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:ring-indigo-400/20" : "border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/50"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            statusFilter === "all" ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          }`}>
            <Database size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Rekon</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none mt-1">{hook.total}</p>
          </div>
        </div>

        {/* Draft Rekon Card */}
        <div 
          onClick={() => { setStatusFilter("draft"); setPage(1); }}
          className={`cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl p-5 border shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] ${
            statusFilter === "draft" ? "border-amber-500 ring-2 ring-amber-500/20 dark:border-amber-400 dark:ring-amber-400/20" : "border-slate-100 dark:border-slate-700/50 hover:border-amber-200 dark:hover:border-amber-500/50"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            statusFilter === "draft" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}>
            <FileEdit size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Draft Rekon</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none mt-1">{hook.totalDraft}</p>
          </div>
        </div>

        {/* Draft Completed Card */}
        <div 
          onClick={() => { setStatusFilter("final"); setPage(1); }}
          className={`cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl p-5 border shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] ${
            statusFilter === "final" ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:ring-emerald-400/20" : "border-slate-100 dark:border-slate-700/50 hover:border-emerald-200 dark:hover:border-emerald-500/50"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            statusFilter === "final" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}>
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Draft Completed</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none mt-1">{hook.totalCompleted}</p>
          </div>
        </div>
      </div>

      {/* Reminder Banner for Draft */}
      {hook.nominalDraft > 0 && hook.statusFilter !== "draft" && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-base font-bold text-amber-800 dark:text-amber-300 leading-tight">
              Nominal Rekening Koran yang menggantung : {hook.formatRp(hook.nominalDraft)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
