import React from "react";
import { Filter, Globe2, MapPin, CalendarRange } from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";

export function BranchFilters({
  role,
  selectedRegional,
  handleRegionalChange,
  regionalOptions,
  selectedSiteArea,
  setSelectedSiteArea,
  siteAreaOptions,
  selectedMonth,
  setSelectedMonth,
  monthOptions,
  selectedYear,
  setSelectedYear,
  yearOptions,
  setSelectedDateKey,
}: any) {
  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 rounded-t-2xl" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter size={14} className="text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Filter Wilayah & Periode
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {role !== "sitearea" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe2 size={12} /> Regional
              </label>
              <SmoothSelect
                value={selectedRegional}
                onChange={handleRegionalChange}
                options={regionalOptions}
                disabled={role !== "pusat"}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={12} /> Site Area
            </label>
            <SmoothSelect
              value={selectedSiteArea}
              onChange={(v) => {
                if (role !== "sitearea") {
                  setSelectedSiteArea(v);
                  setSelectedDateKey(null);
                }
              }}
              options={siteAreaOptions}
              disabled={role === "sitearea"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarRange size={12} /> Bulan
            </label>
            <SmoothSelect
              value={selectedMonth}
              onChange={(v) => {
                setSelectedMonth(v);
                setSelectedDateKey(null);
              }}
              options={monthOptions}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarRange size={12} /> Tahun
            </label>
            <SmoothSelect
              value={selectedYear}
              onChange={(v) => {
                setSelectedYear(v);
                setSelectedDateKey(null);
              }}
              options={yearOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
