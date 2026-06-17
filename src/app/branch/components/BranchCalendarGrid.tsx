import React from "react";
import { Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export function BranchCalendarGrid({
  startOffset,
  daysInMonth,
  year,
  month,
  groupedPOs,
  selectedDateKey,
  setSelectedDateKey,
  formatDateKey,
  isToday,
  poLoading,
  selectedSiteArea,
  selectedRegional,
  handlePrevMonth,
  handleNextMonth,
  MONTH_NAMES,
  DAY_LABELS,
}: any) {
  // ── Build Calendar Cells ──
  const calendarCells: (null | number)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  // Pad end to make full rows of 7
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          {selectedSiteArea && (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              {selectedSiteArea} · {selectedRegional}
            </p>
          )}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700/50">
        {DAY_LABELS.map((d: string) => (
          <div
            key={d}
            className="text-center py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {!selectedSiteArea ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full mb-4">
            <Calendar size={32} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            Pilih Site Area terlebih dahulu
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Pilih Regional dan Site Area di filter atas untuk menampilkan
            jadwal pengiriman pada kalender.
          </p>
        </div>
      ) : poLoading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={20} className="text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-500 font-medium">
            Memuat data PO...
          </span>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden mb-6">
          {/* HEADER HARI */}
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            {DAY_LABELS.map((day: string, i: number) => (
              <div
                key={i}
                className="py-2 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* BODY TANGGAL */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="bg-slate-50/50 dark:bg-slate-800/50 min-h-[50px] sm:min-h-[60px]"
                  />
                );
              }

              const dateKey = formatDateKey(year, month, day);
              const pos = groupedPOs[dateKey] || [];
              const hasPOs = pos.length > 0;
              const isSelected = selectedDateKey === dateKey;
              const today = isToday(day);

              const totalKg = hasPOs
                ? pos.reduce((acc: number, po: any) => {
                    const items = Array.isArray(po.Items) ? po.Items : [];
                    const kg = items.reduce((s: number, it: any) => {
                      const sat = Number(it.Product?.satuanKg || 1);
                      return (
                        s + (Number(it.pcsKirim) || Number(it.pcs) || 0) * sat
                      );
                    }, 0);
                    return acc + kg;
                  }, 0)
                : 0;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={`relative group bg-white dark:bg-slate-800 min-h-[50px] sm:min-h-[60px] p-2 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50
                    ${hasPOs ? "bg-amber-50/60 dark:bg-indigo-900/20 hover:bg-amber-100/60 dark:hover:bg-indigo-900/40" : ""}
                    ${isSelected ? "ring-2 ring-inset ring-indigo-500 z-10" : ""}
                  `}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span
                      className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full
                      ${today ? "bg-indigo-600 text-white shadow-sm" : hasPOs ? "text-amber-900 dark:text-indigo-300" : "text-slate-500 dark:text-slate-300"}
                    `}
                    >
                      {day}
                    </span>

                    {/* Tiny Badge Indicator if has POs */}
                    {hasPOs && (
                      <span 
                        className="text-[9px] font-black text-amber-700 dark:text-indigo-200 bg-amber-200/80 dark:bg-indigo-500/30 px-1.5 py-0.5 rounded-md leading-none"
                        title={`${pos.length} PO Terjadwal`}
                      >
                        {pos.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Embedded Total Kg Data */}
                  {hasPOs && (
                    <div className="mt-0.5 relative z-10">
                      <span className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-indigo-300 tracking-tight leading-none block">
                        {totalKg.toLocaleString("id-ID")} <span className="text-[8px] font-bold text-amber-700/70 dark:text-indigo-400/80">KG</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
