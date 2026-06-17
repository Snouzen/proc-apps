import { Calendar, ArrowUpDown, ChevronDown } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import * as Popover from "@radix-ui/react-popover";

export default function ScheduleFilters({ hook }: { hook: any }) {
  const {
    tglFrom, setTglFrom,
    tglTo, setTglTo,
    sortField, setSortField,
    sortOrder, setSortOrder
  } = hook;

  const SORT_FIELDS = [
    { value: "", label: "-- Pilih Kolom --" },
    { value: "tglPo", label: "Tgl PO" },
    { value: "expiredTgl", label: "Due Date" },
    { value: "tglkirim", label: "Tanggal Kirim" },
  ];

  const SORT_ORDERS = [
    { value: "asc", label: "Terdahulu (ASC)" },
    { value: "desc", label: "Terbaru (DESC)" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
      {/* Date Filter */}
      <div className="flex-1 flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={12} />
          Filter Tanggal PO
        </label>
        <div className="flex items-center gap-2">
          <DateInputHybrid
            value={tglFrom}
            onChange={setTglFrom}
            placeholder="Dari Tanggal..."
            className="w-full text-xs"
            maxDate={tglTo}
          />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">To</span>
          <DateInputHybrid
            value={tglTo}
            onChange={setTglTo}
            placeholder="Sampai Tanggal..."
            className="w-full text-xs"
            minDate={tglFrom}
          />
        </div>
      </div>

      <div className="w-[1px] bg-slate-100 dark:bg-slate-800 hidden md:block mx-2"></div>

      {/* Sort Filter */}
      <div className="flex-1 flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ArrowUpDown size={12} />
          Urutkan Data
        </label>
        <div className="flex items-center gap-2">
          {/* Field Dropdown */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="flex-1 h-[38px] px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between outline-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10">
                <span>{SORT_FIELDS.find(f => f.value === (sortField || ""))?.label}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-[100] w-[180px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/50 p-1.5 animate-in fade-in zoom-in-95" align="start" sideOffset={8}>
                {SORT_FIELDS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortField(opt.value || null)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      (sortField || "") === opt.value
                        ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Order Dropdown */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button 
                disabled={!sortField}
                className="w-36 h-[38px] px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between outline-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{SORT_ORDERS.find(o => o.value === sortOrder)?.label}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-[100] w-[160px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/50 p-1.5 animate-in fade-in zoom-in-95" align="end" sideOffset={8}>
                {SORT_ORDERS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortOrder(opt.value as "asc" | "desc")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      sortOrder === opt.value
                        ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </div>
  );
}
