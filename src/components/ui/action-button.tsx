"use client";
import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export function StandardTooltip({ 
  children, 
  content 
}: { 
  children: React.ReactNode, 
  content: string 
}) {
  if (!content || content === "-") return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild><span className="inline-flex">{children}</span></Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="bottom" sideOffset={6} collisionPadding={12}
            className="z-[300] max-w-[calc(100vw-24px)] rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white shadow-xl pointer-events-none">
            {content}<Tooltip.Arrow className="fill-slate-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

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
  variant?: "indigo" | "rose" | "slate" | "emerald";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bgColors = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white",
    rose: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800 hover:bg-rose-600 hover:text-white",
    slate: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-600 hover:text-white",
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white",
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
