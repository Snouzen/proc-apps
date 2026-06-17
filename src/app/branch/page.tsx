"use client";

import React from "react";
import {
  Building2,
  MapPin,
  CalendarRange,
  Filter,
  ChevronDown,
  Globe2,
  Loader2,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  Clock,
  ExternalLink,
  Search,
} from "lucide-react";
// import removed
import PODetailModal from "@/components/po-detail-modal";
import { useBranchCalendar, MONTH_NAMES, DAY_LABELS } from "./hooks/useBranchCalendar";
import { BranchFilters } from "./components/BranchFilters";
import { BranchStats } from "./components/BranchStats";
import { BranchCalendarGrid } from "./components/BranchCalendarGrid";
import { BranchInlineDetail } from "./components/BranchInlineDetail";

/* ──────────────────────────────────────────────
   Main Page Component
   ────────────────────────────────────────────── */
export default function BranchPage() {
  const {
    role,
    userRegional,
    userSiteArea,
    regionalData,
    isLoading,
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
    selectedDateKey,
    setSelectedDateKey,
    inlineSearch,
    setInlineSearch,
    inlineDateFrom,
    setInlineDateFrom,
    inlineDateTo,
    setInlineDateTo,
    colsOpen,
    setColsOpen,
    visibleCols,
    setVisibleCols,
    toggleAllCols,
    selectedDetailPO,
    setSelectedDetailPO,
    regionalOptions,
    siteAreaOptions,
    monthOptions,
    yearOptions,
    month,
    year,
    daysInMonth,
    startOffset,
    groupedPOs,
    totalScheduled,
    totalUnscheduled,
    filteredDetailPOs,
    handleRegionalChange,
    handlePrevMonth,
    handleNextMonth,
    isToday,
    formatDate,
    formatCurrency,
    formatDateKey,
  } = useBranchCalendar();

  // ── Loading State ──
  if (isLoading || role === null) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-full">
            <Loader2 size={32} className="text-indigo-500 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            Memuat data wilayah...
          </p>
        </div>
      </div>
    );
  }

  // ── Build Calendar Cells ──
  const calendarCells: (null | number)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  // Pad end to make full rows of 7
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedDateLabel = selectedDateKey
    ? (() => {
        const parts = selectedDateKey.split("-");
        return `${Number(parts[2])} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
      })()
    : "";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-lg shadow-violet-500/20">
              <Calendar size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Delivery Calendar
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm ml-[52px]">
            Visualisasi jadwal pengiriman PO berdasarkan wilayah dan periode.
          </p>
        </div>
      </div>

      <BranchFilters
        role={role}
        selectedRegional={selectedRegional}
        handleRegionalChange={handleRegionalChange}
        regionalOptions={regionalOptions}
        selectedSiteArea={selectedSiteArea}
        setSelectedSiteArea={setSelectedSiteArea}
        siteAreaOptions={siteAreaOptions}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        monthOptions={monthOptions}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        yearOptions={yearOptions}
        setSelectedDateKey={setSelectedDateKey}
      />

      <BranchStats
        selectedSiteArea={selectedSiteArea}
        poData={poData}
        totalScheduled={totalScheduled}
        totalUnscheduled={totalUnscheduled}
        poLoading={poLoading}
      />

      <BranchCalendarGrid
        startOffset={startOffset}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        groupedPOs={groupedPOs}
        selectedDateKey={selectedDateKey}
        setSelectedDateKey={setSelectedDateKey}
        formatDateKey={formatDateKey}
        isToday={isToday}
        poLoading={poLoading}
        selectedSiteArea={selectedSiteArea}
        selectedRegional={selectedRegional}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        MONTH_NAMES={MONTH_NAMES}
        DAY_LABELS={DAY_LABELS}
      />

      <BranchInlineDetail
        selectedDateKey={selectedDateKey}
        groupedPOs={groupedPOs}
        filteredDetailPOs={filteredDetailPOs}
        inlineSearch={inlineSearch}
        setInlineSearch={setInlineSearch}
        inlineDateFrom={inlineDateFrom}
        setInlineDateFrom={setInlineDateFrom}
        inlineDateTo={inlineDateTo}
        setInlineDateTo={setInlineDateTo}
        colsOpen={colsOpen}
        setColsOpen={setColsOpen}
        visibleCols={visibleCols}
        setVisibleCols={setVisibleCols}
        toggleAllCols={toggleAllCols}
        setSelectedDateKey={setSelectedDateKey}
        setSelectedDetailPO={setSelectedDetailPO}
      />

      <PODetailModal
        open={!!selectedDetailPO}
        onClose={() => setSelectedDetailPO(null)}
        data={selectedDetailPO}
      />
    </div>
  );
}
