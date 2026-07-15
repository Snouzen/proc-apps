import { Check, ChevronsUpDown, Loader2, ArrowUpRight, Building2, MapPin, Tags, Globe, Factory } from "lucide-react";
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

import { useRetailerFilters } from "@/hooks/useRetailerFilters";
import { usePurchaseOrderTable } from "@/hooks/usePurchaseOrderTable";

interface PurchaseOrderFiltersProps {
  ritelFilters: ReturnType<typeof useRetailerFilters>;
  poTable: ReturnType<typeof usePurchaseOrderTable>;
}

export function PurchaseOrderFilters({ ritelFilters, poTable }: PurchaseOrderFiltersProps) {
  return (
    <>
      {/* Dropdown 1: Ritel */}
      <div className="w-full space-y-2">
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
                "w-full justify-between h-12 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800",
                ritelFilters.openRitel 
                  ? "border-blue-400 ring-4 ring-blue-50 dark:ring-blue-900/20 shadow-md" 
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
              )}
            >
              <span className={cn(
                "truncate text-[11px]",
                !ritelFilters.selectedNamaPt ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
              )}>
                {ritelFilters.selectedNamaPt || "Pilih Ritel..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent
              className="min-w-[var(--radix-popover-trigger-width)] w-[260px] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
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
                    {Array.from(
                      new Set(ritelFilters.retailers.map((r) => r.namaPt)),
                    ).sort((a, b) => a.localeCompare(b)).map((namaPt) => {
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
                          <span className="text-xs whitespace-normal leading-tight">{namaPt}</span>
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
      <div className="w-full space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Tags size={12} className="text-indigo-500" />
          Inisial (Opsional)
        </label>
        <Popover open={ritelFilters.openInisial} onOpenChange={ritelFilters.setOpenInisial}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={!ritelFilters.selectedNamaPt}
              aria-expanded={ritelFilters.openInisial}
              className={cn(
                "w-full justify-between h-12 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800 disabled:opacity-50",
                ritelFilters.openInisial 
                  ? "border-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-900/20 shadow-md" 
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
              )}
            >
              <span className={cn(
                "truncate text-[11px]",
                !ritelFilters.selectedInisial ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
              )}>
                {ritelFilters.selectedInisial || "Semua Inisial..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent
              className="min-w-[var(--radix-popover-trigger-width)] w-[260px] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
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
                      <span className="text-xs italic whitespace-normal leading-tight">Semua Inisial</span>
                    </CommandItem>
                    {ritelFilters.availableInisials.map((ini) => {
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
                          <span className="text-xs whitespace-normal leading-tight">{ini}</span>
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
      <div className="w-full space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <MapPin size={12} className="text-teal-500" />
          Tujuan Detail (Opsional)
        </label>
        <Popover open={ritelFilters.openTujuan} onOpenChange={ritelFilters.setOpenTujuan}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={!ritelFilters.selectedNamaPt}
              aria-expanded={ritelFilters.openTujuan}
              className={cn(
                "w-full justify-between h-12 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800 disabled:opacity-50",
                ritelFilters.openTujuan 
                  ? "border-teal-400 ring-4 ring-teal-50 dark:ring-teal-900/20 shadow-md" 
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
              )}
            >
              <span className={cn(
                "truncate text-[11px]",
                !ritelFilters.selectedTujuan ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
              )}>
                {ritelFilters.selectedTujuan || "Semua Tujuan..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent
              className="min-w-[var(--radix-popover-trigger-width)] w-[260px] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
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
                      <span className="text-xs italic whitespace-normal leading-tight">Semua Tujuan</span>
                    </CommandItem>
                    {ritelFilters.availableTujuans.map((tuj) => {
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
                          <span className="text-xs whitespace-normal leading-tight">{tuj}</span>
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

      {/* Dropdown 4: Regional */}
      <div className="w-full space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Globe size={12} className="text-orange-500" />
          Regional
        </label>
        <Popover open={ritelFilters.openRegional} onOpenChange={ritelFilters.setOpenRegional}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={ritelFilters.openRegional}
              className={cn(
                "w-full justify-between h-12 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800",
                ritelFilters.openRegional 
                  ? "border-orange-400 ring-4 ring-orange-50 dark:ring-orange-900/20 shadow-md" 
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
              )}
            >
              <span className={cn(
                "truncate text-[11px]",
                !ritelFilters.selectedRegional ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
              )}>
                {ritelFilters.selectedRegional || "Semua Regional..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent
              className="min-w-[var(--radix-popover-trigger-width)] w-[260px] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              align="start"
              sideOffset={8}
            >
              <Command className="bg-transparent">
                <div className="px-2 pb-2 pt-1 border-b border-slate-100 dark:border-slate-700/50">
                  <CommandInput
                    placeholder="Cari regional..."
                    className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium h-10 bg-transparent border-none focus:ring-0 outline-none w-full px-2"
                  />
                </div>
                <CommandListUI className="max-h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-1">
                  <CommandEmpty className="text-slate-500 py-6 text-sm text-center">
                    Regional tidak ditemukan.
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => ritelFilters.handleSelectRegional("")}
                      className={cn(
                        "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                        ritelFilters.selectedRegional === ""
                          ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold" 
                          : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                          ritelFilters.selectedRegional === "" ? "opacity-100 scale-100 text-orange-600 dark:text-orange-400" : "opacity-0 scale-50"
                        )}
                      />
                      <span className="text-xs italic whitespace-normal leading-tight">Semua Regional</span>
                    </CommandItem>
                    {ritelFilters.availableRegionals.map((reg) => {
                      const isSelected = ritelFilters.selectedRegional === reg;
                      return (
                        <CommandItem
                          key={reg}
                          value={reg}
                          onSelect={() => ritelFilters.handleSelectRegional(reg)}
                          className={cn(
                            "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                            isSelected
                              ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold" 
                              : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                              isSelected ? "opacity-100 scale-100 text-orange-600 dark:text-orange-400" : "opacity-0 scale-50"
                            )}
                          />
                          <span className="text-xs whitespace-normal leading-tight">{reg}</span>
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

      {/* Dropdown 5: Unit Produksi (Site Area) */}
      <div className="w-full space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Factory size={12} className="text-fuchsia-500" />
          Unit Produksi
        </label>
        <Popover open={ritelFilters.openSiteArea} onOpenChange={ritelFilters.setOpenSiteArea}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={ritelFilters.openSiteArea}
              className={cn(
                "w-full justify-between h-12 rounded-xl transition-all duration-200 bg-white dark:bg-slate-800",
                ritelFilters.openSiteArea 
                  ? "border-fuchsia-400 ring-4 ring-fuchsia-50 dark:ring-fuchsia-900/20 shadow-md" 
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
              )}
            >
              <span className={cn(
                "truncate text-[11px]",
                !ritelFilters.selectedSiteArea ? "text-slate-400 font-normal" : "text-slate-800 dark:text-slate-100 font-bold"
              )}>
                {ritelFilters.selectedSiteArea || "Semua Unit..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverContent
              className="min-w-[var(--radix-popover-trigger-width)] w-[260px] p-1 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              align="start"
              sideOffset={8}
            >
              <Command className="bg-transparent">
                <div className="px-2 pb-2 pt-1 border-b border-slate-100 dark:border-slate-700/50">
                  <CommandInput
                    placeholder="Cari unit..."
                    className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium h-10 bg-transparent border-none focus:ring-0 outline-none w-full px-2"
                  />
                </div>
                <CommandListUI className="max-h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-1">
                  <CommandEmpty className="text-slate-500 py-6 text-sm text-center">
                    Unit tidak ditemukan.
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => ritelFilters.handleSelectSiteArea("")}
                      className={cn(
                        "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                        ritelFilters.selectedSiteArea === ""
                          ? "bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 font-bold" 
                          : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                          ritelFilters.selectedSiteArea === "" ? "opacity-100 scale-100 text-fuchsia-600 dark:text-fuchsia-400" : "opacity-0 scale-50"
                        )}
                      />
                      <span className="text-xs italic whitespace-normal leading-tight">Semua Unit</span>
                    </CommandItem>
                    {ritelFilters.availableSiteAreas.map((site) => {
                      const isSelected = ritelFilters.selectedSiteArea === site;
                      return (
                        <CommandItem
                          key={site}
                          value={site}
                          onSelect={() => ritelFilters.handleSelectSiteArea(site)}
                          className={cn(
                            "cursor-pointer flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-colors duration-200",
                            isSelected
                              ? "bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 font-bold" 
                              : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-700"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 shrink-0 transition-all duration-200",
                              isSelected ? "opacity-100 scale-100 text-fuchsia-600 dark:text-fuchsia-400" : "opacity-0 scale-50"
                            )}
                          />
                          <span className="text-xs whitespace-normal leading-tight">{site}</span>
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

      <div className="w-full">
        <Button
          onClick={() => poTable.handleFetchData(
            ritelFilters.selectedNamaPt,
            ritelFilters.selectedInisial,
            ritelFilters.selectedTujuan,
            ritelFilters.selectedRegional,
            ritelFilters.selectedSiteArea
          )}
          disabled={(!ritelFilters.selectedNamaPt && !ritelFilters.selectedRegional && !ritelFilters.selectedSiteArea) || poTable.loadingData}
          className="w-full h-12 bg-blue-600 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-500 text-white dark:text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:dark:text-slate-500"
        >
          {poTable.loadingData ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ArrowUpRight size={18} />
          )}
          Tampilkan Data
        </Button>
      </div>
    </>
  );
}
