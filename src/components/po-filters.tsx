"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";
import DateInputHybrid from "./DateInputHybrid";

type UnitLike = {
  idRegional?: string;
  namaRegional?: string;
  siteArea?: string;
  [key: string]: any;
};

export default function POFilters({
  unitData,
  searchValue,
  onSearchChange,
  dateFrom,
  dateTo,
  regionalValue,
  siteAreaValue,
  onFilterChange,
  regionalLocked = false,
  siteAreaLocked = false,
}: {
  unitData: UnitLike[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  regionalValue: string;
  siteAreaValue: string;
  onFilterChange: (next: {
    dateFrom?: string;
    dateTo?: string;
    regionalValue?: string;
    siteAreaValue?: string;
  }) => void;
  regionalLocked?: boolean;
  siteAreaLocked?: boolean;
}) {
  const [draftSearch, setDraftSearch] = useState(searchValue);

  useEffect(() => {
    setDraftSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (draftSearch === searchValue) return;
    const t = setTimeout(() => {
      onSearchChange(String(draftSearch || "").trim());
    }, 500);
    return () => clearTimeout(t);
  }, [draftSearch, onSearchChange, searchValue]);

  const regionalOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const u of unitData || []) {
      const val = String((u as any)?.namaRegional || "").trim();
      if (!val) continue;
      if (val.toUpperCase() === "UNKNOWN") continue;
      const key = val.toLowerCase();
      if (!uniq.has(key)) uniq.set(key, val);
    }
    return [
      { value: "", label: "All Regional" },
      ...Array.from(uniq.values())
        .sort()
        .map((v) => ({ value: v, label: v })),
    ];
  }, [unitData]);

  const siteAreaOptions = useMemo(() => {
    const src = (unitData || []).filter((u) => {
      if (!regionalValue) return true;
      const reg = String((u as any)?.namaRegional || "")
        .trim()
        .toLowerCase();
      return reg && reg === regionalValue.trim().toLowerCase();
    });
    const uniq = new Map<string, string>();
    for (const u of src) {
      const val = String((u as any)?.siteArea || "").trim();
      if (!val) continue;
      if (val.toUpperCase() === "UNKNOWN") continue;
      const key = val.toLowerCase();
      if (!uniq.has(key)) uniq.set(key, val);
    }
    return [
      { value: "", label: "All Site Area" },
      ...Array.from(uniq.values())
        .sort()
        .map((v) => ({ value: v, label: v })),
    ];
  }, [unitData, regionalValue]);

  return (
    <div className="flex items-center gap-2">
      <SmoothSelect
        width={192}
        value={regionalValue}
        onChange={(v) => onFilterChange({ regionalValue: String(v || "") })}
        options={regionalOptions}
        disabled={regionalLocked}
      />
      <SmoothSelect
        width={172}
        value={siteAreaValue}
        onChange={(v) => onFilterChange({ siteAreaValue: String(v || "") })}
        options={siteAreaOptions}
        disabled={siteAreaLocked}
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Date</span>
        <DateInputHybrid
          value={dateFrom}
          onChange={(v) => onFilterChange({ dateFrom: v })}
          placeholder="Dari..."
          maxDate={dateTo}
          className="w-[140px]"
        />
        <span className="text-sm text-gray-600">to</span>
        <DateInputHybrid
          value={dateTo}
          onChange={(v) => onFilterChange({ dateTo: v })}
          placeholder="Sampai..."
          minDate={dateFrom}
          className="w-[140px]"
        />
      </div>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          suppressHydrationWarning
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          placeholder="Search No PO / No Invoice / Company / Tujuan..."
          className="w-64 pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
    </div>
  );
}
