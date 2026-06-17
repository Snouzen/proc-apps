import React from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export function ExpiredCalendarGrid({
  month,
  year,
  setSelectedMonth,
  setSelectedYear,
  setSelectedDateKey,
  selectedSiteArea,
  selectedRegional,
  groupedPOs,
  poLoading,
  startOffset,
  daysInMonth,
  formatDateKey,
  selectedDateKey,
  now,
  MONTH_NAMES,
  DAY_LABELS,
}: any) {
  const calendarCells: (null | number)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
        <button
          onClick={() => {
            let m = month - 1, y = year;
            if (m < 1) {
              m = 12;
              y--;
            }
            setSelectedMonth(String(m));
            setSelectedYear(String(y));
            setSelectedDateKey(null);
          }}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex flex-col items-center max-w-[60%] sm:max-w-none">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            {selectedSiteArea && (
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                {selectedSiteArea} · {selectedRegional}
              </p>
            )}
          </div>
          
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[9px] sm:text-[10px] font-black bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-800 uppercase tracking-widest whitespace-nowrap">
              {Object.values(groupedPOs)
                .flat()
                .reduce((acc: number, po: any) => {
                  const items = Array.isArray(po.Items) ? po.Items : [];
                  return (
                    acc +
                    items.reduce(
                      (s: number, it: any) =>
                        s + (Number(it.pcs) || 0) * (Number(it.Product?.satuanKg) || 1),
                      0,
                    )
                  );
                }, 0)
                .toLocaleString("id-ID")}{" "}
              KG
            </span>
            <span className="text-[9px] sm:text-[10px] font-black bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800 uppercase tracking-widest whitespace-nowrap">
              RP{" "}
              {Object.values(groupedPOs)
                .flat()
                .reduce((acc: number, po: any) => {
                  const items = Array.isArray(po.Items) ? po.Items : [];
                  return (
                    acc +
                    items.reduce(
                      (s: number, it: any) => s + (Number(it.nominal) || 0),
                      0,
                    )
                  );
                }, 0)
                .toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            let m = month + 1, y = year;
            if (m > 12) {
              m = 1;
              y++;
            }
            setSelectedMonth(String(m));
            setSelectedYear(String(y));
            setSelectedDateKey(null);
          }}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

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

      {poLoading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={20} className="text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-500 font-medium">
            Memuat data PO...
          </span>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden m-6">
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
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
            {calendarCells.map((day, idx) => {
              if (day === null)
                return (
                  <div
                    key={`empty-${idx}`}
                    className="bg-slate-50/50 dark:bg-slate-800/50 min-h-[50px] sm:min-h-[60px]"
                  />
                );
              const dateKey = formatDateKey(year, month, day);
              const pos = groupedPOs[dateKey] || [];
              const hasPOs = pos.length > 0;
              const isSelected = selectedDateKey === dateKey;
              const today =
                now.getFullYear() === year &&
                now.getMonth() + 1 === month &&
                now.getDate() === day;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={`relative bg-white dark:bg-slate-800 min-h-[50px] sm:min-h-[60px] p-2 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 group ${hasPOs ? "bg-rose-50/60 dark:bg-rose-900/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/40" : ""} ${isSelected ? "ring-2 ring-inset ring-rose-500 z-10" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${today ? "bg-rose-600 text-white shadow-sm" : hasPOs ? "text-rose-900 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {day}
                    </span>
                    {hasPOs && (
                      <span className="text-[9px] font-black text-rose-700 dark:text-rose-300 bg-rose-200/80 dark:bg-rose-900/50 px-1.5 py-0.5 rounded-md leading-none">
                        {pos.length}
                      </span>
                    )}
                  </div>

                  {/* KG Info (Sesuai Delivery Calendar) */}
                  {hasPOs && (
                    <div className="mt-1 relative z-10">
                      <span className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 tracking-tight leading-none block">
                        {pos
                          .reduce((acc: number, po: any) => {
                            const items = Array.isArray(po.Items) ? po.Items : [];
                            return (
                              acc +
                              items.reduce(
                                (s: number, it: any) =>
                                  s + (Number(it.pcs) || 0) * (Number(it.Product?.satuanKg) || 1),
                                0,
                              )
                            );
                          }, 0)
                          .toLocaleString("id-ID")}{" "}
                        <span className="text-[8px] font-bold text-rose-700/70 dark:text-rose-400/70 uppercase">
                          Kg
                        </span>
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
