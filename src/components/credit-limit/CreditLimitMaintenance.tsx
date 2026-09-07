"use client";

import { Wrench, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function CreditLimitMaintenance() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-lg">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none p-10 text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="p-5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                  <Wrench
                    size={40}
                    className="text-amber-500 dark:text-amber-400"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="absolute -top-1 -right-1 p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-full">
                  <ShieldAlert
                    size={14}
                    className="text-amber-600 dark:text-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 dark:border-amber-500/20">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Dalam Pemeliharaan
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              Fitur Credit Limit Sedang
              <br />
              Dalam Maintenance
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Modul pengajuan dan persetujuan Credit Limit sedang dalam
              pemeliharaan sistem. Seluruh proses sinkronisasi dan aturan status
              PO tetap berjalan normal di latar belakang.
            </p>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800" />

            {/* Back Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all"
            >
              <ArrowLeft size={16} />
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
