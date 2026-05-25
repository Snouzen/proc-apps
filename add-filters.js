const fs = require('fs');

const path = "src/app/credit-limit/data/page.tsx";
let content = fs.readFileSync(path, 'utf8');

// Chunk 1: Imports
const imports = `import {
  Search,
  ShieldCheck,
  Eye,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Truck,
  AlertTriangle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
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

type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
  tujuan: string | null;
};
`;
content = content.replace(/import \{\n  Search,\n  ShieldCheck,\n  Eye,\n  CalendarDays,\n  MapPin,\n  CheckCircle2,\n  Truck,\n  AlertTriangle,\n\} from "lucide-react";/g, imports);

// Chunk 2: States
const states = `  // -- Filter State (dropdowns) --
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedNamaPt, setSelectedNamaPt] = useState<string>("");
  const [selectedInisial, setSelectedInisial] = useState<string>("");
  const [selectedTujuan, setSelectedTujuan] = useState<string>("");

  const [openRitel, setOpenRitel] = useState(false);
  const [openInisial, setOpenInisial] = useState(false);
  const [openTujuan, setOpenTujuan] = useState(false);

  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");

  // Fetch Master Ritel (Hanya 1x saat mount)
  useEffect(() => {
    fetch("/api/ritel")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json?.data || [];
        setRetailers(list);
      })
      .catch((err) => console.error("Failed to fetch ritel:", err));
  }, []);

  // Filter inisial unik dari Nama PT yang dipilih
  const availableInisials = useMemo(() => {
    if (!selectedNamaPt) return [];
    const samePtRetailers = retailers.filter((r) => r.namaPt === selectedNamaPt);
    const inisials = samePtRetailers.map((r) => r.inisial).filter(Boolean) as string[];
    return Array.from(new Set(inisials)).sort();
  }, [selectedNamaPt, retailers]);

  // Filter tujuan unik dari Nama PT dan Inisial yang dipilih
  const availableTujuans = useMemo(() => {
    if (!selectedNamaPt) return [];
    
    const validRetailers = retailers.filter((r) => {
      if (r.namaPt !== selectedNamaPt) return false;
      if (selectedInisial && r.inisial !== selectedInisial) return false;
      return true;
    });

    const tujuans = validRetailers.map((r) => r.tujuan).filter(Boolean) as string[];
    return Array.from(new Set(tujuans)).sort();
  }, [selectedNamaPt, selectedInisial, retailers]);

  // -- View Detail State --`;
content = content.replace(/  \/\/ -- View Detail State --/g, states);

// Chunk 3: filteredPo logic
const filteredLogic = `    // Tahap 2: Filter berdasarkan Combobox (Ritel, Inisial, Tujuan)
    if (selectedNamaPt) {
      categoryFiltered = categoryFiltered.filter((po) => po.RitelModern?.namaPt === selectedNamaPt);
    }
    if (selectedInisial) {
      categoryFiltered = categoryFiltered.filter((po) => po.RitelModern?.inisial === selectedInisial);
    }
    if (selectedTujuan) {
      categoryFiltered = categoryFiltered.filter((po) => po.tujuanDetail === selectedTujuan);
    }

    // Tahap 3: Filter berdasarkan Periode (tglPo)
    if (tglFrom) {
      const fromDate = new Date(tglFrom);
      fromDate.setHours(0, 0, 0, 0);
      categoryFiltered = categoryFiltered.filter((po) => new Date(po.tglPo) >= fromDate);
    }
    if (tglTo) {
      const toDate = new Date(tglTo);
      toDate.setHours(23, 59, 59, 999);
      categoryFiltered = categoryFiltered.filter((po) => new Date(po.tglPo) <= toDate);
    }

    // Tahap 4: Filter berdasarkan Search Bar
    if (!search.trim()) return categoryFiltered;`;
content = content.replace(/    \/\/ Tahap 2: Filter berdasarkan Search Bar\n    if \(\!search\.trim\(\)\) return categoryFiltered;/g, filteredLogic);
content = content.replace(/  \}, \[poData, activeFilter, search\]\);/g, `  }, [poData, activeFilter, search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);`);
content = content.replace(/  \}, \[search, activeFilter\]\);/g, `  }, [search, activeFilter, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);`);

// Chunk 4: UI block
const uiBlock = `      {/* ── Additional Filters ───────────────────────────────────────────── */}
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
                className="w-full justify-between bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-slate-900 h-12 rounded-xl shadow-sm transition-all"
              >
                <span className={!selectedNamaPt ? "text-slate-400 font-normal truncate" : "font-bold truncate"}>
                  {selectedNamaPt || "Semua Ritel..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white" align="start">
                <Command className="bg-white border-slate-200">
                  <CommandInput placeholder="Cari ritel..." className="!text-slate-900 placeholder:!text-slate-400 font-medium bg-white" />
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
                        className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedNamaPt === "" ? "opacity-100" : "opacity-0")} />
                        Semua Ritel
                      </CommandItem>
                      {Array.from(new Set(retailers.map((r) => r.namaPt))).sort((a, b) => a.localeCompare(b)).map((namaPt) => (
                        <CommandItem
                          key={namaPt}
                          value={namaPt}
                          className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
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
                className="w-full justify-between bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-slate-900 h-12 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <span className={!selectedInisial ? "text-slate-400 font-normal truncate" : "font-bold truncate"}>
                  {selectedInisial || "Semua Inisial..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white" align="start">
                <Command className="bg-white border-slate-200">
                  <CommandInput placeholder="Cari inisial..." className="!text-slate-900 placeholder:!text-slate-400 font-medium bg-white" />
                  <CommandListUI className="max-h-64 scrollbar-hide">
                    <CommandEmpty className="text-slate-500 py-4 text-center">Inisial tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedInisial("");
                          setSelectedTujuan("");
                          setOpenInisial(false);
                        }}
                        className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
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
                          className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
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
                className="w-full justify-between bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-slate-900 h-12 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <span className={!selectedTujuan ? "text-slate-400 font-normal truncate" : "font-bold truncate"}>
                  {selectedTujuan || "Semua Tujuan..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white" align="start">
                <Command className="bg-white border-slate-200">
                  <CommandInput placeholder="Cari tujuan..." className="!text-slate-900 placeholder:!text-slate-400 font-medium bg-white" />
                  <CommandListUI className="max-h-64 scrollbar-hide">
                    <CommandEmpty className="text-slate-500 py-4 text-center">Tujuan tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedTujuan("");
                          setOpenTujuan(false);
                        }}
                        className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
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
                          className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
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
            <span className="hidden xl:inline text-slate-300">-</span>
            <DateInputHybrid value={tglTo} onChange={setTglTo} placeholder="Sampai..." />
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}`;
content = content.replace(/      \{\/\* ── Table ────────────────────────────────────────────────────────── \*\/\}/g, uiBlock);

fs.writeFileSync(path, content);
