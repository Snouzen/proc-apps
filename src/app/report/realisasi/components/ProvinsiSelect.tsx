"use client";

import React, { useState, useMemo } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Check, Search, MapPin } from "lucide-react";
import { DAFTAR_PROVINSI_INDONESIA } from "@/lib/constants/provinces";

interface ProvinsiSelectProps {
  value: string;
  onChange: (provinsi: string) => void;
  disabled?: boolean;
  className?: string;
  provinces?: string[];
}

export default function ProvinsiSelect({
  value,
  onChange,
  disabled = false,
  className = "",
  provinces = DAFTAR_PROVINSI_INDONESIA,
}: ProvinsiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedVal = value || "Jabodetabek";

  const filtered = useMemo(() => {
    if (!search.trim()) return provinces;
    const q = search.toLowerCase().trim();
    return provinces.filter((p) => p.toLowerCase().includes(q));
  }, [provinces, search]);

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!disabled) {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between gap-1 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          <span className="truncate flex items-center gap-1">
            <MapPin size={11} className="text-slate-400 shrink-0" />
            <span className="truncate">{selectedVal}</span>
          </span>
          <ChevronDown
            size={12}
            className={`text-slate-400 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
            }`}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            // Keep default focus inside the popover search input
          }}
          className="z-[9999] w-56 p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Search */}
          <div className="relative flex items-center mb-1.5 px-0.5">
            <Search
              size={12}
              className="absolute left-2.5 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari provinsi..."
              className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* List of Provinces */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5">
            {filtered.length === 0 ? (
              <div className="py-3 text-[11px] text-slate-400 text-center">
                Provinsi tidak ditemukan
              </div>
            ) : (
              filtered.map((prov) => {
                const isSelected = selectedVal === prov;
                return (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => {
                      onChange(prov);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    <span className="truncate">{prov}</span>
                    {isSelected && (
                      <Check
                        size={13}
                        className="text-blue-600 dark:text-blue-400 shrink-0 ml-1.5"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
