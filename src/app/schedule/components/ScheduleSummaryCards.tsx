import React from "react";
import { Truck, CalendarCheck, Clock } from "lucide-react";

export default function ScheduleSummaryCards({ stats, activeFilter, setActiveFilter }: any) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          id: "all",
          label: "Total PO",
          value: stats.total,
          icon: <Truck size={18} className="text-blue-500" />,
          bg: "bg-blue-50 dark:bg-blue-900/30",
          text: "text-blue-600 dark:text-blue-400",
          ring: "ring-blue-500 dark:ring-blue-400",
        },
        {
          id: "scheduled",
          label: "Sudah Dijadwalkan",
          value: stats.scheduled,
          icon: <CalendarCheck size={18} className="text-emerald-500" />,
          bg: "bg-emerald-50 dark:bg-emerald-900/30",
          text: "text-emerald-600 dark:text-emerald-400",
          ring: "ring-emerald-500 dark:ring-emerald-400",
        },
        {
          id: "unscheduled",
          label: "Belum Dijadwalkan",
          value: stats.pending,
          icon: <Clock size={18} className="text-amber-500" />,
          bg: "bg-amber-50 dark:bg-amber-900/30",
          text: "text-amber-600 dark:text-amber-500",
          ring: "ring-amber-500 dark:ring-amber-500",
        },
      ].map((stat) => (
        <div
          key={stat.id}
          onClick={() => setActiveFilter(stat.id as any)}
          className={`cursor-pointer bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-all duration-200 ${
            activeFilter === stat.id
              ? `ring-2 ${stat.ring} shadow-md scale-[1.02]`
              : "hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm"
          }`}
        >
          <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
