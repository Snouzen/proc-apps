"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Package,
  Building,
  Check,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Trash2,
  Calendar,
  PlusCircle,
  Upload,
  X,
} from "lucide-react";
import PODetailModal from "@/components/po-detail-modal";
import POEditModal from "@/components/po-edit-modal";
import { LoaderThree } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SmoothSelect from "@/components/ui/smooth-select";
import DateInputHybrid from "@/components/DateInputHybrid";
import Link from "next/link";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
};

// Ikon tambahan untuk Error State
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function PurchaseOrderPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  // [FIX LOGIC] Kita simpan Nama PT-nya, bukan ID pertama-nya
  const [selectedNamaPt, setSelectedNamaPt] = useState<string>("");
  const [selectedInisial, setSelectedInisial] = useState<string>("");

  const [openRitel, setOpenRitel] = useState(false);
  const [openInisial, setOpenInisial] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [poData, setPoData] = useState<any[] | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [perPage, setPerPage] = useState("10");
  const [statusFilter, setStatusFilter] = useState("all");

  const [activeNamaPt, setActiveNamaPt] = useState<string>("");
  const [activeInisial, setActiveInisial] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, tglFrom, tglTo, sortOrder, perPage, statusFilter]);

  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const lastCtrlRef = useRef<AbortController | null>(null);

  // ── Global Search (No PO / No Invoice) ──
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<any[] | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const globalCtrlRef = useRef<AbortController | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalSearchRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(e.target as Node)) {
        setGlobalResults(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleGlobalSearch = useCallback((value: string) => {
    setGlobalQuery(value);
    if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
    if (globalCtrlRef.current) globalCtrlRef.current.abort();

    const q = value.trim();
    if (q.length < 2) {
      setGlobalResults(null);
      setGlobalLoading(false);
      return;
    }

    setGlobalLoading(true);
    globalTimerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      globalCtrlRef.current = ctrl;
      try {
        const url = `/api/po?q=${encodeURIComponent(q)}&summary=true&limit=15`;
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.data || [];
        setGlobalResults(list);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error(e);
          setGlobalResults([]);
        }
      } finally {
        setGlobalLoading(false);
      }
    }, 400);
  }, []);

  const handleDelete = async (noPo: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/po?noPo=${encodeURIComponent(noPo)}`, { method: "DELETE" });
      handleFetchData(); // Refresh data
      setConfirmDelete(null);
    } catch (e) {
      alert("Gagal menghapus PO");
    } finally {
      setDeleting(false);
    }
  };

  // Fetch Master Ritel (Hanya 1x saat mount)
  useEffect(() => {
    fetch("/api/ritel")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json?.data || [];
        setRetailers(list);
      })
      .finally(() => setIsInitialLoad(false));
  }, []);

  // Filter inisial unik dari Nama PT yang dipilih
  const availableInisials = useMemo(() => {
    if (!selectedNamaPt) return [];
    const samePtRetailers = retailers.filter(
      (r) => r.namaPt === selectedNamaPt,
    );
    const inisials = samePtRetailers
      .map((r) => r.inisial)
      .filter(Boolean) as string[];
    return Array.from(new Set(inisials)).sort();
  }, [selectedNamaPt, retailers]);

  // Main Fetch Data [PERBAIKAN LOGIC BESAR-BESARAN]
  const handleFetchData = async () => {
    if (!selectedNamaPt) return;

    setLoadingData(true);
    setPoData(null); // Clear state instantly so it resets properly when changing Ritel!
    if (lastCtrlRef.current) lastCtrlRef.current.abort();
    const ctrl = new AbortController();
    lastCtrlRef.current = ctrl;

    try {
      // Cari semua ID ritel yang cocok dengan filter PT dan Inisial
      const ritelsToFetch = selectedInisial
        ? retailers.filter(
            (r) => r.namaPt === selectedNamaPt && r.inisial === selectedInisial,
          )
        : retailers.filter((r) => r.namaPt === selectedNamaPt);

      // Fetch semua ID secara bersamaan (Promise.all)
      const fetchPromises = ritelsToFetch.map((r) => {
        const url = `/api/po?retailerId=${encodeURIComponent(r.id)}&summary=true`;
        return fetch(url, { signal: ctrl.signal, cache: 'no-store' }).then((res) => res.json());
      });

      const results = await Promise.all(fetchPromises);

      // Gabungkan semua data dari berbagai cabang/inisial
      const combinedList = results.flatMap((json) =>
        Array.isArray(json) ? json : json?.data || [],
      );

      setPoData(combinedList);
      setActiveNamaPt(selectedNamaPt);
      setActiveInisial(selectedInisial);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  // [FIX STATS] Gunakan totalNominal & pcsTotal dari summary, bukan po.Items
  const stats = useMemo(() => {
    if (!poData || poData.length === 0) return null;
    const totalPo = poData.length;
    const totalNominal = poData.reduce(
      (acc, po) => acc + (Number(po.totalNominal) || 0),
      0,
    );
    const totalItems = poData.reduce(
      (acc, po) => acc + (Number(po.pcsTotal) || 0),
      0,
    );

    return { totalPo, totalNominal, totalItems };
  }, [poData]);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const isCompleted = (po: any) => {
    const inv = String(po?.noInvoice || "").trim();
    return inv.length > 0 && inv !== "-" && inv.toLowerCase() !== "unknown";
  };
  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const filteredPo = useMemo(() => {
    if (!poData) return [];
    let data = [...poData];

    // Filter by search
    const q = searchFilter.toLowerCase().trim();
    if (q) {
      data = data.filter(
        (po) =>
          (po.noPo || "").toLowerCase().includes(q) ||
          (po.noInvoice || "").toLowerCase().includes(q),
      );
    }

    // Filter by Tgl PO
    if (tglFrom) {
      const fromDate = new Date(tglFrom);
      fromDate.setHours(0, 0, 0, 0);
      data = data.filter(po => new Date(po.tglPo) >= fromDate);
    }
    if (tglTo) {
      const toDateObj = new Date(tglTo);
      toDateObj.setHours(23, 59, 59, 999);
      data = data.filter(po => new Date(po.tglPo) <= toDateObj);
    }

    // Filter by Status
    if (statusFilter !== "all") {
      data = data.filter((po) => {
        const completed = isCompleted(po);
        if (statusFilter === "complete") return completed;
        if (completed) return false;
        
        const du = daysUntil(toDate(po.expiredTgl));
        if (du == null) return statusFilter === "active";
        
        if (statusFilter === "expired") return du < 0;
        if (statusFilter === "almost_expired") return du >= 0 && du <= 14;
        if (statusFilter === "active") return du > 14;
        return true;
      });
    }

    // Sort by Tgl PO
    data.sort((a, b) => {
      const dateA = new Date(a.tglPo || 0).getTime();
      const dateB = new Date(b.tglPo || 0).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [poData, searchFilter, tglFrom, tglTo, sortOrder, statusFilter]);

  const limitData = perPage === "all" ? filteredPo.length || 1 : parseInt(perPage, 10);
  const totalPages = Math.ceil(filteredPo.length / limitData) || 1;

  const paginatedPo = useMemo(() => {
    if (perPage === "all") return filteredPo;
    const limit = parseInt(perPage, 10);
    const start = (currentPage - 1) * limit;
    return filteredPo.slice(start, start + limit);
  }, [filteredPo, perPage, currentPage]);

  if (isInitialLoad)
    return (
      <div className="py-32 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium font-sm">Memuat Master Data...</p>
      </div>
    );

  return (
    <div className="w-full space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      {/* Header Dashboard */}
      <Card className="border border-slate-100 shadow-xl bg-white relative rounded-3xl">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-blue-900 pointer-events-none">
          <Building size={140} />
        </div>
        <CardHeader className="relative z-50 pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-3xl font-black text-slate-800">
                Purchase Order Dashboard
              </CardTitle>
              <CardDescription className="text-slate-500">
                Sistem filter presisi untuk memantau performa per inisial peritel.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Global Search Bar */}
              <div ref={globalSearchRef} className="relative w-full md:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                <input
                  value={globalQuery}
                  onChange={(e) => handleGlobalSearch(e.target.value)}
                  placeholder="Cari No PO / Invoice..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all placeholder:text-slate-400 h-11"
                />
                {globalQuery && (
                  <button
                    type="button"
                    onClick={() => { setGlobalQuery(""); setGlobalResults(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Floating Results Dropdown */}
                {(globalResults !== null || globalLoading) && globalQuery.trim().length >= 2 && (
                  <div className="absolute left-0 top-full mt-2 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] max-h-[420px] overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {globalLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Mencari...</span>
                      </div>
                    ) : globalResults && globalResults.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 rounded-t-2xl sticky top-0 border-b border-slate-100">
                          {globalResults.length} hasil ditemukan
                        </div>
                        {globalResults.map((po: any) => (
                          <button
                            key={po.id}
                            type="button"
                            onClick={async () => {
                              // Load full PO into the main table
                              setGlobalResults(null);
                              setGlobalQuery("");
                              setLoadingData(true);
                              try {
                                const res = await fetch(`/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true`, { cache: "no-store" });
                                const json = await res.json();
                                const list = Array.isArray(json) ? json : json?.data || [];
                                // Also fetch summary version for the table display
                                const summaryRes = await fetch(`/api/po?noPo=${encodeURIComponent(po.noPo)}&summary=true`, { cache: "no-store" });
                                const summaryJson = await summaryRes.json();
                                const summaryList = Array.isArray(summaryJson) ? summaryJson : summaryJson?.data || [];
                                setPoData(summaryList.length > 0 ? summaryList : list);
                                setActiveNamaPt(po.RitelModern?.namaPt || "Pencarian");
                                setActiveInisial(po.RitelModern?.inisial || "");
                                // Also set the full PO for possible manual click detail later
                                if (list.length > 0) {
                                  setSelectedPO(list[0]);
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setLoadingData(false);
                              }
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                          >
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                              <FileText size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-800 text-sm truncate">{po.noPo}</div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {po.RitelModern?.namaPt || "-"}
                                {po.RitelModern?.inisial ? ` · ${po.RitelModern.inisial}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              {po.noInvoice && (
                                <div className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                                  INV: {po.noInvoice}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400">
                                {po.tglPo ? new Date(po.tglPo).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                              </div>
                            </div>
                            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Search size={36} className="text-slate-200 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">Tidak ada hasil untuk &ldquo;{globalQuery}&rdquo;</p>
                        <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link href="/po?tab=upload">
                <Button variant="outline" className="border-slate-200 text-slate-700 bg-white h-11 rounded-xl font-bold">
                  <Upload className="w-4 h-4 mr-2 text-blue-600" />
                  Bulk Upload
                </Button>
              </Link>
              <Link href="/po">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-none h-11 rounded-xl px-5 font-bold">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add PO
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Dropdown 1: Ritel */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Ritel Modern
            </label>
            <Popover open={openRitel} onOpenChange={setOpenRitel}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openRitel}
                  className="w-full justify-between bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-slate-900 h-12 rounded-xl shadow-sm transition-all"
                >
                  <span className={!selectedNamaPt ? "text-slate-400 font-normal" : "font-bold"}>
                    {selectedNamaPt || "Pilih Ritel..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverPrimitive.Portal>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white"
                  align="start"
                >
                  <Command className="bg-white border-slate-200">
                    {/* [FIX TEKS PUTIH] Tambahkan text-slate-900 */}
                    <CommandInput
                      placeholder="Cari ritel..."
                      className="!text-slate-900 placeholder:!text-slate-400 font-medium bg-white"
                    />
                    <CommandListUI className="max-h-64 scrollbar-hide">
                      <CommandEmpty className="text-slate-500 py-4 text-center">
                        Ritel tidak ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        {Array.from(
                          new Set(retailers.map((r) => r.namaPt)),
                        ).sort((a, b) => a.localeCompare(b)).map((namaPt) => (
                          <CommandItem
                            key={namaPt}
                            value={namaPt}
                            className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
                            onSelect={() => {
                              setSelectedNamaPt(namaPt);
                              setSelectedInisial(""); // Reset inisial saat ritel ganti
                              setOpenRitel(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedNamaPt === namaPt
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
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
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Inisial (Opsional)
            </label>
            <Popover open={openInisial} onOpenChange={setOpenInisial}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!selectedNamaPt}
                  aria-expanded={openInisial}
                  className="w-full justify-between bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-slate-900 h-12 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <span className={!selectedInisial ? "text-slate-400 font-normal" : "font-bold"}>
                    {selectedInisial || "Semua Inisial..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverPrimitive.Portal>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white"
                  align="start"
                >
                  <Command className="bg-white border-slate-200">
                    <CommandInput
                      placeholder="Cari inisial..."
                      className="!text-slate-900 placeholder:!text-slate-400 font-medium bg-white"
                    />
                    <CommandListUI className="max-h-64 scrollbar-hide">
                      <CommandEmpty className="text-slate-500 py-4 text-center">
                        Inisial tidak ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setSelectedInisial("");
                            setOpenInisial(false);
                          }}
                          className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedInisial === ""
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          Semua Inisial
                        </CommandItem>
                        {availableInisials.map((ini) => (
                          <CommandItem
                            key={ini}
                            value={ini}
                            onSelect={() => {
                              setSelectedInisial(ini);
                              setOpenInisial(false);
                            }}
                            className="!text-slate-900 font-medium cursor-pointer aria-selected:bg-slate-100 aria-selected:!text-slate-900 flex items-center px-4 py-2"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedInisial === ini
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
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

          <div className="md:col-span-3">
            <Button
              onClick={handleFetchData}
              disabled={!selectedNamaPt || loadingData}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {loadingData ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUpRight size={18} />
              )}
              Tampilkan Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Rendering Area */}
      {poData === null ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-8 bg-slate-50 rounded-full text-slate-200 border border-slate-100 shadow-inner">
            <Search size={80} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">
              Siap Memuat Data
            </h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">
              Pilih Ritel Modern & Inisial di atas untuk memuat ringkasan
              Purchase Order.
            </p>
          </div>
        </div>
      ) : poData.length === 0 && !loadingData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-8 bg-rose-50 rounded-full text-rose-200 border border-rose-100">
            <AlertCircle size={80} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">
              Data Tidak Ditemukan
            </h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">
              Tidak ada Purchase Order yang sesuai dengan kriteria filter
              tersebut.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedNamaPt("");
                setSelectedInisial("");
                setPoData(null);
              }}
              className="mt-4 rounded-xl border-slate-200 text-slate-800"
            >
              Reset Filter
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          {/* Table Area */}
          <Card className="border border-slate-100 shadow-2xl rounded-3xl bg-white relative z-10 w-full overflow-visible">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100 p-8 space-y-6 relative z-50">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-2xl font-black text-slate-800">
                      Daftar Purchase Order
                    </CardTitle>
                    {activeNamaPt && (
                      <span className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full shadow-sm">
                        Total {filteredPo.length} PO &middot; Hal {currentPage} dari {totalPages}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-slate-500">
                    Menampilkan data untuk{" "}
                    <span className="font-bold text-slate-900">
                      {activeNamaPt}
                    </span>
                    {activeInisial && (
                      <span>
                        {" "}
                        - Inisial{" "}
                        <span className="font-bold text-slate-900">
                          {activeInisial}
                        </span>
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full md:w-64 shrink-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Cari PO / Invoice..."
                      className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:italic h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Tabel Filter Actions */}
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
                {/* Date Picker 1 */}
                <div className="w-[140px]">
                  <DateInputHybrid
                    value={tglFrom}
                    onChange={(v) => setTglFrom(v)}
                    placeholder="Dari Tgl PO..."
                    maxDate={tglTo}
                  />
                </div>

                {/* Date Picker 2 */}
                <div className="w-[140px]">
                  <DateInputHybrid
                    value={tglTo}
                    onChange={(v) => setTglTo(v)}
                    placeholder="Sampai Tgl..."
                    minDate={tglFrom}
                  />
                </div>

                {/* Status Filter Dropdown */}
                <SmoothSelect
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as any)}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "active", label: "Active" },
                    { value: "almost_expired", label: "Almost Expired" },
                    { value: "expired", label: "Expired" },
                    { value: "complete", label: "Complete" },
                  ]}
                  width={140}
                />

                {/* Sort Dropdown */}
                <SmoothSelect
                  value={sortOrder}
                  onChange={(v) => setSortOrder(v as any)}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "oldest", label: "Oldest" },
                  ]}
                  width={120}
                />

                <div className="flex items-center gap-3 ml-2">
                  <span className="text-slate-500">Tampilkan</span>
                  <SmoothSelect
                    value={perPage}
                    onChange={(v) => setPerPage(v)}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                      { value: "all", label: "Semua" },
                    ]}
                    width={100}
                  />
                  <span className="text-slate-500">data</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-slate-100 h-12">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest pl-6 text-slate-500 text-center w-12">NO</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">NO PO</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">TGL PO</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">DUE DATE</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">PRODUK</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">PCS KIRIM</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">TUJUAN</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">UNIT PRODUKSI</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">SITE AREA</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">KG</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">DISCOUNT</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">NOMINAL</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-6 text-slate-500">AKSI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`} className="h-16 animate-pulse bg-slate-50/50">
                          <TableCell colSpan={13}>
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : paginatedPo.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="h-48 text-center bg-slate-50/30">
                          <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                            <span className="font-semibold text-lg text-slate-700">
                              {statusFilter === 'active' && 'Tidak ada data PO Active.'}
                              {statusFilter === 'almost_expired' && 'Tidak ada data PO Mendekati Expired (Almost Expired).'}
                              {statusFilter === 'expired' && 'Tidak ada data PO Expired.'}
                              {statusFilter === 'complete' && 'Tidak ada data PO Complete.'}
                              {statusFilter === 'all' && 'Tidak ada data PO yang sesuai.'}
                            </span>
                            <span className="text-sm font-medium">Bisa coba atur filter tanggal atau pencarian yang lain.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedPo.map((po, index) => (
                      <TableRow 
                        key={po.id} 
                        className="hover:bg-slate-50/70 transition-colors border-slate-50 h-16 cursor-pointer"
                        onClick={() => { setSelectedPO(po); setIsModalOpen(true); }}
                      >
                        <TableCell className="font-bold text-xs text-slate-500 text-center pl-6">
                          {perPage === "all" ? index + 1 : (currentPage - 1) * parseInt(perPage, 10) + index + 1}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-bold text-slate-800 text-xs whitespace-nowrap">{po.noPo}</div>
                          {po.noInvoice && (
                            <div className="text-[10px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
                              INV: {po.noInvoice}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-700 font-semibold text-xs whitespace-nowrap">
                          {po.tglPo ? new Date(po.tglPo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </TableCell>
                        <TableCell className="text-slate-700 font-semibold text-xs whitespace-nowrap">
                          {po.expiredTgl ? new Date(po.expiredTgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </TableCell>
                        <TableCell className="text-slate-700 font-semibold text-xs whitespace-nowrap">
                          {Number(po.itemsCount) > 1 
                            ? `${po.firstProductName || 'Item'} (+${Number(po.itemsCount) - 1} lainnya)` 
                            : (po.firstProductName || '-')}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 font-semibold text-xs tabular-nums">
                          {(Number(po.pcsKirimTotal) || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs whitespace-nowrap">
                          {po.tujuanDetail || '-'}
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs whitespace-nowrap">
                          {po.UnitProduksi?.namaRegional || po.regional || '-'}
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs whitespace-nowrap">
                          {po.UnitProduksi?.siteArea || '-'}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 font-semibold text-xs tabular-nums">
                          {(Number(po.totalKg) || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 font-semibold text-xs tabular-nums">
                          {(Number(po.totalDiscount) || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 font-semibold text-xs tabular-nums">
                          {(Number(po.totalNominal) || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            <button title="Edit" onClick={(e) => { e.stopPropagation(); setEditNoPo(po.noPo); setEditOpen(true); }} className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button title="Delete" onClick={(e) => { e.stopPropagation(); setConfirmDelete(po.noPo); }} className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-slate-50 border-t border-slate-100 p-6 flex items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 h-10 w-28 font-bold disabled:opacity-50"
                  >
                    Sebelumnya
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 h-10 w-28 font-bold disabled:opacity-50"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPO && (
        <PODetailModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPO(null);
          }}
          data={{
            ...selectedPO,
            buktiKirim: selectedPO.buktiKirim,
            buktiFp: selectedPO.buktiFp,
            company:
              selectedPO?.RitelModern?.namaPt ||
              selectedPO?.company ||
              "Unknown",
            status: {
              kirim: !!selectedPO.statusKirim,
              sdif: !!selectedPO.statusSdif,
              po: !!selectedPO.statusPo,
              fp: !!selectedPO.statusFp,
              kwi: !!selectedPO.statusKwi,
              inv: !!selectedPO.statusInv,
              tagih: !!selectedPO.statusTagih,
              bayar: !!selectedPO.statusBayar,
            },
          }}
        />
      )}

      {/* Edit Modal */}
      {editOpen && editNoPo && (
        <POEditModal
          open={editOpen}
          noPo={editNoPo}
          onClose={() => {
            setEditOpen(false);
            setEditNoPo(null);
          }}
          onSaved={() => {
            setEditOpen(false);
            setEditNoPo(null);
            handleFetchData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Data?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Anda yakin ingin menghapus PO <span className="font-bold text-slate-800">{confirmDelete}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-12"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200"
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Hapus PO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
