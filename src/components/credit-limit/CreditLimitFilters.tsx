"use client";

import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DateInputHybrid from "@/components/DateInputHybrid";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList as CommandListUI,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Retailer } from "@/lib/credit-limit";

export function CreditLimitFilters({
  retailers,
  selectedNamaPt,
  setSelectedNamaPt,
  selectedInisial,
  setSelectedInisial,
  selectedTujuan,
  setSelectedTujuan,
  openRitel,
  setOpenRitel,
  openInisial,
  setOpenInisial,
  openTujuan,
  setOpenTujuan,
  availableInisials,
  availableTujuans,
  tglFrom,
  setTglFrom,
  tglTo,
  setTglTo,
}: {
  retailers: Retailer[];
  selectedNamaPt: string;
  setSelectedNamaPt: (val: string) => void;
  selectedInisial: string;
  setSelectedInisial: (val: string) => void;
  selectedTujuan: string;
  setSelectedTujuan: (val: string) => void;
  openRitel: boolean;
  setOpenRitel: (val: boolean) => void;
  openInisial: boolean;
  setOpenInisial: (val: boolean) => void;
  openTujuan: boolean;
  setOpenTujuan: (val: boolean) => void;
  availableInisials: string[];
  availableTujuans: string[];
  tglFrom: string;
  setTglFrom: (val: string) => void;
  tglTo: string;
  setTglTo: (val: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Dropdown 1: Ritel */}
      <div className="md:col-span-3 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ritel Modern</label>
        <Popover open={openRitel} onOpenChange={setOpenRitel}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openRitel}
              className="w-full justify-between bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 h-12 rounded-xl shadow-sm dark:shadow-none transition-all"
              suppressHydrationWarning
            >
              <span className={!selectedNamaPt ? "text-slate-400 dark:text-slate-500 font-normal truncate" : "font-bold truncate"}>
                {selectedNamaPt || "Semua Ritel..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white dark:bg-slate-800" align="start">
              <Command className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CommandInput placeholder="Cari ritel..." className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium bg-white dark:bg-slate-800" />
                <CommandListUI className="max-h-64 scrollbar-hide">
                  <CommandEmpty className="text-slate-500 py-4 text-center">Ritel tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedNamaPt("");
                        setSelectedInisial("");
                        setSelectedTujuan("");
                        setOpenRitel(false);
                      }}
                      className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedNamaPt === "" ? "opacity-100" : "opacity-0")} />
                      Semua Ritel
                    </CommandItem>
                    {Array.from(new Set(retailers.map((r) => r.namaPt))).sort((a, b) => a.localeCompare(b)).map((namaPt) => (
                      <CommandItem
                        key={namaPt}
                        value={namaPt}
                        className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                        onSelect={() => {
                          setSelectedNamaPt(namaPt);
                          setSelectedInisial("");
                          setSelectedTujuan("");
                          setOpenRitel(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedNamaPt === namaPt ? "opacity-100" : "opacity-0")} />
                        {namaPt}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandListUI>
              </Command>
            </PopoverContent>
          </PopoverPrimitive.Portal>
        </Popover>
      </div>

      {/* Dropdown 2: Inisial */}
      <div className="md:col-span-3 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inisial</label>
        <Popover open={openInisial} onOpenChange={setOpenInisial}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={!selectedNamaPt}
              aria-expanded={openInisial}
              className="w-full justify-between bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 h-12 rounded-xl shadow-sm dark:shadow-none transition-all disabled:opacity-50"
              suppressHydrationWarning
            >
              <span className={!selectedInisial ? "text-slate-400 dark:text-slate-500 font-normal truncate" : "font-bold truncate"}>
                {selectedInisial || "Semua Inisial..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white dark:bg-slate-800" align="start">
              <Command className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CommandInput placeholder="Cari inisial..." className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium bg-white dark:bg-slate-800" />
                <CommandListUI className="max-h-64 scrollbar-hide">
                  <CommandEmpty className="text-slate-500 py-4 text-center">Inisial tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedInisial("");
                        setSelectedTujuan("");
                        setOpenInisial(false);
                      }}
                      className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedInisial === "" ? "opacity-100" : "opacity-0")} />
                      Semua Inisial
                    </CommandItem>
                    {availableInisials.map((ini) => (
                      <CommandItem
                        key={ini}
                        value={ini}
                        onSelect={() => {
                          setSelectedInisial(ini);
                          setSelectedTujuan("");
                          setOpenInisial(false);
                        }}
                        className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedInisial === ini ? "opacity-100" : "opacity-0")} />
                        {ini}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandListUI>
              </Command>
            </PopoverContent>
          </PopoverPrimitive.Portal>
        </Popover>
      </div>

      {/* Dropdown 3: Tujuan Detail */}
      <div className="md:col-span-3 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tujuan Detail</label>
        <Popover open={openTujuan} onOpenChange={setOpenTujuan}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={!selectedNamaPt}
              aria-expanded={openTujuan}
              className="w-full justify-between bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 h-12 rounded-xl shadow-sm dark:shadow-none transition-all disabled:opacity-50"
              suppressHydrationWarning
            >
              <span className={!selectedTujuan ? "text-slate-400 dark:text-slate-500 font-normal truncate" : "font-bold truncate"}>
                {selectedTujuan || "Semua Tujuan..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white dark:bg-slate-800" align="start">
              <Command className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CommandInput placeholder="Cari tujuan..." className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium bg-white dark:bg-slate-800" />
                <CommandListUI className="max-h-64 scrollbar-hide">
                  <CommandEmpty className="text-slate-500 py-4 text-center">Tujuan tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedTujuan("");
                        setOpenTujuan(false);
                      }}
                      className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedTujuan === "" ? "opacity-100" : "opacity-0")} />
                      Semua Tujuan
                    </CommandItem>
                    {availableTujuans.map((tujuan) => (
                      <CommandItem
                        key={tujuan}
                        value={tujuan}
                        onSelect={() => {
                          setSelectedTujuan(tujuan);
                          setOpenTujuan(false);
                        }}
                        className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedTujuan === tujuan ? "opacity-100" : "opacity-0")} />
                        {tujuan}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandListUI>
              </Command>
            </PopoverContent>
          </PopoverPrimitive.Portal>
        </Popover>
      </div>

      {/* Date Filters */}
      <div className="md:col-span-3 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Periode Tgl PO
        </label>
        <div className="flex flex-col xl:flex-row xl:items-center gap-2">
          <DateInputHybrid value={tglFrom} onChange={setTglFrom} placeholder="Dari..." />
          <span className="hidden xl:inline text-slate-300 dark:text-slate-600">-</span>
          <DateInputHybrid value={tglTo} onChange={setTglTo} placeholder="Sampai..." />
        </div>
      </div>
    </div>
  );
}
