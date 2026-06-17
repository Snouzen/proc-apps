import React from "react";
import { Filter, Globe2, MapPin, CalendarRange } from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";

export function ExpiredFilters({
  role,
  selectedRegional,
  setSelectedRegional,
  regionalData,
  selectedSiteArea,
  setSelectedSiteArea,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  setSelectedDateKey,
  MONTH_NAMES,
  YEARS,
}: any) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-t-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {role !== "sitearea" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Globe2 size={12} /> Regional
            </label>
            <SmoothSelect
              value={selectedRegional}
              onChange={(v) => {
                setSelectedRegional(v);
                setSelectedSiteArea("ALL");
                setSelectedDateKey(null);
              }}
              options={[
                { value: "ALL", label: "Semua Regional" },
                ...Object.keys(regionalData)
                  .sort()
                  .map((r) => ({ value: r, label: r })),
              ]}
              disabled={role !== "pusat"}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin size={12} /> Site Area
          </label>
          <SmoothSelect
            value={selectedRegional === "ALL" ? "" : selectedSiteArea}
            onChange={(v) => {
              setSelectedSiteArea(v);
              setSelectedDateKey(null);
            }}
            options={[
              { value: "ALL", label: "Semua Site Area" },
              ...(regionalData[selectedRegional] || []).map((s: string) => ({
                value: s,
                label: s,
              })),
            ]}
            disabled={role === "sitearea" || selectedRegional === "ALL"}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <CalendarRange size={12} /> Bulan
          </label>
          <SmoothSelect
            value={selectedMonth}
            onChange={(v) => {
              setSelectedMonth(v);
              setSelectedDateKey(null);
            }}
            options={MONTH_NAMES.map((m: string, i: number) => ({
              value: String(i + 1),
              label: m,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <CalendarRange size={12} /> Tahun
          </label>
          <SmoothSelect
            value={selectedYear}
            onChange={(v) => {
              setSelectedYear(v);
              setSelectedDateKey(null);
            }}
            options={YEARS.map((y: number) => ({
              value: String(y),
              label: String(y),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
