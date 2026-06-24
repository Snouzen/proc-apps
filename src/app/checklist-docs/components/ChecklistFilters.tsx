import React from "react";
import { Search, Settings2, X, Pencil, Save, Check, ChevronsUpDown, Building2, MapPin, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import DateInputHybrid from "@/components/DateInputHybrid";

export default function ChecklistFilters({
  search,
  setSearch,
  isEditAll,
  handleToggleEditAll,
  handleSave,
  ritelFilters,
  tglFrom,
  setTglFrom,
  tglTo,
  setTglTo
}: any) {
  return (
    <>
      {/* Advanced Filters Row */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Dropdown 1: Ritel */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Building2 size={12} className="text-blue-500" />
              Ritel Modern
            </label>
            <Popover open={ritelFilters.openRitel} onOpenChange={ritelFilters.setOpenRitel}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={ritelFilters.openRitel}
                  className={cn(
                    "w-full justify-between h-10 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800",
                    ritelFilters.openRitel 
                      ? "border-blue-400 ring-4 ring-blue-50 dark:ring-blue-900/20 shadow-md" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
                  )}
                >
                  <span className={cn(
                    "truncate",
                    !ritelFilters.selectedNamaPt ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
                  )}>
                    {ritelFilters.selectedNamaPt || "Semua Ritel..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverPrimitive.Portal>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  align="start"
                  sideOffset={8}
                >
                  <Command className="bg-transparent">
                    <div className="px-2 pb-2 pt-1 border-b border-slate-100 dark:border-slate-700/50">
                      <CommandInput
                        placeholder="Cari ritel..."
                        className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium h-10 bg-transparent border-none focus:ring-0 outline-none w-full px-2"
                      />
                    </div>
                    <CommandListUI className="max-h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-1">
                      <CommandEmpty className="text-slate-500 py-6 text-sm text-center">
                        Ritel tidak ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => ritelFilters.handleSelectNamaPt("")}
                          className={cn(
                            "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                            ritelFilters.selectedNamaPt === ""
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold" 
                              : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                              ritelFilters.selectedNamaPt === "" ? "opacity-100 scale-100 text-blue-600 dark:text-blue-400" : "opacity-0 scale-50"
                            )}
                          />
                          <span className="truncate italic">Semua Ritel</span>
                        </CommandItem>
                        {Array.from(
                          new Set(ritelFilters.retailers.map((r: any) => r.namaPt)),
                        ).sort((a: any, b: any) => a.localeCompare(b)).map((namaPt: any) => {
                          const isSelected = ritelFilters.selectedNamaPt === namaPt;
                          return (
                            <CommandItem
                              key={namaPt}
                              value={namaPt}
                              className={cn(
                                "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                                isSelected 
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold" 
                                  : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                              )}
                              onSelect={() => ritelFilters.handleSelectNamaPt(namaPt)}
                            >
                              <Check
                                className={cn(
                                  "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                                  isSelected ? "opacity-100 scale-100 text-blue-600 dark:text-blue-400" : "opacity-0 scale-50"
                                )}
                              />
                              <span className="truncate">{namaPt}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandListUI>
                  </Command>
                </PopoverContent>
              </PopoverPrimitive.Portal>
            </Popover>
          </div>

          {/* Dropdown 2: Inisial */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Tags size={12} className="text-indigo-500" />
              Inisial
            </label>
            <Popover open={ritelFilters.openInisial} onOpenChange={ritelFilters.setOpenInisial}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!ritelFilters.selectedNamaPt}
                  aria-expanded={ritelFilters.openInisial}
                  className={cn(
                    "w-full justify-between h-10 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800 disabled:opacity-50",
                    ritelFilters.openInisial 
                      ? "border-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-900/20 shadow-md" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
                  )}
                >
                  <span className={cn(
                    "truncate",
                    !ritelFilters.selectedInisial ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
                  )}>
                    {ritelFilters.selectedInisial || "Semua Inisial..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverPrimitive.Portal>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  align="start"
                  sideOffset={8}
                >
                  <Command className="bg-transparent">
                    <div className="px-2 pb-2 pt-1 border-b border-slate-100 dark:border-slate-700/50">
                      <CommandInput
                        placeholder="Cari inisial..."
                        className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium h-10 bg-transparent border-none focus:ring-0 outline-none w-full px-2"
                      />
                    </div>
                    <CommandListUI className="max-h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-1">
                      <CommandEmpty className="text-slate-500 py-6 text-sm text-center">
                        Inisial tidak ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => ritelFilters.handleSelectInisial("")}
                          className={cn(
                            "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                            ritelFilters.selectedInisial === ""
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold" 
                              : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                              ritelFilters.selectedInisial === "" ? "opacity-100 scale-100 text-indigo-600 dark:text-indigo-400" : "opacity-0 scale-50"
                            )}
                          />
                          <span className="truncate italic">Semua Inisial</span>
                        </CommandItem>
                        {ritelFilters.availableInisials.map((ini: any) => {
                          const isSelected = ritelFilters.selectedInisial === ini;
                          return (
                            <CommandItem
                              key={ini}
                              value={ini}
                              onSelect={() => ritelFilters.handleSelectInisial(ini)}
                              className={cn(
                                "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold" 
                                  : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                                  isSelected ? "opacity-100 scale-100 text-indigo-600 dark:text-indigo-400" : "opacity-0 scale-50"
                                )}
                              />
                              <span className="truncate">{ini}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandListUI>
                  </Command>
                </PopoverContent>
              </PopoverPrimitive.Portal>
            </Popover>
          </div>

          {/* Input 3: Tujuan Detail */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <MapPin size={12} className="text-teal-500" />
              Tujuan Detail
            </label>
            <Popover open={ritelFilters.openTujuan} onOpenChange={ritelFilters.setOpenTujuan}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!ritelFilters.selectedNamaPt}
                  aria-expanded={ritelFilters.openTujuan}
                  className={cn(
                    "w-full justify-between h-10 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800 disabled:opacity-50",
                    ritelFilters.openTujuan 
                      ? "border-teal-400 ring-4 ring-teal-50 dark:ring-teal-900/20 shadow-md" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
                  )}
                >
                  <span className={cn(
                    "truncate",
                    !ritelFilters.selectedTujuan ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
                  )}>
                    {ritelFilters.selectedTujuan || "Semua Tujuan..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverPrimitive.Portal>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  align="start"
                  sideOffset={8}
                >
                  <Command className="bg-transparent">
                    <div className="px-2 pb-2 pt-1 border-b border-slate-100 dark:border-slate-700/50">
                      <CommandInput
                        placeholder="Cari tujuan..."
                        className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium h-10 bg-transparent border-none focus:ring-0 outline-none w-full px-2"
                      />
                    </div>
                    <CommandListUI className="max-h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-1">
                      <CommandEmpty className="text-slate-500 py-6 text-sm text-center">
                        Tujuan tidak ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => ritelFilters.handleSelectTujuan("")}
                          className={cn(
                            "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                            ritelFilters.selectedTujuan === ""
                              ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold" 
                              : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                              ritelFilters.selectedTujuan === "" ? "opacity-100 scale-100 text-teal-600 dark:text-teal-400" : "opacity-0 scale-50"
                            )}
                          />
                          <span className="truncate italic">Semua Tujuan</span>
                        </CommandItem>
                        {ritelFilters.availableTujuans.map((tuj: any) => {
                          const isSelected = ritelFilters.selectedTujuan === tuj;
                          return (
                            <CommandItem
                              key={tuj}
                              value={tuj}
                              onSelect={() => ritelFilters.handleSelectTujuan(tuj)}
                              className={cn(
                                "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                                isSelected
                                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold" 
                                  : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                                  isSelected ? "opacity-100 scale-100 text-teal-600 dark:text-teal-400" : "opacity-0 scale-50"
                                )}
                              />
                              <span className="truncate">{tuj}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandListUI>
                  </Command>
                </PopoverContent>
              </PopoverPrimitive.Portal>
            </Popover>
          </div>

          {/* Date Pickers */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              Periode Tgl PO
            </label>
            <div className="flex items-center gap-2">
              <div className="w-full">
                <DateInputHybrid value={tglFrom} onChange={setTglFrom} placeholder="Dari..." maxDate={tglTo} />
              </div>
              <span className="text-slate-400">-</span>
              <div className="w-full">
                <DateInputHybrid value={tglTo} onChange={setTglTo} placeholder="Sampai..." minDate={tglFrom} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
