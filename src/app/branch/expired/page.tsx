"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useExpiredCalendar, MONTH_NAMES, DAY_LABELS, YEARS } from "./hooks/useExpiredCalendar";
import { ExpiredFilters } from "./components/ExpiredFilters";
import { ExpiredCalendarGrid } from "./components/ExpiredCalendarGrid";
import { ExpiredInlineDetail } from "./components/ExpiredInlineDetail";

/* ──────────────────────────────────────────────
   Main Page Component
   ────────────────────────────────────────────── */
export default function ExpiredCalendarPage() {
  const {
    role,
    userRegional,
    userSiteArea,
    regionalData,
    isLoading,
    now,
    selectedRegional,
    setSelectedRegional,
    selectedSiteArea,
    setSelectedSiteArea,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    poData,
    poLoading,
    month,
    year,
    daysInMonth,
    startOffset,
    formatDateKey,
    groupedPOs,
    selectedDateKey,
    setSelectedDateKey,
    inlineSearch,
    setInlineSearch,
    inlineDateFrom,
    setInlineDateFrom,
    inlineDateTo,
    setInlineDateTo,
    filteredDetailPOs,
  } = useExpiredCalendar();

  if (isLoading || role === null) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">
          Memuat data kalender expired...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg shadow-rose-500/20">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Expired Calendar
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm ml-[52px]">
            Visualisasi tanggal kadaluarsa (expired) PO untuk monitoring limit
            waktu.
          </p>
        </div>
      </div>

      <ExpiredFilters
        role={role}
        selectedRegional={selectedRegional}
        setSelectedRegional={setSelectedRegional}
        regionalData={regionalData}
        selectedSiteArea={selectedSiteArea}
        setSelectedSiteArea={setSelectedSiteArea}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        setSelectedDateKey={setSelectedDateKey}
        MONTH_NAMES={MONTH_NAMES}
        YEARS={YEARS}
      />

      <ExpiredCalendarGrid
        month={month}
        year={year}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        setSelectedDateKey={setSelectedDateKey}
        selectedSiteArea={selectedSiteArea}
        selectedRegional={selectedRegional}
        groupedPOs={groupedPOs}
        poLoading={poLoading}
        startOffset={startOffset}
        daysInMonth={daysInMonth}
        formatDateKey={formatDateKey}
        selectedDateKey={selectedDateKey}
        now={now}
        MONTH_NAMES={MONTH_NAMES}
        DAY_LABELS={DAY_LABELS}
      />

      <ExpiredInlineDetail
        selectedDateKey={selectedDateKey}
        setSelectedDateKey={setSelectedDateKey}
        groupedPOs={groupedPOs}
        filteredDetailPOs={filteredDetailPOs}
        inlineSearch={inlineSearch}
        setInlineSearch={setInlineSearch}
        inlineDateFrom={inlineDateFrom}
        setInlineDateFrom={setInlineDateFrom}
        inlineDateTo={inlineDateTo}
        setInlineDateTo={setInlineDateTo}
      />

      {!selectedSiteArea && selectedRegional !== "ALL" && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4">
            <AlertTriangle size={32} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Pilih Site Area untuk memantau data expired
          </p>
        </div>
      )}
    </div>
  );
}
