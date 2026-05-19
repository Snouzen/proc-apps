/*
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DataTable } from "@/components/data-table";
import {
  Search,
  ShieldCheck,
  Eye,
  CalendarDays,
  MapPin,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
import PODetailModal from "@/components/po-detail-modal";

// ── Helper: strip junk site area text ──────────────────────────────────────
function cleanSiteArea(val?: string | null): string {
  if (!val) return "-";
  const lower = val.trim().toLowerCase();
  if (
    lower === "unknown" ||
    lower === "" ||
    lower.includes("unit produksi") ||
    lower.includes("belum ada")
  )
    return "-";
  return val.trim();
}

// ── Tooltip Component ────────────────────────────────────────────────────────
function StandardTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  if (!content || content === "-") return <>{children}</>;
  return (
    <div className="group/tooltip relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl border border-slate-700">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

// ── Action Button with Tooltip ───────────────────────────────────────────────
function ActionButton({
  icon: Icon,
  onClick,
  tooltip,
  variant = "indigo",
  disabled = false,
}: {
  icon: any;
  onClick: (e: any) => void;
  tooltip: string;
  variant?: "indigo" | "rose" | "slate" | "emerald" | "amber";
  disabled?: boolean;
}) {
  const bgColors = {
    indigo:
      "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white",
    rose: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white",
    slate:
      "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-600 hover:text-white",
    emerald:
      "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white",
    amber:
      "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white",
  };

  return (
    <StandardTooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2.5 rounded-xl border transition-all duration-200 shadow-sm active:scale-90 flex items-center justify-center ${bgColors[variant]} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-opacity-100 disabled:active:scale-100`}
        style={disabled ? { pointerEvents: "auto" } : {}}
      >
        <Icon size={16} strokeWidth={2.5} />
      </button>
    </StandardTooltip>
  );
}

export default function CreditLimitDataPageOld() {
  // Original implementation commented out...
}
*/

"use client";

import React from "react";
import { Construction } from "lucide-react";
import Link from "next/link";

export default function CreditLimitDataPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        {/* Glow behind the icon */}
        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl scale-150 animate-pulse" />
        
        {/* Modern styled cone/construction icon */}
        <div className="relative p-8 bg-amber-50 border-2 border-amber-200 rounded-3xl text-amber-500 transition-all duration-300 shadow-lg shadow-amber-500/10 hover:scale-105">
          <Construction size={80} strokeWidth={1.5} className="animate-bounce" />
        </div>
      </div>

      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
        UNDER MAINTENANCE
      </h1>
      
      <p className="text-slate-500 text-sm max-w-md leading-relaxed mb-8">
        Page Credit Limit sedang dalam proses development. Kami akan segera kembali untuk melayani Anda lebih baik!
      </p>

      <Link 
        href="/"
        className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 active:translate-y-0"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
