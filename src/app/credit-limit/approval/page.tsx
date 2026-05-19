"use client";

import React from "react";
import { Construction } from "lucide-react";
import Link from "next/link";

export default function CreditLimitApprovalPage() {
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
