"use client";

import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { StandardTooltip } from "./StandardTooltip";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return (
      <StandardTooltip content="Pending">
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
            <Clock size={16} strokeWidth={2.5} />
          </span>
        </div>
      </StandardTooltip>
    );
  }

  if (status === "REQUESTED") {
    return (
      <StandardTooltip content="Waiting Pusat">
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
            <Clock size={16} strokeWidth={2.5} />
          </span>
        </div>
      </StandardTooltip>
    );
  }

  if (status === "APPROVED") {
    return (
      <StandardTooltip content="Waiting Direksi">
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
            <Clock size={16} strokeWidth={2.5} />
          </span>
        </div>
      </StandardTooltip>
    );
  }

  if (status === "APPROVED_DIREKSI") {
    return (
      <StandardTooltip content="Sudah dapat dibuatkan SO">
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-full cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
            <CheckCircle2 size={16} strokeWidth={2.5} />
          </span>
        </div>
      </StandardTooltip>
    );
  }

  if (status === "REJECTED") {
    return (
      <StandardTooltip content="Rejected">
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
            <AlertTriangle size={16} strokeWidth={2.5} />
          </span>
        </div>
      </StandardTooltip>
    );
  }

  return null;
}
