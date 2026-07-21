import React from "react";
import { Package, Truck, Clock } from "lucide-react";

export function BranchStats({
  selectedSiteArea,
  poData,
  totalScheduled,
  totalUnscheduled,
  poLoading,
}: any) {
  if (!selectedSiteArea) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          label: "Total PO Dijadwalkan",
          value: poData.length,
          icon: <Truck size={18} />,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-900/30",
        },
      ].map((s, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200"
        >
          <div className={`p-2.5 rounded-xl ${s.bg}`}>
            <span className={s.color}>{s.icon}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {s.label}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {poLoading ? "..." : s.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
