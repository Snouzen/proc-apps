"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Building2,
  Package,
  Truck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Check,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { id } from "date-fns/locale";
import * as Popover from "@radix-ui/react-popover";
import Swal from "sweetalert2";

// --- GLOBAL HELPERS ---
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 text-black px-0.5 rounded-sm font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
};

const formatRupiahDisplay = (val: number | string) => {
  const num =
    typeof val === "string" ? parseInt(val.replace(/[^0-9]/g, "")) || 0 : val;
  return new Intl.NumberFormat("id-ID").format(num);
};

// --- ELITE SEARCHABLE INPUT (Debounced & Focal-Stable) ---
const EliteSearchableInput = memo(
  ({
    label,
    placeholder,
    icon: Icon,
    value,
    onSearch,
    onCommit,
    items,
    open,
    onOpenChange,
  }: any) => {
    const [internalVal, setInternalVal] = useState(value || "");
    const [activeIndex, setActiveIndex] = useState(-1);

    useEffect(() => {
      setInternalVal(value || "");
    }, [value]);

    useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(internalVal);
      }, 500);
      return () => clearTimeout(timer);
    }, [internalVal, onSearch]);

    useEffect(() => {
      if (!open) {
        setActiveIndex(-1);
      } else if (items.length > 0) {
        setActiveIndex(0);
      } else {
        setActiveIndex(-1);
      }
    }, [open, items.length]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalVal(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((p) => (p > 0 ? p - 1 : p));
      } else if (e.key === "Enter") {
        if (activeIndex !== -1 && items[activeIndex]) {
          e.preventDefault();
          const selected = items[activeIndex];
          setInternalVal(selected);
          onCommit(selected);
          onOpenChange(false);
        }
      }
    };

    return (
      <div className="space-y-2 overflow-visible">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
          {label}
        </label>
        <Popover.Root open={open} onOpenChange={onOpenChange}>
          <Popover.Trigger asChild>
            <div className="relative group">
              <input
                type="text"
                value={internalVal}
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-4 text-xs font-bold text-slate-700 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 rounded-2xl transition-all outline-none pr-12 cursor-pointer"
                onChange={handleChange}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {internalVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInternalVal("");
                      onCommit("");
                    }}
                    className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
                <Icon
                  size={18}
                  className="text-slate-300 pointer-events-none"
                />
              </div>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-[9999] bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
              sideOffset={5}
              align="start"
              sticky="always"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {items.map((tj: string, idx: number) => (
                <button
                  key={tj}
                  type="button"
                  onClick={() => {
                    setInternalVal(tj);
                    onCommit(tj);
                    onOpenChange(false);
                  }}
                  className={`w-full px-6 py-3 text-left text-xs font-bold transition-colors border-b border-slate-50 last:border-0 cursor-pointer ${idx === activeIndex ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {highlightMatch(tj, internalVal)}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  },
);

EliteSearchableInput.displayName = "EliteSearchableInput";

const EliteProductInput = memo(
  ({
    label,
    placeholder,
    value,
    onSearch,
    onCommit,
    items,
    open,
    onOpenChange,
  }: any) => {
    const [internalVal, setInternalVal] = useState(value || "");
    const [activeIndex, setActiveIndex] = useState(-1);

    useEffect(() => {
      setInternalVal(value || "");
    }, [value]);

    useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(internalVal);
      }, 500);
      return () => clearTimeout(timer);
    }, [internalVal, onSearch]);

    useEffect(() => {
      if (!open) {
        setActiveIndex(-1);
      } else if (items.length > 0) {
        setActiveIndex(0);
      } else {
        setActiveIndex(-1);
      }
    }, [open, items.length]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalVal(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((p) => (p > 0 ? p - 1 : p));
      } else if (e.key === "Enter") {
        if (activeIndex !== -1 && items[activeIndex]) {
          e.preventDefault();
          const selected = items[activeIndex].name;
          setInternalVal(selected);
          onCommit(selected);
          onOpenChange(false);
        }
      }
    };

    return (
      <div className="space-y-2 overflow-visible">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
          {label}
        </label>
        <Popover.Root open={open} onOpenChange={onOpenChange}>
          <Popover.Trigger asChild>
            <div className="relative group">
              <input
                type="text"
                value={internalVal}
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-4 text-xs font-bold text-slate-700 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 rounded-2xl transition-all outline-none pr-12 cursor-pointer"
                onChange={handleChange}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {internalVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInternalVal("");
                      onCommit("");
                    }}
                    className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
                <Package
                  size={18}
                  className="text-slate-300 pointer-events-none"
                />
              </div>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-[9999] bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
              sideOffset={5}
              align="start"
              sticky="always"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {items.map((p: any, idx: number) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setInternalVal(p.name);
                    onCommit(p.name);
                    onOpenChange(false);
                  }}
                  className={`w-full px-6 py-4 text-left border-b border-slate-50 last:border-0 transition-all cursor-pointer group ${idx === activeIndex ? "bg-indigo-600" : "hover:bg-indigo-600"}`}
                >
                  <span
                    className={`text-xs font-bold block transition-all ${idx === activeIndex ? "text-white" : "text-slate-700 group-hover:text-white"}`}
                  >
                    {highlightMatch(p.name, internalVal)}
                  </span>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  },
);

EliteProductInput.displayName = "EliteProductInput";

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
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-500/10",
    rose: "text-rose-600 bg-rose-50 border-rose-100 ring-rose-500/10",
    slate: "text-slate-600 bg-slate-50 border-slate-100 ring-slate-500/10",
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 focus:outline-none focus:ring-4 transition-all shadow-sm bg-white cursor-pointer ${colors[colorScheme as keyof typeof colors]}`}
        >
          <span
            className={value ? "text-slate-700" : "text-slate-300 font-medium"}
          >
            {value
              ? format(new Date(value), "dd MMM yyyy", { locale: id })
              : placeholder}
          </span>
          <Calendar
            size={18}
            className={
              colorScheme === "rose" ? "text-rose-400" : "text-indigo-400"
            }
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] w-72 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-200"
          align="start"
          sideOffset={5}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                setCurrentMonth(subMonths(currentMonth, 1));
              }}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
              {format(currentMonth, "MMMM yyyy", { locale: id })}
            </h4>
            <button
              onClick={(e) => {
                e.preventDefault();
                setCurrentMonth(addMonths(currentMonth, 1));
              }}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {["S", "S", "R", "K", "J", "S", "M"].map((day, i) => (
              <div
                key={i}
                className="text-center text-[9px] font-black text-slate-300 uppercase py-1"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = value && isSameDay(day, new Date(value));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(day.toISOString());
                    setOpen(false);
                  }}
                  className={`h-8 w-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${!isCurrentMonth ? "text-slate-200 pointer-events-none" : isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {format(day, "d")}
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

// --- MAIN CONTENT ---
function NewReturPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ritelId = searchParams.get("ritelId");

  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [retailerName, setRetailerName] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [formData, setFormData] = useState<any>({
    rtvCn: "",
    tanggalRtv: new Date().toISOString(),
    maxPickup: new Date().toISOString(),
    kodeToko: "",
    namaCompany: "",
    link: "",
    statusBarang: "Belum Diambil",
    refKetStatus: "",
    lokasiBarangId: "",
    pembebananReturnId: "",
    invoiceRekon: false,
    referensiPembayaran: "",
    tanggalPembayaran: null,
    remarks: "",
    sdiReturn: "",
  });

  const [items, setItems] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState({
    produk: "",
    qtyReturn: 0,
    nominal: 0,
    rpKg: 0,
  });

  const [tujuanFilter, setTujuanFilter] = useState("");
  const [produkFilter, setProdukFilter] = useState("");
  const [lokasiFilter, setLokasiFilter] = useState("");
  const [pembebananFilter, setPembebananFilter] = useState("");
  const [units, setUnits] = useState<any[]>([]);
  const [isTujuanOpen, setIsTujuanOpen] = useState(false);
  const [isProdukOpen, setIsProdukOpen] = useState(false);
  const [isLokasiOpen, setIsLokasiOpen] = useState(false);
  const [isPembebananOpen, setIsPembebananOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState(-1);
  const STATUS_OPTIONS = ["Belum Diambil", "Sudah Diambil", "Dimusnahkan"];

  const PRIORITY_PRODUCTS = useMemo(
    () => ["PUNOKAWAN 5 KG", "BEFOOD SETRA RAMOS 5 KG"],
    [],
  );

  useEffect(() => {
    if (!ritelId) {
      router.replace("/retur");
      return;
    }
    Promise.all([
      fetch("/api/ritel").then((res) => res.json()),
      fetch("/api/product").then((res) => res.json()),
      fetch("/api/unit-produksi").then((res) => res.json()),
    ]).then(([ritelJson, productJson, unitJson]) => {
      const rList = Array.isArray(ritelJson)
        ? ritelJson
        : ritelJson?.data || [];
      const pList = Array.isArray(productJson)
        ? productJson
        : productJson?.data || [];
      const uList = Array.isArray(unitJson) ? unitJson : unitJson?.data || [];
      setRetailers(rList);
      setProducts(pList);
      setUnits(uList);
      const rCurrent = rList.find((r: any) => r.id === ritelId);
      if (rCurrent) setRetailerName(rCurrent.namaPt);
      else setRetailerName("Ritel Tidak Terdeteksi");
    });
  }, [ritelId, router]);

  const masterTujuanList = useMemo(() => {
    if (!ritelId || retailers.length === 0) return [];
    const r = retailers.find((x) => x.id === ritelId);
    if (!r) return [];
    return Array.from(
      new Set(
        retailers
          .filter((x) => x.namaPt === r.namaPt && x.tujuan)
          .map((x) => x.tujuan),
      ),
    );
  }, [ritelId, retailers]);

  const filteredTujuan = useMemo(
    () =>
      masterTujuanList.filter((tj) =>
        tj.toLowerCase().includes(tujuanFilter.toLowerCase()),
      ),
    [masterTujuanList, tujuanFilter],
  );

  const filteredLokasi = useMemo(
    () =>
      units.filter((u) =>
        u.siteArea.toLowerCase().includes(lokasiFilter.toLowerCase()),
      ),
    [units, lokasiFilter],
  );

  const filteredPembebanan = useMemo(
    () =>
      units.filter((u) =>
        u.siteArea.toLowerCase().includes(pembebananFilter.toLowerCase()),
      ),
    [units, pembebananFilter],
  );

  const filteredProducts = useMemo(() => {
    const rawFiltered = products.filter((p) =>
      p.name.toLowerCase().includes(produkFilter.toLowerCase()),
    );

    return rawFiltered.sort((a, b) => {
      const isAPriority = PRIORITY_PRODUCTS.includes(a.name.toUpperCase());
      const isBPriority = PRIORITY_PRODUCTS.includes(b.name.toUpperCase());

      if (isAPriority && !isBPriority) return -1;
      if (!isAPriority && isBPriority) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [products, produkFilter, PRIORITY_PRODUCTS]);

  const handleNumberChangeCurrent = (field: string, value: string) => {
    const raw = value.replace(/[^0-9]/g, "");
    const clean = raw.replace(/^0+/, "");
    setCurrentItem((prev: any) => ({
      ...prev,
      [field]: clean === "" ? 0 : Number(clean),
    }));
  };

  useEffect(() => {
    const nominal = currentItem.nominal || 0;
    const qty = currentItem.qtyReturn || 0;
    const result = qty > 0 ? Math.round(nominal / qty) : 0;
    setCurrentItem((prev: any) => ({ ...prev, rpKg: result }));
  }, [currentItem.nominal, currentItem.qtyReturn]);

  const addItem = () => {
    if (!currentItem.produk) {
      Swal.fire({
        icon: "warning",
        title: "Produk Kosong",
        text: "Silakan pilih produk terlebih dahulu",
        background: "#fff",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }
    setItems([...items, { ...currentItem }]);
    setCurrentItem({
      produk: "",
      qtyReturn: 0,
      nominal: 0,
      rpKg: 0,
    });
    setProdukFilter("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Daftar Kosong",
        text: "Minimal tambahkan satu barang ke daftar",
        background: "#fff",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    setLoading(true);
    try {
      // Map all items with the header data
      const records = items.map((item) => ({
        ...formData,
        ...item,
        ritelId,
      }));

      const res = await fetch("/api/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: `${items.length} Data retur berhasil disimpan`,
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => router.push(`/retur?ritelId=${ritelId}`), 2000);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data");
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Simpan",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted)
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden">
      {/* --- ELITE STICKY HEADER --- */}
      <div className="sticky top-0 z-[50] bg-white/80 backdrop-blur-3xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm text-slate-500 cursor-pointer active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-4">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Tambah Data Retur
                </h1>
                {retailerName && (
                  <div
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border transition-all animate-in slide-in-from-left duration-700 ${retailerName === "Ritel Tidak Terdeteksi" ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-indigo-50 border-indigo-100 text-indigo-700"}`}
                  >
                    <Building2
                      size={14}
                      className={
                        retailerName === "Ritel Tidak Terdeteksi"
                          ? "text-rose-400"
                          : "text-indigo-400"
                      }
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {retailerName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 pb-32">
        <form onSubmit={handleSubmit} className="space-y-10 overflow-visible">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-visible">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4 rounded-t-[40px]">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Informasi Utama Produk
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Detail barang dan nilai retur
                </p>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 overflow-visible">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  RTV / CN Number
                </label>
                <input
                  type="text"
                  value={formData.rtvCn || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, rtvCn: e.target.value });
                  }}
                  placeholder="Masukkan nomor RTV/CN"
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 rounded-2xl outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Kode Toko
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.kodeToko === 0 || formData.kodeToko === null
                      ? ""
                      : formData.kodeToko
                  }
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, kodeToko: cleanVal });
                  }}
                  placeholder="Masukkan kode toko"
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 rounded-2xl outline-none cursor-pointer"
                />
              </div>
              <EliteSearchableInput
                label="Tujuan (Toko/DC)"
                placeholder="Cari atau Ketik Tujuan..."
                icon={Search}
                value={formData.namaCompany}
                onSearch={setTujuanFilter}
                onCommit={(val: string) =>
                  setFormData((p: any) => ({ ...p, namaCompany: val }))
                }
                items={filteredTujuan}
                open={isTujuanOpen}
                onOpenChange={setIsTujuanOpen}
              />
              <div className="md:col-span-1" />

              {/* ITEM INPUT BUFFER */}
              <div className="md:col-span-2 pt-6 border-t border-slate-50">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Package size={14} /> Input Barang Retur
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <EliteProductInput
                      label="Nama Produk / Barang"
                      placeholder="Cari Nama Produk..."
                      value={currentItem.produk}
                      onSearch={setProdukFilter}
                      onCommit={(val: string) =>
                        setCurrentItem((p: any) => ({ ...p, produk: val }))
                      }
                      items={filteredProducts}
                      open={isProdukOpen}
                      onOpenChange={setIsProdukOpen}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                      Qty
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 transition-all text-sm font-black text-slate-700 placeholder:text-slate-300 pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={currentItem.qtyReturn === 0 ? "" : currentItem.qtyReturn}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCurrentItem({
                          ...currentItem,
                          qtyReturn: v === "" ? 0 : Number(v),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                      Nominal Retur (IDR)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-xs pointer-events-none">
                        Rp
                      </div>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 transition-all text-sm font-black text-slate-700 placeholder:text-slate-300 pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right"
                        value={currentItem.nominal === 0 ? "" : currentItem.nominal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCurrentItem({
                            ...currentItem,
                            nominal: v === "" ? 0 : Number(v),
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest ml-1">
                      RP / KG
                    </label>
                    <div className="px-5 py-4 text-[10px] font-black text-indigo-400 bg-indigo-50/30 rounded-2xl border-2 border-transparent h-[52px] flex items-center">
                      {currentItem.rpKg > 0
                        ? `Rp ${formatRupiahDisplay(currentItem.rpKg)}`
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm shadow-indigo-100/50 border border-indigo-100"
                  >
                    Tambah ke Daftar
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PREVIEW TABLE */}
          {items.length > 0 && (
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    Daftar Barang ({items.length})
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-10 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">
                        No
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nama Produk
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Qty
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Nominal (IDR)
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        RP/KG
                      </th>
                      <th className="px-10 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/40 transition-colors group"
                      >
                        <td className="px-10 py-5 text-xs font-black text-slate-300">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-slate-700 uppercase">
                            {item.produk}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right text-xs font-black text-slate-900">
                          {item.qtyReturn}
                        </td>
                        <td className="px-6 py-5 text-right text-xs font-black text-indigo-600">
                          Rp {formatRupiahDisplay(item.nominal)}
                        </td>
                        <td className="px-6 py-5 text-right text-xs font-bold text-slate-400">
                          Rp {formatRupiahDisplay(item.rpKg)}
                        </td>
                        <td className="px-10 py-5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/30">
                      <td
                        colSpan={3}
                        className="px-10 py-5 text-[10px] font-black text-indigo-700 uppercase tracking-widest text-right"
                      >
                        Total Nominal
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-black text-indigo-700">
                        Rp{" "}
                        {formatRupiahDisplay(
                          items.reduce((sum, it) => sum + (it.nominal || 0), 0),
                        )}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-visible">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4 rounded-t-[40px]">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
                <Truck className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Logistik & Administrasi
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Status pengiriman
                </p>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 overflow-visible">
              <EliteSearchableInput
                label="Lokasi Barang"
                placeholder="Pilih Lokasi..."
                icon={Search}
                value={
                  units.find((u) => u.idRegional === formData.lokasiBarangId)
                    ?.siteArea || ""
                }
                onSearch={setLokasiFilter}
                onCommit={(val: string) => {
                  const u = units.find((x) => x.siteArea === val);
                  setFormData((p: any) => ({
                    ...p,
                    lokasiBarangId: u?.idRegional || "",
                  }));
                }}
                items={filteredLokasi.map((u) => u.siteArea)}
                open={isLokasiOpen}
                onOpenChange={setIsLokasiOpen}
              />
              <EliteSearchableInput
                label="Pembebanan Retur"
                placeholder="Pilih Pembebanan..."
                icon={Search}
                value={
                  units.find((u) => u.idRegional === formData.pembebananReturnId)
                    ?.siteArea || ""
                }
                onSearch={setPembebananFilter}
                onCommit={(val: string) => {
                  const u = units.find((x) => x.siteArea === val);
                  setFormData((p: any) => ({
                    ...p,
                    pembebananReturnId: u?.idRegional || "",
                  }));
                }}
                items={filteredPembebanan.map((u) => u.siteArea)}
                open={isPembebananOpen}
                onOpenChange={setIsPembebananOpen}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Tanggal RTV
                </label>
                <CustomInlineDatePicker
                  value={formData.tanggalRtv}
                  onChange={(date) =>
                    setFormData({ ...formData, tanggalRtv: date })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Max Pickup
                </label>
                <CustomInlineDatePicker
                  value={formData.maxPickup}
                  onChange={(date) =>
                    setFormData({ ...formData, maxPickup: date })
                  }
                  colorScheme="rose"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Status Barang
                </label>
                <Popover.Root
                  open={isStatusOpen}
                  onOpenChange={(open) => {
                    setIsStatusOpen(open);
                    if (!open) setActiveStatusIndex(-1);
                  }}
                >
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      onKeyDown={(e) => {
                        if (!isStatusOpen) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveStatusIndex((p) =>
                            p < STATUS_OPTIONS.length - 1 ? p + 1 : p,
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveStatusIndex((p) => (p > 0 ? p - 1 : p));
                        } else if (e.key === "Enter") {
                          if (
                            activeStatusIndex !== -1 &&
                            STATUS_OPTIONS[activeStatusIndex]
                          ) {
                            e.preventDefault();
                            setFormData({
                              ...formData,
                              statusBarang: STATUS_OPTIONS[activeStatusIndex],
                            });
                            setIsStatusOpen(false);
                          }
                        }
                      }}
                      className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold bg-slate-50 border-2 border-transparent hover:border-emerald-200 rounded-2xl outline-none cursor-pointer"
                    >
                      <span className="uppercase tracking-widest">
                        {formData.statusBarang}
                      </span>
                      <ChevronDown size={18} className="text-slate-300" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-[9999] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden w-[var(--radix-popover-trigger-width)]"
                      sideOffset={5}
                      sticky="always"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="p-1">
                        {STATUS_OPTIONS.map((st, idx) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, statusBarang: st });
                              setIsStatusOpen(false);
                            }}
                            className={`w-full px-6 py-4 text-left text-xs font-black uppercase tracking-widest flex items-center justify-between rounded-xl transition-all cursor-pointer ${formData.statusBarang === st || idx === activeStatusIndex ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "text-slate-600 hover:bg-slate-50"}`}
                          >
                            {st}
                            {(formData.statusBarang === st ||
                              idx === activeStatusIndex) && <Check size={16} />}
                          </button>
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              <div className="md:col-span-1 space-y-2 invisible" />

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Link RTV
                </label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 border-2 border-transparent focus:bg-white focus:border-emerald-400 rounded-2xl outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-visible">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4 rounded-t-[40px]">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-100">
                <CreditCard className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Pembayaran
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Catatan tambahan
                </p>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 overflow-visible">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Referensi Pembayaran
                </label>
                <input
                  type="text"
                  value={formData.referensiPembayaran}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      referensiPembayaran: e.target.value,
                    })
                  }
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 border-2 border-transparent focus:bg-white focus:border-amber-400 rounded-2xl outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Tanggal Pembayaran
                </label>
                <CustomInlineDatePicker
                  value={formData.tanggalPembayaran}
                  onChange={(date) =>
                    setFormData({ ...formData, tanggalPembayaran: date })
                  }
                  colorScheme="slate"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  SDI Return Status
                </label>
                <input
                  type="text"
                  value={formData.sdiReturn}
                  onChange={(e) =>
                    setFormData({ ...formData, sdiReturn: e.target.value })
                  }
                  className="w-full px-5 py-4 text-xs font-black text-amber-600 bg-amber-50/30 border-2 border-transparent rounded-2xl outline-none cursor-pointer"
                />
              </div>
              <div
                className="flex items-center justify-between p-5 bg-slate-50 rounded-[24px] cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    invoiceRekon: !formData.invoiceRekon,
                  })
                }
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    Invoice Rekon
                  </p>
                  <p className="text-[9px] font-bold text-slate-400">
                    Sudah dilakukan rekon.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full relative transition-all ${formData.invoiceRekon ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.invoiceRekon ? "left-7" : "left-1"}`}
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Remarks / Catatan
                </label>
                <textarea
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 rounded-[28px] outline-none resize-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-6 pt-12 pb-20">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all cursor-pointer"
            >
              {"Batal & Kembali"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 px-12 py-4 bg-indigo-600 text-white rounded-[28px] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-95 disabled:opacity-50 group cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save
                  size={20}
                  className="group-hover:-translate-y-0.5 transition-transform"
                />
              )}
              {"Simpan Data Retur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- FINAL EXPORT ---
export default function NewReturPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <NewReturPageContent />
    </Suspense>
  );
}
