"use client";

import { StandardTooltip } from "./StandardTooltip";

export function ActionButton({
  icon: Icon,
  onClick,
  tooltip,
  variant = "indigo",
  disabled = false,
  loading = false,
}: {
  icon: any;
  onClick: (e: any) => void;
  tooltip: string;
  variant?: "indigo" | "rose" | "slate" | "emerald" | "amber";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bgColors = {
    indigo:
      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white",
    rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 hover:bg-rose-600 dark:hover:bg-rose-500 hover:text-white dark:hover:text-white",
    slate:
      "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-600 dark:hover:bg-slate-700 hover:text-white dark:hover:text-white",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white",
    amber:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white dark:hover:text-white",
  };

  return (
    <StandardTooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`p-2.5 rounded-xl border transition-all duration-200 shadow-sm active:scale-90 flex items-center justify-center ${bgColors[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon size={16} strokeWidth={2.5} />
        )}
      </button>
    </StandardTooltip>
  );
}
