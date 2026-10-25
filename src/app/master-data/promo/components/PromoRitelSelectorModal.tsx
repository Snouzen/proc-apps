"use client";

import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Building2, ChevronDown } from "lucide-react";

interface PromoRitelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailers: any[];
  searchRitelText: string;
  setSearchRitelText: (text: string) => void;
  isRitelDropdownOpen: boolean;
  setIsRitelDropdownOpen: (open: boolean) => void;
  onSelectRetailer: (ritel: any) => void;
}

export default function PromoRitelSelectorModal({
  isOpen,
  onClose,
  retailers,
  searchRitelText,
  setSearchRitelText,
  isRitelDropdownOpen,
  setIsRitelDropdownOpen,
  onSelectRetailer,
}: PromoRitelSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl sm:rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-5 sm:px-10 pt-8 sm:pt-10 pb-6 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl sm:rounded-[32px] flex items-center justify-center mx-auto mb-4 sm:mb-6 transform -rotate-6">
            <Building2 size={32} className="transform rotate-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Pilih Peritel
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-2 px-2 sm:px-4 leading-relaxed">
            Tentukan ritel modern tujuan
          </p>
        </div>

        <div className="px-5 sm:px-10 pb-8 sm:pb-10">
          <Popover.Root
            open={isRitelDropdownOpen}
            onOpenChange={setIsRitelDropdownOpen}
          >
            <Popover.Trigger asChild>
              <div className="relative mt-2">
                <input
                  type="text"
                  className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                  placeholder="Cari Ritel Modern..."
                  value={searchRitelText}
                  onChange={(e) => {
                    setSearchRitelText(e.target.value);
                    if (!isRitelDropdownOpen) setIsRitelDropdownOpen(true);
                  }}
                />
                <ChevronDown
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                />
              </div>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="z-[110] w-[calc(100vw-32px)] max-w-[350px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-2 outline-none animate-in fade-in zoom-in-95 duration-200"
                align="center"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-300 font-bold uppercase">
                  {retailers.filter((r) =>
                    r.namaPt
                      .toLowerCase()
                      .includes(searchRitelText.toLowerCase())
                  ).length === 0 ? (
                    <div className="p-4 text-center text-[10px] font-bold text-slate-300 dark:text-slate-500">
                      TIDAK ADA HASIL
                    </div>
                  ) : (
                    retailers
                      .filter((r) =>
                        r.namaPt
                          .toLowerCase()
                          .includes(searchRitelText.toLowerCase())
                      )
                      .map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSelectRetailer(opt)}
                          className="w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase transition-all hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          {opt.namaPt}
                        </button>
                      ))
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <button
            onClick={onClose}
            className="w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
