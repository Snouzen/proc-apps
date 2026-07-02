import { X, ChevronDown, ChevronUp, Filter } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import { MultiSelectFilterDropdown } from "./MultiSelectFilterDropdown";
import { EXCLUDED_FILTER_COLS, Column } from "../hooks/useReport";

export function ReportFilters({ hook }: { hook: any }) {
  const {
    showFilters,
    setShowFilters,
    clearAllFilters,
    query,
    setQuery,
    tglFrom,
    setTglFrom,
    tglTo,
    setTglTo,
    submitFrom,
    setSubmitFrom,
    submitTo,
    setSubmitTo,
    pcsKirim,
    setPcsKirim,
    columns,
    role,
    userRegional,
    userSiteArea,
    colFilters,
    setColFilters,
    getOptionsForColumn,
  } = hook;

  return (
    <div className="mt-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-none mb-6 overflow-hidden transition-all duration-300">
      <div 
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setShowFilters(!showFilters)}
      >
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Filter Data Dinamis</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAllFilters();
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/20 transition-colors"
          >
            <X size={14} />
            Clear All
          </button>
          {showFilters ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5 pt-0 border-t border-gray-200 dark:border-slate-800 mt-2">
          <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Pencarian Umum</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari PO, company, invoice..."
          className="w-full px-3 py-2 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-500 font-semibold"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">Tgl PO From</label>
        <DateInputHybrid value={tglFrom} onChange={setTglFrom} placeholder="Pilih Tanggal..." maxDate={tglTo} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">Tgl PO To</label>
        <DateInputHybrid value={tglTo} onChange={setTglTo} placeholder="Pilih Tanggal..." minDate={tglFrom} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">Tanggal Submit</label>
        <div className="flex items-center gap-2">
          <DateInputHybrid value={submitFrom} onChange={setSubmitFrom} placeholder="Dari..." className="w-full" maxDate={submitTo} />
          <span className="text-[10px] text-slate-400 dark:text-slate-500">to</span>
          <DateInputHybrid value={submitTo} onChange={setSubmitTo} placeholder="Sampai..." className="w-full" minDate={submitFrom} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">PCS Kirim</label>
        <input
          type="number"
          value={pcsKirim}
          onChange={(e) => setPcsKirim(e.target.value)}
          placeholder="Filter PCS..."
          className="w-full px-3 py-2 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-500 font-semibold"
        />
      </div>

      {columns.map((c: Column) => {
        const colId = String(c.id);
        if (EXCLUDED_FILTER_COLS.includes(colId)) return null;

        const isRegional = colId === "regional";
        const isSiteArea = colId === "siteArea";

        let isLocked = false;
        if (role === "sitearea" && (isRegional || isSiteArea)) isLocked = true;
        if (role === "rm" && isRegional) isLocked = true;

        return (
          <div key={colId} className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{c.label}</label>
            <MultiSelectFilterDropdown
              value={colFilters[colId] || []}
              onChange={(val) => setColFilters((prev: any) => ({ ...prev, [colId]: val }))}
              options={getOptionsForColumn(colId)}
              placeholder={`Filter ${c.label}...`}
              disabled={isLocked}
            />
          </div>
        );
      })}

      {/* Status Filters */}
      {[
        { id: "statusKirim", label: "Status Kirim" },
        { id: "statusPo", label: "Status PO" },
        { id: "statusInv", label: "Status Invoice" },
        { id: "statusBayar", label: "Status Bayar" },
        { id: "statusSdif", label: "Status SDIF" },
        { id: "statusFp", label: "Status FP" },
        { id: "statusKwi", label: "Status Kwitansi" },
        { id: "statusTagih", label: "Status Tagih" },
      ].map((status) => (
        <div key={status.id} className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{status.label}</label>
          <div className="flex items-center gap-4 px-3 h-[38px] bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-hide">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="radio"
                name={status.id}
                checked={!colFilters[status.id] || colFilters[status.id].length === 0}
                onChange={() => setColFilters((prev: any) => ({ ...prev, [status.id]: [] }))}
                className="w-3.5 h-3.5 accent-emerald-500"
              />
              Semua
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-emerald-600 dark:text-emerald-500">
              <input
                type="radio"
                name={status.id}
                checked={colFilters[status.id]?.includes("TRUE") || false}
                onChange={() => setColFilters((prev: any) => ({ ...prev, [status.id]: ["TRUE"] }))}
                className="w-3.5 h-3.5 accent-emerald-500"
              />
              Sudah
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-500">
              <input
                type="radio"
                name={status.id}
                checked={colFilters[status.id]?.includes("FALSE") || false}
                onChange={() => setColFilters((prev: any) => ({ ...prev, [status.id]: ["FALSE"] }))}
                className="w-3.5 h-3.5 accent-emerald-500"
              />
              Belum
            </label>
          </div>
        </div>
      ))}
        </div>
      )}
    </div>
  );
}
