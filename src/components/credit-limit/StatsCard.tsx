"use client";

import React from "react";

export interface StatsCardItem {
  id: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
  text: string;
  ring: string;
}

export function StatsCard({
  stat,
  isActive,
  onClick,
}: {
  stat: StatsCardItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white dark:bg-slate-900/40 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all duration-200 ${
        isActive
          ? `ring-2 ${stat.ring} shadow-md dark:shadow-none scale-[1.02]`
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm dark:shadow-none"
      }`}
    >
      <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
        {stat.icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {stat.label}
        </p>
        <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
      </div>
    </div>
  );
}
