"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { 
  Plus, 
  Upload, 
  Search, 
  Pencil, 
  Trash2,
  Package, 
  LayoutList,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Building2,
  ChevronDown,
  ArrowLeft,
  FileSpreadsheet,
  X,
  Check,
  Calendar,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { id } from "date-fns/locale";
import * as Popover from "@radix-ui/react-popover";
import dynamic from "next/dynamic";

// Dynamic imports for heavy modals
const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), { ssr: false });
const ReturDetailModal = dynamic(() => import("@/components/retur-detail-modal"), { ssr: false });

// --- Custom Component: Smooth Date Picker ---
function CustomInlineDatePicker({
  value,
  onChange,
  placeholder = "Pilih Tanggal",
  colorScheme = "indigo",
}: {
  value: any;
  onChange: (date: string) => void;
  placeholder?: string;
  colorScheme?: "indigo" | "rose" | "slate";
}) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date(),
  );
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const colors = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-500/10 hover:border-indigo-300",
    rose: "text-rose-600 bg-rose-50 border-rose-100 ring-rose-500/10 hover:border-rose-300",
    slate: "text-slate-600 bg-slate-50 border-slate-100 ring-slate-500/10 hover:border-slate-300"
  };

  const activeColor = colors[colorScheme as keyof typeof colors] || colors.indigo;
  const iconColor = colorScheme === 'rose' ? 'text-rose-400' : 'text-indigo-400';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={`flex items-center justify-between w-full min-w-[150px] px-3 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:ring-4 transition-all shadow-sm bg-white ${activeColor}`}>
          <span className={value ? "text-slate-700" : "text-slate-300 font-medium"}>
            {value ? format(new Date(value), "dd MMM yyyy", { locale: id }) : placeholder}
          </span>
          <Calendar size={14} className={iconColor} />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="z-[150] w-72 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-200"
          align="start"
          sideOffset={5}
        >
          {/* Header Kalender */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
              {format(currentMonth, "MMMM yyyy", { locale: id })}
            </h4>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Label Hari */}
          <div className="grid grid-cols-7 mb-2">
            {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, i) => (
              <div key={i} className="text-center text-[9px] font-black text-slate-300 uppercase py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isSelected = value && isSameDay(day, new Date(value));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => {
                    onChange(day.toISOString());
                    setOpen(false);
                  }}
                  className={`
                    h-8 w-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all
                    ${!isCurrentMonth ? 'text-slate-200 pointer-events-none' : 'text-slate-600 hover:bg-slate-50'}
                    ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : ''}
                    ${isTodayDate && !isSelected ? 'text-indigo-600 border border-indigo-100 bg-indigo-50/30' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// --- NEW COMPONENT: Table Searchable Input ---
// Resolves the "one character focus loss" bug by using local stable state
function TableSearchableInput({
  value,
  onCommit,
  items,
  placeholder,
  icon: Icon = Search,
}: {
  value: string;
  onCommit: (val: string) => void;
  items: string[];
  placeholder?: string;
  icon?: any;
}) {
  const [internalVal, setInternalVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setInternalVal(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    } else if (items.length > 0) {
      setActiveIndex(0); // Auto-highlight first result
    }
  }, [open, items.length]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div className="relative w-full min-w-[200px]">
          <input
            type="text"
            value={internalVal}
            onChange={(e) => {
              setInternalVal(e.target.value);
              onCommit(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (!open) {
                if (e.key === "ArrowDown") setOpen(true);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((p) => (p > 0 ? p - 1 : p));
              } else if (e.key === "Enter") {
                if (activeIndex >= 0 && items[activeIndex]) {
                  e.preventDefault();
                  onCommit(items[activeIndex]);
                  setInternalVal(items[activeIndex]);
                  setOpen(false);
                }
              }
            }}
            className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            <Icon size={14} />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-48 overflow-y-auto w-64 p-1 animate-in fade-in zoom-in-95 duration-200"
          sideOffset={5}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {items.length === 0 ? (
            <div className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">
              Tidak ada hasil
            </div>
          ) : (
            items.map((t, idx) => (
              <button
                key={t + idx}
                onClick={() => {
                  onCommit(t);
                  setInternalVal(t);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-tight rounded-xl transition-colors ${activeIndex === idx ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-indigo-50"}`}
              >
                {t}
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TableProductInput({
  value,
  onCommit,
  items,
  placeholder,
}: {
  value: string;
  onCommit: (val: string) => void;
  items: any[];
  placeholder?: string;
}) {
  const [internalVal, setInternalVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setInternalVal(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    } else if (items.length > 0) {
      setActiveIndex(0);
    }
  }, [open, items.length]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div className="relative w-full min-w-[200px]">
          <input
            type="text"
            value={internalVal}
            onChange={(e) => {
              setInternalVal(e.target.value);
              onCommit(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (!open) {
                if (e.key === "ArrowDown") setOpen(true);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((p) => (p > 0 ? p - 1 : p));
              } else if (e.key === "Enter") {
                if (activeIndex >= 0 && items[activeIndex]) {
                  e.preventDefault();
                  onCommit(items[activeIndex].name);
                  setInternalVal(items[activeIndex].name);
                  setOpen(false);
                }
              }
            }}
            className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            <Package size={14} />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-48 overflow-y-auto w-72 p-1 animate-in fade-in zoom-in-95 duration-200"
          sideOffset={5}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {items.length === 0 ? (
            <div className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">
              Tidak ada produk
            </div>
          ) : (
            items.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  onCommit(p.name);
                  setInternalVal(p.name);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-tight rounded-xl transition-colors flex items-center justify-between group ${activeIndex === idx ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-emerald-50"}`}
              >
                <span>{p.name}</span>
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SmoothStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = ["BELUM DIAMBIL", "SUDAH DIAMBIL", "DIMUSNAHKAN"];

  const getColor = (v: string) => {
    if (v === "SUDAH DIAMBIL")
      return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (v === "DIMUSNAHKAN") return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-rose-50 text-rose-600 border-rose-100";
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`flex items-center justify-between w-full min-w-[150px] px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all shadow-sm ${getColor(value.toUpperCase())} border-transparent hover:border-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10`}
        >
          <span>{value || "BELUM DIAMBIL"}</span>
          <ChevronDown
            size={14}
            className={`opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl w-48 p-1 animate-in fade-in zoom-in-95 duration-200"
          sideOffset={5}
          align="start"
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors ${value.toUpperCase() === opt ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {opt}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// --- NEW COMPONENT: Filter Select for Header Bar ---
function FilterSelect({
  label,
  placeholder,
  value,
  onCommit,
  items,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onCommit: (val: string) => void;
  items: string[];
  icon: any;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => (i || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 min-w-[200px]">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 hover:border-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm">
            <div className="flex items-center gap-2.5 truncate">
              <div className={`p-1.5 rounded-lg ${value ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                <Icon size={14} />
              </div>
              <span className={value ? "text-slate-800" : "text-slate-400 font-medium"}>
                {value || placeholder}
              </span>
            </div>
            <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-[160] w-[260px] bg-white rounded-3xl shadow-2xl border border-slate-50 p-3 animate-in fade-in zoom-in-95 duration-200" sideOffset={10} align="start">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] focus:ring-0 placeholder:text-slate-300 font-bold"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto scrollbar-hide space-y-1 px-0.5">
              <button 
                onClick={() => { onCommit(""); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-between group"
              >
                Clear Filter
                <X size={14} className="group-hover:rotate-90 transition-transform" />
              </button>
              <div className="h-px bg-slate-50 my-1 mx-2" />
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Results</div>
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { onCommit(item); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-4 py-3 text-[11px] font-bold rounded-xl transition-all ${value === item ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item}
                  </button>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}


function ReturContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRitelId = searchParams.get("ritelId");
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [page, setPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [rowsPerPage] = useState(15);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [userArea, setUserArea] = useState<string | null>(null);
  
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [isGroupedMode, setIsGroupedMode] = useState(true);
  const [filterInisial, setFilterInisial] = useState("");
  const [filterToko, setFilterToko] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState(1); 
  const [bulkRetailerId, setBulkRetailerId] = useState<string>("");
  const [searchRetailerText, setSearchRetailerText] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [openExcelModal, setOpenExcelModal] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addRetailerId, setAddRetailerId] = useState("");
  const [searchAddText, setSearchAddText] = useState("");
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [searchToko, setSearchToko] = useState("");
  const [searchProduk, setSearchProduk] = useState("");
  const [isTokoOpen, setIsTokoOpen] = useState(false);
  const [isProdukOpen, setIsProdukOpen] = useState(false);
  const [isLokasiOpen, setIsLokasiOpen] = useState(false);
  const [searchLokasi, setSearchLokasi] = useState("");
  const [isPembebananOpen, setIsPembebananOpen] = useState(false);
  const [isInisialOpen, setIsInisialOpen] = useState(false);
  const [searchInisial, setSearchInisial] = useState("");
  const [searchPembebanan, setSearchPembebanan] = useState("");
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const selectedDetail = useMemo(() => data.find(d => d.id === viewDetailId), [data, viewDetailId]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLTableCellElement>(null);
  const comboboxInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (comboRef.current && !comboRef.current.contains(event.target as Node)) {
        setIsListOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (initialRitelId) {
      setSelectedRetailerId(initialRitelId);
      setIsGroupedMode(false);
    }
  }, [initialRitelId]);

  useEffect(() => {
    Promise.all([
      fetch("/api/ritel").then(res => res.json()),
      fetch("/api/product").then(res => res.json()),
      fetch("/api/unit-produksi").then(res => res.json()),
      import("@/lib/me").then(({ getMe }) => getMe())
    ]).then(([ritelJson, productJson, unitJson, me]) => {
      setRetailers(Array.isArray(ritelJson) ? ritelJson : (ritelJson?.data || []));
      setProducts(Array.isArray(productJson) ? productJson : (productJson?.data || []));
      setUnits(Array.isArray(unitJson) ? unitJson : (unitJson?.data || []));
      if (me?.authenticated) {
        setRole(me.role || null);
        setUserArea(me.siteArea || me.regional || null);
      }
    });
  }, []);

  const fetchRetur = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (data.length > 0) {
      setIsFetchingPage(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("page", isGroupedMode ? String(page) : "1"); 
      if (selectedRetailerId) {
        params.set("limit", "9999"); // Tarik semua data untuk client-side pagination
      } else {
        params.set("limit", String(rowsPerPage));
      }
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedRetailerId) params.set("retailerId", selectedRetailerId);

      const res = await fetch(`/api/retur?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });
      const json = await res.json();
      
      if (res.ok) {
        setIsGroupedMode(json.isGrouped);
        setData(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Fetch Retur Error:", err);
      }
    } finally {
      setLoading(false);
      setIsFetchingPage(false);
    }
  }, [page, debouncedSearch, rowsPerPage, selectedRetailerId]);

  // --- CLIENT SIDE FILTERING FOR DETAIL MODE ---
  const filteredData = useMemo(() => {
    if (isGroupedMode) return data;
    
    return data.filter(item => {
      const matchInisial = filterInisial ? item.inisial === filterInisial : true;
      const matchToko = filterToko ? item.namaCompany === filterToko : true;
      
      let matchDate = true;
      if (item.tanggalRtv) {
        const itemDate = new Date(item.tanggalRtv);
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0,0,0,0);
          if (itemDate < from) matchDate = false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23,59,59,999);
          if (itemDate > to) matchDate = false;
        }
      } else if (dateFrom || dateTo) {
        matchDate = false;
      }

      return matchInisial && matchToko && matchDate;
    });
  }, [data, isGroupedMode, filterInisial, filterToko, dateFrom, dateTo]);

  const paginatedData = useMemo(() => {
    if (isGroupedMode) return data;
    const start = (clientPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, clientPage, rowsPerPage, isGroupedMode, data]);

  const clientTotalPages = Math.ceil(filteredData.length / rowsPerPage);

  useEffect(() => {
    fetchRetur();
  }, [fetchRetur]);

  // --- AUTO CALCULATE RP/KG FOR INLINE EDIT ---
  useEffect(() => {
    if (editingId) {
      const nominal = Number(editForm.nominal) || 0;
      const qty = Number(editForm.qtyReturn) || 0;
      const result = qty > 0 ? Math.round(nominal / qty) : 0;
      if (editForm.rpKg !== result) {
        setEditForm((p: any) => ({ ...p, rpKg: result }));
      }
    }
  }, [editForm.nominal, editForm.qtyReturn, editingId]);

  const totalPages = Math.ceil(total / rowsPerPage);

  const formatIDR = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy", { locale: id });
    } catch {
      return "-";
    }
  };

  const formatNumber = (val: any) => {
    const num = Number(val) || 0;
    return num.toLocaleString("id-ID");
  };

  const filteredRetailers = useMemo(() => {
    const unique = Array.from(new Map(retailers.map(r => [r.namaPt, r])).values());
    return unique.filter(r => 
      r.namaPt.toLowerCase().includes(searchRetailerText.toLowerCase())
    );
  }, [retailers, searchRetailerText]);

  const filterOptions = useMemo(() => {
    if (!selectedRetailerId || retailers.length === 0) return { inisials: [], tokos: [] };
    const r = retailers.find(x => x.id === selectedRetailerId);
    if (!r) return { inisials: [], tokos: [] };
    
    const pt = r.namaPt.trim().toLowerCase();
    const related = retailers.filter(x => x.namaPt.trim().toLowerCase() === pt);
    
    return {
      inisials: Array.from(new Set(related.map(x => x.inisial).filter(Boolean))) as string[],
      tokos: Array.from(new Set(related.map(x => x.tujuan).filter(Boolean))) as string[],
    };
  }, [selectedRetailerId, retailers]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchRetailerText]);

  const handleSelectRetailer = (ritel: any) => {
    setBulkRetailerId(ritel.id);
    setSearchRetailerText(ritel.namaPt);
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    setSearchToko(item.namaCompany || "");
    setSearchProduk(item.produk || "");
    setSearchLokasi(item.LokasiBarang?.siteArea || ""); // TAMBAH INI
    setSearchPembebanan(item.PembebananReturn?.siteArea || ""); // TAMBAH INI
    setSearchInisial(item.inisial || "");
    setIsInisialOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setSearchToko("");
    setSearchProduk("");
    setSearchLokasi(""); // TAMBAH INI
    setSearchPembebanan(""); // TAMBAH INI
    setIsTokoOpen(false);
    setIsProdukOpen(false);
    setIsLokasiOpen(false); // TAMBAH INI
    setIsPembebananOpen(false); // TAMBAH INI
    setIsInisialOpen(false);
    setSearchInisial("");
  };

  const handleSaveInline = async (id: string) => {
    try {
      setIsFetchingPage(true);
      
      // --- DATA SANITIZATION (PURGE RELATIONAL TRASH) ---
      // Distinguish between pure data and relational objects that cause Prisma errors
      const { 
        RitelModern, 
        LokasiBarang, 
        Product, 
        PembebananReturn, 
        createdAt, 
        updatedAt,
        _count,
        ...pureData 
      } = editForm;

      // --- STRICT TYPE CASTING FOR PRISMA (NULLABLE INT) ---
      const cleanedPayload = {
        ...pureData,
        id, // Persistence
        rtvCn: pureData.rtvCn ? String(pureData.rtvCn).trim() : null,
        kodeToko: pureData.kodeToko ? Number(pureData.kodeToko.toString().replace(/[^0-9]/g, '')) : null,
        qtyReturn: Number(pureData.qtyReturn) || 0,
        nominal: Number(pureData.nominal) || 0,
        rpKg: Number(pureData.rpKg) || 0,
        tanggalRtv: pureData.tanggalRtv ? new Date(pureData.tanggalRtv).toISOString() : null,
        maxPickup: pureData.maxPickup ? new Date(pureData.maxPickup).toISOString() : null,
        tanggalPembayaran: pureData.tanggalPembayaran ? new Date(pureData.tanggalPembayaran).toISOString() : null,
        invoiceRekon: pureData.invoiceRekon || "",
        inisial: pureData.inisial || ""
      };

      const res = await fetch(`/api/retur`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data");
      }

      setEditingId(null);
      
      // --- SUCCESS TOAST ---
      Swal.fire({ 
        icon: 'success', 
        title: 'Data diperbarui', 
        toast: true, 
        position: 'top-end', 
        timer: 1500, 
        showConfirmButton: false,
        background: '#f8fafc',
        color: '#0f172a'
      });

      fetchRetur();
    } catch (error: any) {
      console.error(error);
      // --- ERROR MODAL ---
      Swal.fire({ 
        icon: 'error', 
        title: 'Gagal Menyimpan', 
        text: error.message || "Gagal menyimpan perubahan!", 
        confirmButtonColor: '#4f46e5',
        background: '#fff',
        customClass: {
          popup: 'rounded-[32px]',
          confirmButton: 'rounded-xl px-10'
        }
      });
    } finally {
      setIsFetchingPage(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Retur?',
      text: 'Data ini akan hilang permanen!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#fff',
      customClass: {
        popup: 'rounded-[32px]',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsFetchingPage(true);
        const res = await fetch(`/api/retur?id=${id}`, { 
          method: 'DELETE' 
        });
        
        if (!res.ok) {
          let errorMessage = "Gagal menghapus data";
          try {
            // Safe parse: don't crash if response is empty
            const errData = await res.json();
            errorMessage = errData.error || errorMessage;
          } catch (e) {
            // Ignore JSON parse error on failed request
          }
          throw new Error(errorMessage);
        }

        // --- BYPASS JSON PARSE (FORCE SUCCESS) ---
        Swal.fire({
          icon: 'success',
          title: 'Data dihapus!',
          toast: true,
          position: 'top-end',
          timer: 1500,
          showConfirmButton: false
        });

        // Smart UI Cleanup: Instant removal from screen
        setData(prevData => prevData.filter(item => item.id !== id));
        
        // Panggil fetch lagi untuk memastikan Card Ritel ter-update jika datanya 0
        fetchRetur();

      } catch (error: any) {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error.message || 'Gagal menghapus data',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setIsFetchingPage(false);
      }
    }
  };

  const handleDeleteGroup = async (ritelId: string, ritelName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Seluruh Data?',
      html: `Semua data retur untuk <b>${ritelName}</b> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal',
      background: '#fff',
      customClass: {
        popup: 'rounded-[32px]',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsFetchingPage(true);
        const res = await fetch(`/api/retur?ritelId=${ritelId}`, { 
          method: 'DELETE' 
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal menghapus data grup");
        }

        Swal.fire({
          icon: 'success',
          title: 'Grup Dihapus!',
          text: `Seluruh data ${ritelName} telah dibersihkan.`,
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });

        // Instant removal of the card
        setData(prev => prev.filter(r => r.id !== ritelId));
        fetchRetur();
      } catch (error: any) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
      } finally {
        setIsFetchingPage(false);
      }
    }
  };

  useEffect(() => {
    setData([]); // Bersihkan data agar tidak render crash (missing _count) saat ganti mode
    setPage(1);
    setClientPage(1);
  }, [selectedRetailerId]);

  const filteredInisial = useMemo(() => {
    if (retailers.length === 0 || !editingId) return [];
    const item = data.find(d => d.id === editingId);
    // Jika tidak ada info PT di item, coba cari dari retailers berdasarkan ritelId
    const ptName = item?.RitelModern?.namaPt || retailers.find(r => r.id === item?.ritelId)?.namaPt;
    if (!ptName) return [];

    const targetPt = ptName.trim().toLowerCase();
    return Array.from(
      new Set(
        retailers
          .filter(r => r.namaPt.trim().toLowerCase() === targetPt && r.inisial)
          .map(r => r.inisial)
      )
    ).filter(i => i && i.toLowerCase().includes(searchInisial.toLowerCase())) as string[];
  }, [retailers, searchInisial, editingId, data]);

  const masterTujuanList = useMemo(() => {
    if (!selectedRetailerId || retailers.length === 0) return [];
    const currentRetailer = retailers.find(r => r.id === selectedRetailerId);
    if (!currentRetailer) return [];
    
    // Ambil semua tujuan dari Ritel Modern dengan PT yang sama
    const list = retailers
      .filter(r => r.namaPt === currentRetailer.namaPt && r.tujuan)
      .map(r => r.tujuan);
      
    // Hilangkan duplikat
    return Array.from(new Set(list));
  }, [selectedRetailerId, retailers]);

  const filteredTujuanItems = useMemo(() => {
    if (!editForm.namaCompany) return masterTujuanList;
    return masterTujuanList.filter(tj => 
      tj.toLowerCase().includes(editForm.namaCompany.toLowerCase())
    );
  }, [masterTujuanList, editForm.namaCompany]);

  const handleTujuanKeyDown = (e: React.KeyboardEvent) => {
    if (!isListOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsListOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredTujuanItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex !== -1 && filteredTujuanItems[activeIndex]) {
        setEditForm({ ...editForm, namaCompany: filteredTujuanItems[activeIndex] });
        setIsListOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsListOpen(false);
      setActiveIndex(-1);
    }
  };

  const PRIORITY_PRODUCTS = useMemo(() => ["PUNOKAWAN 5 KG", "BEFOOD SETRA RAMOS 5 KG"], []);

  const availableToko = useMemo(() => {
    if (!editForm.id || retailers.length === 0) return [];
    // Ambil PT dari item yang sedang diedit (lewat RitelModern relation)
    const targetPt = editForm.RitelModern?.namaPt;
    if (!targetPt) return [];

    return Array.from(new Set(
      retailers
        .filter(r => r.namaPt === targetPt && r.tujuan)
        .map(r => r.tujuan)
    ));
  }, [editForm.id, editForm.RitelModern, retailers]);

  const filteredToko = useMemo(() => 
    availableToko.filter(t => t.toLowerCase().includes(searchToko.toLowerCase())),
    [availableToko, searchToko]
  );

  const filteredProductsInline = useMemo(() => {
    const raw = products.filter(p => p.name.toLowerCase().includes(searchProduk.toLowerCase()));
    return raw.sort((a, b) => {
      const idxA = PRIORITY_PRODUCTS.indexOf(a.name.toUpperCase());
      const idxB = PRIORITY_PRODUCTS.indexOf(b.name.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, searchProduk, PRIORITY_PRODUCTS]);

  const filteredLokasi = useMemo(() => {
    if (!searchLokasi) return units;
    return units.filter(u => String(u.siteArea).toLowerCase().includes(searchLokasi.toLowerCase()));
  }, [units, searchLokasi]);

  const filteredPembebanan = useMemo(() => {
    if (!searchPembebanan) return units;
    return units.filter(u => String(u.siteArea).toLowerCase().includes(searchPembebanan.toLowerCase()));
  }, [units, searchPembebanan]);

  const handleAddReturn = () => {
    if (!selectedRetailerId) {
      setShowAddModal(true);
      setAddRetailerId("");
      setSearchAddText("");
    } else {
      router.push(`/retur/new?ritelId=${selectedRetailerId}`);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-7 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {selectedRetailerId && (
            <button 
              suppressHydrationWarning
              onClick={() => {
                setSelectedRetailerId(null);
                setIsGroupedMode(true); // Switch instant
              }}
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              title="Back to List"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                 <LayoutList className="text-white" size={24} />
              </div>
              {selectedRetailerId 
                ? `Retur: ${retailers.find(r => r.id === selectedRetailerId)?.namaPt || 'Detail'}` 
                : role === "sitearea" 
                  ? `Retur Area: ${userArea}`
                  : 'Data Retur Barang'
              }
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">
              {role === "sitearea" 
                ? `Memantau pengembalian barang khusus di lokasi ${userArea}.` 
                : 'Manajemen master data pengembalian barang cabang & toko.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {role === "pusat" && (
            <>
              <button 
                suppressHydrationWarning
                onClick={() => {
                  setBulkStep(1);
                  setBulkRetailerId("");
                  setSearchRetailerText("");
                  setShowBulkModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95 group"
              >
                <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                Bulk Upload
              </button>
              <button 
                suppressHydrationWarning
                onClick={handleAddReturn}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95"
              >
                <Plus size={18} />
                Add Return
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Filter & Search ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group w-full md:w-[450px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
              size={18}
            />
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Cari RTV/CN, Toko, atau Produk..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-sm shadow-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {!isGroupedMode && (
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Record</span>
               <span className="text-sm font-black text-indigo-700 tabular-nums">{filteredData.length}</span>
            </div>
          )}
        </div>

        {selectedRetailerId && (
          <div className="p-5 lg:p-6 bg-slate-50/50 rounded-[32px] border border-slate-100/50 flex flex-wrap items-end gap-5 animate-in slide-in-from-top-4 duration-500">
            <FilterSelect 
              label="Inisial Ritel"
              placeholder="Semua Inisial"
              icon={LayoutList}
              value={filterInisial}
              onCommit={setFilterInisial}
              items={filterOptions.inisials}
            />
            <FilterSelect 
              label="Cabang / Toko"
              placeholder="Semua Toko"
              icon={Building2}
              value={filterToko}
              onCommit={setFilterToko}
              items={filterOptions.tokos}
            />
            
            <div className="flex-1 min-w-[180px]">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-400">Mulai Dari</label>
               <CustomInlineDatePicker 
                 value={dateFrom} 
                 onChange={setDateFrom}
                 placeholder="Pilih Tanggal"
               />
            </div>

            <div className="flex-1 min-w-[180px]">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-400">Hingga Akhir</label>
               <CustomInlineDatePicker 
                 value={dateTo} 
                 onChange={setDateTo}
                 placeholder="Pilih Tanggal"
               />
            </div>

            {(filterInisial || filterToko || dateFrom || dateTo) && (
              <button 
                onClick={() => {
                  setFilterInisial("");
                  setFilterToko("");
                  setDateFrom(null);
                  setDateTo(null);
                }}
                className="px-6 py-3 bg-white text-rose-500 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      {isGroupedMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-5 duration-700">
          {loading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 animate-pulse h-32" />
            ))
          ) : data.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
              Belum ada data retur yang tersimpan.
            </div>
          ) : (
            data.map((ritel) => (
              <div 
                key={ritel.id}
                onClick={() => {
                  setSelectedRetailerId(ritel.id);
                  setIsGroupedMode(false); // Switch instant
                }}
                className="group relative bg-white border border-slate-100 p-6 rounded-[32px] shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-[24px] transition-all duration-500">
                    <Building2 size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase truncate group-hover:text-indigo-700 transition-colors">
                      {ritel.namaPt}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">
                          {ritel?._count?.DataRetur || 0} Records
                        </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {role === "pusat" && (
                      <button
                        suppressHydrationWarning
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(ritel.id, ritel.namaPt);
                        }}
                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                        title="Hapus Seluruh Data Peritel"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    <div className="text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden relative animate-in zoom-in-95 duration-500">
          <div className="overflow-x-auto scrollbar-hide py-2">
             <table className="w-full text-left border-collapse table-auto">
               <thead>
                 <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <th className="sticky left-0 z-20 bg-slate-50/95 backdrop-blur px-6 py-5 w-20 text-center border-r border-slate-100">NO</th>
                   <th className="px-6 py-5 whitespace-nowrap">RTV/CN</th>
                   <th className="px-6 py-5 whitespace-nowrap">TANGGAL RTV</th>
                   <th className="px-6 py-5 whitespace-nowrap">MAX PICKUP</th>
                   <th className="px-6 py-5 text-center">KODE TOKO</th>
                   <th className="px-6 py-5">TOKO</th>
                   <th className="px-6 py-5">INISIAL</th>
                   <th className="px-6 py-5">LINK</th>
                   <th className="px-6 py-5">PRODUK</th>
                   <th className="px-6 py-5 text-center">QTY RETUR</th>
                   <th className="px-6 py-5 text-right">NOMINAL</th>
                   <th className="px-6 py-5 text-right">RP/KG</th>
                   <th className="px-6 py-5">STATUS BARANG</th>
                   <th className="px-6 py-5">REFERENSI/KET STATUS</th>
                   <th className="px-6 py-5">LOKASI BARANG</th>
                   <th className="px-6 py-5">PEMBEBANAN RETUR</th>
                   <th className="px-6 py-5 text-center">INVOICE REKON</th>
                   <th className="px-6 py-5">REFERENSI PEMBAYARAN</th>
                    <th className="px-6 py-5">TANGGAL PEMBAYARAN</th>
                    <th className="px-6 py-5">REMARKS</th>
                    <th className="px-6 py-5">SDI RETUR</th>
                    <th className="sticky right-0 z-20 bg-slate-50/95 backdrop-blur px-6 py-5 text-right border-l border-slate-100">AKSI</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-50 transition-all duration-300 ${isFetchingPage ? "opacity-50 pointer-events-none scale-[0.998]" : "opacity-100"}`}>
                  {paginatedData.map((item, idx) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => !isEditing && setViewDetailId(item.id)}
                        className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${isEditing ? 'bg-indigo-50/30' : ''}`}
                      >
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/95 backdrop-blur px-6 py-4 text-xs font-black text-slate-400 text-center tabular-nums border-r border-slate-100 transition-colors">
                          {isGroupedMode ? (page - 1) * rowsPerPage + idx + 1 : (clientPage - 1) * rowsPerPage + idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && role === "pusat" ? (
                            <input 
                              suppressHydrationWarning
                              type="text"
                              className="w-full min-w-[100px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.rtvCn || ""}
                              onChange={e => {
                                setEditForm({...editForm, rtvCn: e.target.value});
                              }}
                            />
                          ) : (
                            <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs border border-indigo-100">{item.rtvCn || "-"}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 whitespace-nowrap uppercase tracking-tighter tabular-nums">
                          {isEditing && role === "pusat" ? (
                            <CustomInlineDatePicker 
                              value={editForm.tanggalRtv}
                              onChange={(date) => setEditForm({...editForm, tanggalRtv: date})}
                              colorScheme="indigo"
                            />
                          ) : formatDate(item.tanggalRtv)}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-rose-600 whitespace-nowrap uppercase tracking-tighter tabular-nums">
                          {isEditing && role === "pusat" ? (
                            <CustomInlineDatePicker 
                              value={editForm.maxPickup}
                              onChange={(date) => setEditForm({...editForm, maxPickup: date})}
                              colorScheme="rose"
                            />
                          ) : formatDate(item.maxPickup)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing && role === "pusat" ? (
                            <input 
                              suppressHydrationWarning
                              type="text"
                              inputMode="numeric"
                              className="w-full min-w-[100px] px-3 py-1.5 text-xs font-bold text-center text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.kodeToko || ""}
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setEditForm({...editForm, kodeToko: val});
                              }}
                            />
                          ) : (
                            <span className="font-bold text-slate-600">{item.kodeToko || "-"}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && role === "pusat" ? (
                            <TableSearchableInput
                              value={editForm.namaCompany || ""}
                              onCommit={(val) => {
                                setEditForm({ ...editForm, namaCompany: val });
                                setSearchToko(val);
                              }}
                              items={filteredToko}
                              placeholder="Cari Toko..."
                            />
                          ) : (
                            <div className="text-xs font-black text-slate-800 whitespace-nowrap truncate max-w-[150px]" title={item.namaCompany}>{item.namaCompany || "-"}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && role === "pusat" ? (
                            <TableSearchableInput
                              value={editForm.inisial || ""}
                              onCommit={(val) => {
                                setEditForm({ ...editForm, inisial: val });
                                setSearchInisial(val);
                                setIsInisialOpen(false);
                              }}
                              items={filteredInisial}
                              placeholder="Cari Inisial..."
                            />
                          ) : (
                             <div className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200">
                               {item.inisial || "-"}
                             </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && role === "pusat" ? (
                            <input 
                              className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.link || ""}
                              onChange={e => setEditForm({...editForm, link: e.target.value})}
                            />
                          ) : (
                            item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-tighter hover:underline">View Result</a> : "-"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && role === "pusat" ? (
                            <TableProductInput
                              value={editForm.produk || ""}
                              onCommit={(val) => {
                                setEditForm({ ...editForm, produk: val });
                                setSearchProduk(val);
                                const p = products.find((x) => x.name === val);
                                if (p) setEditForm((prev: any) => ({ ...prev, productId: p.id }));
                              }}
                              items={filteredProductsInline}
                              placeholder="Cari Produk..."
                            />
                          ) : (
                            <div className="text-xs font-bold text-slate-600 whitespace-nowrap max-w-[150px] truncate" title={item.produk}>{item.produk || "-"}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-slate-800 tabular-nums text-xs">
                          {isEditing && role === "pusat" ? (
                            <input 
                              type="number"
                              className="w-full min-w-[100px] px-3 py-2 text-xs font-bold text-center text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer"
                              value={editForm.qtyReturn === 0 ? "" : editForm.qtyReturn}
                              onChange={e => {
                                const v = e.target.value;
                                setEditForm({...editForm, qtyReturn: v === '' ? 0 : Number(v)});
                              }}
                            />
                          ) : formatNumber(item.qtyReturn)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 tabular-nums text-xs">
                          {isEditing && role === "pusat" ? (
                            <input 
                              type="number"
                              className="w-full min-w-[120px] px-3 py-2 text-xs font-bold text-right text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer"
                              value={editForm.nominal === 0 ? "" : editForm.nominal}
                              onChange={e => {
                                const v = e.target.value;
                                setEditForm({...editForm, nominal: v === '' ? 0 : Number(v)});
                              }}
                            />
                          ) : formatIDR(item.nominal)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-500 tabular-nums text-xs italic">
                          {isEditing ? (
                            <div className="w-full min-w-[120px] px-3 py-2 text-xs font-black text-right text-indigo-700 bg-indigo-50/30 rounded-lg border-2 border-transparent tabular-nums">
                              {formatIDR(editForm.rpKg || 0)}
                            </div>
                          ) : (
                            formatIDR(item.rpKg)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <SmoothStatusSelect 
                              value={editForm.statusBarang || "BELUM DIAMBIL"}
                              onChange={v => setEditForm({...editForm, statusBarang: v})}
                            />
                          ) : (
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              item.statusBarang?.toUpperCase() === "SUDAH DIAMBIL" 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : item.statusBarang?.toUpperCase() === "DIMUSNAHKAN"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}>
                              {item.statusBarang || "Belum Diambil"}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {isEditing && role === "pusat" ? (
                            <input 
                              className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.refKetStatus || ""}
                              onChange={e => setEditForm({...editForm, refKetStatus: e.target.value})}
                            />
                          ) : (item.refKetStatus || "-")}
                        </td>
                        <td className="px-6 py-4">
                          {/* Lokasi Barang Tetap Bisa di Edit oleh Site Area */}
                          {isEditing ? (
                            <TableSearchableInput
                              value={units.find((u) => u.idRegional === editForm.lokasiBarangId)?.siteArea || ""}
                              onCommit={(val) => {
                                const u = units.find((x) => x.siteArea === val);
                                setEditForm({ ...editForm, lokasiBarangId: u?.idRegional || "" });
                                setSearchLokasi(val);
                              }}
                              items={filteredLokasi.map((u) => u.siteArea)}
                              placeholder="Cari Lokasi/DC..."
                            />
                          ) : (
                            <div className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                              {item.LokasiBarang?.siteArea || "-"}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {/* Pembebanan Hanya Bisa di Edit oleh Pusat */}
                          {isEditing && role === "pusat" ? (
                            <TableSearchableInput
                              value={units.find((u) => u.idRegional === editForm.pembebananReturnId)?.siteArea || ""}
                              onCommit={(val) => {
                                const u = units.find((x) => x.siteArea === val);
                                setEditForm({ ...editForm, pembebananReturnId: u?.idRegional || "" });
                                setSearchPembebanan(val);
                              }}
                              items={filteredPembebanan.map((u) => u.siteArea)}
                              placeholder="Cari Pembebanan..."
                            />
                          ) : (
                            <div className="text-[10px] font-bold text-indigo-500 whitespace-nowrap">
                              {item.PembebananReturn?.siteArea || "-"}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing && role === "pusat" ? (
                            <input 
                              className="w-full min-w-[150px] px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.invoiceRekon || ""}
                              onChange={e => setEditForm({...editForm, invoiceRekon: e.target.value})}
                              placeholder="No Invoice Rekon..."
                            />
                          ) : (
                            item.invoiceRekon ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 shadow-sm whitespace-nowrap">
                                {item.invoiceRekon}
                              </div>
                            ) : (
                              <div className="w-2 h-2 rounded-full mx-auto bg-slate-200" />
                            )
                          )}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap italic">
                          {isEditing && role === "pusat" ? (
                            <input 
                              className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.referensiPembayaran || ""}
                              onChange={e => setEditForm({...editForm, referensiPembayaran: e.target.value})}
                            />
                          ) : (item.referensiPembayaran || "-")}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                          {isEditing && role === "pusat" ? (
                            <CustomInlineDatePicker 
                              value={editForm.tanggalPembayaran}
                              onChange={(date) => setEditForm({...editForm, tanggalPembayaran: date})}
                              colorScheme="slate"
                            />
                          ) : formatDate(item.tanggalPembayaran)}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-medium text-slate-400 max-w-[150px] truncate" title={item.remarks}>
                          {isEditing && role === "pusat" ? (
                            <input 
                              className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.remarks || ""}
                              onChange={e => setEditForm({...editForm, remarks: e.target.value})}
                            />
                          ) : (item.remarks || "-")}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-amber-600 whitespace-nowrap">
                          {isEditing && role === "pusat" ? (
                            <input 
                              className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                              value={editForm.sdiReturn || ""}
                              onChange={e => setEditForm({...editForm, sdiReturn: e.target.value})}
                            />
                          ) : (item.sdiReturn || "-")}
                        </td>
                        <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50/95 backdrop-blur px-6 py-4 border-l border-slate-100 transition-colors">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={() => handleSaveInline(item.id)} 
                                  disabled={isFetchingPage}
                                  className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90 disabled:opacity-50"
                                >
                                  {isFetchingPage ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                </button>
                                <button onClick={handleCancelEdit} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90">
                                  <X size={15} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleStartEdit(item)} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-all shadow-sm active:scale-90">
                                  <Pencil size={15} />
                                </button>
                                {role === "pusat" && (
                                  <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 cursor-pointer"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ReturDetailModal 
              isOpen={!!viewDetailId} 
              onClose={() => setViewDetailId(null)} 
              data={selectedDetail}
            />

          {!isGroupedMode && (
             <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Menampilkan <span className="text-indigo-600">{(clientPage - 1) * rowsPerPage + 1}</span> - <span className="text-indigo-600">{Math.min(clientPage * rowsPerPage, filteredData.length)}</span> dari <span className="text-slate-800 font-black">{filteredData.length}</span> data
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setClientPage(1)} 
                    disabled={clientPage === 1}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setClientPage(p => Math.max(1, p - 1))} 
                    disabled={clientPage === 1}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                     <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter tabular-nums">
                        Page {clientPage} of {clientTotalPages}
                     </span>
                  </div>
                  
                  <button 
                    onClick={() => setClientPage(p => Math.min(clientTotalPages, p + 1))} 
                    disabled={clientPage === clientTotalPages || clientTotalPages === 0}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={() => setClientPage(clientTotalPages)} 
                    disabled={clientPage === clientTotalPages || clientTotalPages === 0}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
             </div>
          )}
        </div>
      )}

      {/* ── BULK UPLOAD MODAL (SWITCHABLE CONTROLLERS) ─────────────────── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowBulkModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 overflow-visible">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Bulk Upload Retur</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Step {bulkStep} of 2: {bulkStep === 1 ? 'Pilih Ritel' : 'Upload File'}</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                <ChevronDown size={20} />
              </button>
            </div>

            <div className="p-8 overflow-visible">
              {bulkStep === 1 ? (
                <div className="space-y-8">
                  <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-700 p-5 rounded-[24px] text-xs font-bold leading-relaxed shadow-sm">
                    Pilih perusahaan peritel (Modern Ritel) terlebih dahulu untuk memandu pemetaan data secara spesifik sebelum mengunggah berkas.
                  </div>

                  <div className="flex flex-col items-center max-w-md mx-auto w-full space-y-6 pb-2">
                    <div className="w-full relative" ref={dropdownRef}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                        Pilih Ritel Modern
                      </label>
                      
                      <div className="relative group">
                        <input 
                          type="text"
                          placeholder="Ketik untuk mencari ritel..."
                          value={searchRetailerText}
                          onChange={(e) => {
                            setSearchRetailerText(e.target.value);
                            setIsDropdownOpen(true);
                            if (!e.target.value) setBulkRetailerId("");
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          onKeyDown={(e) => {
                             if (!isDropdownOpen) return;
                             if (e.key === "ArrowDown") {
                                setActiveIndex(prev => (prev < filteredRetailers.length - 1 ? prev + 1 : prev));
                                e.preventDefault();
                             } else if (e.key === "ArrowUp") {
                                setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
                                e.preventDefault();
                             } else if (e.key === "Enter" && activeIndex >= 0) {
                                handleSelectRetailer(filteredRetailers[activeIndex]);
                                e.preventDefault();
                             }
                          }}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all text-sm font-black text-slate-700 placeholder:text-slate-300 pr-24"
                        />
                        
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {searchRetailerText && (
                            <button 
                              onClick={() => {
                                setSearchRetailerText("");
                                setBulkRetailerId("");
                                setIsDropdownOpen(true);
                              }}
                              className="p-1.5 bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <ChevronDown size={20} className={`text-slate-300 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                      </div>

                      {isDropdownOpen && (
                        <ul className="absolute left-0 right-0 top-full mt-3 bg-white border border-slate-100 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-[250px] overflow-y-auto z-[999] py-2 animate-in fade-in slide-in-from-top-2 duration-300 scrollbar-hide">
                          {filteredRetailers.length > 0 ? (
                            filteredRetailers.map((r, idx) => (
                              <li 
                                key={r.id}
                                onClick={() => handleSelectRetailer(r)}
                                onMouseEnter={() => setActiveIndex(idx)}
                                className={`px-5 py-3.5 cursor-pointer text-xs font-black uppercase tracking-tighter transition-all border-b border-slate-50 last:border-0 ${
                                  bulkRetailerId === r.id || activeIndex === idx 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {highlightMatch(r.namaPt, searchRetailerText)}
                                {bulkRetailerId === r.id && <div className={`mt-1 text-[8px] font-medium ${activeIndex === idx ? 'text-indigo-200' : 'text-indigo-400'} animate-pulse`}>SELECTED</div>}
                              </li>
                            ))
                          ) : (
                            <li className="px-5 py-10 text-center flex flex-col items-center gap-3">
                               <div className="p-3 bg-slate-50 rounded-2xl text-slate-200"><Search size={24} /></div>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Data &quot;{searchRetailerText}&quot; Tidak Ada
                               </span>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    <button 
                      disabled={!bulkRetailerId}
                      onClick={() => setBulkStep(2)}
                      className={`w-full py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        bulkRetailerId 
                        ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                      }`}
                    >
                      LANJUTKAN KE UPLOAD <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-[24px]">
                     <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm">
                        <FileSpreadsheet size={18} />
                     </div>
                     <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest uppercase">
                        Retailer: {retailers.find(r => r.id === bulkRetailerId)?.namaPt}
                     </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-[32px] p-10 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-5">
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
                       <Upload size={32} />
                    </div>
                    <div>
                       <p className="text-sm font-black text-slate-700">Sistem Sudah Siap</p>
                       <p className="text-xs font-medium text-slate-500 mt-1 max-w-[250px] mx-auto">
                          Klik tombol di bawah ini untuk memunculkan jendela upload file Excel.
                       </p>
                    </div>
                    <button 
                       onClick={() => {
                          setShowBulkModal(false);
                          setTimeout(() => setOpenExcelModal(true), 200);
                       }}
                       className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
                    >
                       <FileSpreadsheet size={16} /> Buka Menu Upload
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                       setBulkStep(1);
                       setIsDropdownOpen(true);
                    }}
                    className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Ganti Retailer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EXTERNAL MODAL (ROOT LEVEL) ────────────────────────────────── */}
      {openExcelModal && (
        <ExcelBulkModal 
          open={openExcelModal}
          onClose={() => setOpenExcelModal(false)}
          variant="retur"
          retailerId={bulkRetailerId}
          onSuccess={() => {
             setOpenExcelModal(false);
             fetchRetur();
          }}
        />
      )}

      {/* ── ADD RETURN MODAL (MANUAL SELECTION) ────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 overflow-visible">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Tambah Data Retur</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pilih Ritel Modern</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-visible space-y-8">
              <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-700 p-5 rounded-[24px] text-xs font-bold leading-relaxed shadow-sm">
                Pilih perusahaan peritel (Modern Ritel) terlebih dahulu sebelum mengisi form data retur baru.
              </div>

              <div className="flex flex-col items-center max-w-md mx-auto w-full space-y-6 pb-2">
                <div className="w-full relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                    Pilih Ritel Modern
                  </label>
                  
                  <div className="relative group">
                    <input 
                      type="text"
                      placeholder="Ketik untuk mencari ritel..."
                      value={searchAddText}
                      onChange={(e) => {
                        setSearchAddText(e.target.value);
                        setIsAddDropdownOpen(true);
                        if (!e.target.value) setAddRetailerId("");
                      }}
                      onFocus={() => setIsAddDropdownOpen(true)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all text-sm font-black text-slate-700 placeholder:text-slate-300 pr-24"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {searchAddText && (
                        <button 
                          onClick={() => { setSearchAddText(""); setAddRetailerId(""); setIsAddDropdownOpen(true); }}
                          className="p-1.5 bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <ChevronDown size={20} className={`text-slate-300 transition-transform duration-500 ${isAddDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </div>
                  </div>

                  {isAddDropdownOpen && (
                    <ul className="absolute left-0 right-0 top-full mt-3 bg-white border border-slate-100 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-[250px] overflow-y-auto z-[999] py-2 animate-in fade-in slide-in-from-top-2 duration-300 scrollbar-hide">
                      {filteredRetailers
                        .filter(r => r.namaPt.toLowerCase().includes(searchAddText.toLowerCase()))
                        .map((r, idx) => (
                        <li 
                          key={r.id}
                          onClick={() => {
                            setAddRetailerId(r.id);
                            setSearchAddText(r.namaPt);
                            setIsAddDropdownOpen(false);
                          }}
                          className={`px-5 py-3.5 cursor-pointer text-xs font-black uppercase tracking-tighter transition-all border-b border-slate-50 last:border-0 ${
                            addRetailerId === r.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {r.namaPt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button 
                  disabled={!addRetailerId}
                  onClick={() => router.push(`/retur/new?ritelId=${addRetailerId}`)}
                  className={`w-full py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    addRetailerId 
                    ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  LANJUTKAN KE FORM INPUT <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Soft Loading Overlay */}
      {isFetchingPage && (
        <div className="fixed bottom-10 right-10 z-[110] animate-in slide-in-from-bottom-5 duration-500">
           <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3">
              <Loader2 className="text-indigo-600 animate-spin" size={20} />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Refreshing Data...</span>
           </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense 
      fallback={
        <div className="p-10 flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Menyiapkan Data Retur...</p>
        </div>
      }
    >
      <ReturContent />
    </Suspense>
  );
}
