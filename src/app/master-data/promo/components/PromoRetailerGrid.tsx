"use client";

import PusatOnly from "@/components/PusatOnly";
import React from "react";
import { Layers, ChevronRight, Building2, Trash2 } from "lucide-react";

interface PromoRetailerGridProps {
  isLoading: boolean;
  filtered: any[];
  setSelectedRetailerId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  handleDeleteGroup: (id: string, name: string) => void;
}

export default function PromoRetailerGrid({
  isLoading,
  filtered,
  setSelectedRetailerId,
  setSearchTerm,
  handleDeleteGroup,
}: PromoRetailerGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-1000">
      {isLoading ? (
        Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-8 animate-pulse h-40 shadow-sm"
          />
        ))
      ) : filtered.length === 0 ? (
        <div className="col-span-full py-32 text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
            <Layers size={40} />
          </div>
          <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">
            Belum ada data promo yang terasosiasi dengan peritel.
          </p>
        </div>
      ) : (
        filtered.map((ritel: any) => (
          <div
            key={ritel.id}
            onClick={() => {
              setSelectedRetailerId(ritel.id);
              setSearchTerm("");
            }}
            className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-8 rounded-[40px] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-indigo-500/50 transition-all duration-500 cursor-pointer active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute top-6 right-6 flex items-center gap-2">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={20} />
              </div>
            </div>

            <div className="flex flex-col gap-6 relative z-10">
              <div className="p-5 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 group-hover:text-white rounded-[32px] transition-all duration-700 w-fit shadow-inner">
                <Building2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors mb-2">
                  {ritel.namaPt}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/30">
                    {ritel?._count?.Promos || 0} PROMOS
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 z-20">
              <PusatOnly><button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(ritel.id, ritel.namaPt);
                }}
                className="p-4 bg-white dark:bg-slate-900 text-rose-400 hover:bg-rose-600 hover:text-white rounded-[24px] shadow-sm hover:shadow-rose-500/20 transition-all active:scale-90 border border-slate-50 dark:border-slate-800 hover:border-rose-600 dark:hover:border-rose-600"
                title="Hapus Seluruh Data Promo Peritel"
              >
                <Trash2 size={20} />
              </button></PusatOnly>
            </div>

            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 transition-colors" />
          </div>
        ))
      )}
    </div>
  );
}
