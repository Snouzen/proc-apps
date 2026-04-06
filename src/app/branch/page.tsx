"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  MapPin,
  CalendarRange,
  Filter,
  ChevronDown,
  Globe2,
  Loader2,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  Clock,
  ExternalLink,
} from "lucide-react";
import { getMe } from "@/lib/me";

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const formatDateId = (d: any) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ──────────────────────────────────────────────
   Custom Dropdown Component
   ────────────────────────────────────────────── */
function Dropdown({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setOpen(!open)}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setOpen(!open);
            }
          }}
          className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-sm font-medium transition-all duration-200 outline-none select-none ${
            disabled
              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-white border-slate-200 text-slate-800 hover:border-indigo-400 shadow-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          }`}
        >
          <span className={`truncate ${!value ? "text-slate-400" : ""}`}>
            {selectedLabel}
          </span>
          <ChevronDown
            size={15}
            className={`ml-2 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>

        {open && !disabled && (
          <>
            <div
              className="fixed inset-0 z-[998]"
              onClick={() => setOpen(false)}
            />
            <div className="absolute z-[999] mt-1.5 w-full max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xl p-1 shadow-2xl">
              {options.length > 0 ? (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full rounded-lg px-3.5 py-2 text-left text-sm transition-all duration-150 font-medium ${
                      opt.value === value
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">
                  Tidak ada data
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Page Component
   ────────────────────────────────────────────── */
export default function BranchPage() {
  // ── Role & User State ──
  const [role, setRole] = useState<"pusat" | "rm" | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);

  // ── Dynamic Data ──
  const [regionalData, setRegionalData] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // ── Filter State ──
  const now = new Date();
  const [selectedRegional, setSelectedRegional] = useState("");
  const [selectedSiteArea, setSelectedSiteArea] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  // ── PO Data ──
  const [poData, setPoData] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  // ── UI State Below Calendar ──
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // ── Fetch Role ──
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const r = me?.role === "rm" ? "rm" : "pusat";
        setRole(r);
        const reg = me?.regional || null;
        setUserRegional(reg);
        if (r === "rm" && reg) {
          setSelectedRegional(reg);
        }
      } catch {
        setRole("pusat");
      }
    })();
  }, []);

  // ── Fetch Regional Data from API ──
  const fetchRegions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/unit-produksi", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];

      const grouped = list.reduce(
        (acc: Record<string, string[]>, curr: any) => {
          const reg = curr.namaRegional;
          const site = curr.siteArea;
          if (!reg) return acc;
          if (!acc[reg]) acc[reg] = [];
          if (site && !acc[reg].includes(site)) acc[reg].push(site);
          return acc;
        },
        {} as Record<string, string[]>
      );

      for (const key of Object.keys(grouped)) {
        grouped[key].sort();
      }

      setRegionalData(grouped);
    } catch {
      setRegionalData({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // ── Fetch PO Data ──
  const fetchPOData = useCallback(async () => {
    if (!selectedSiteArea) {
      setPoData([]);
      return;
    }
    setPoLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "5000"); // UX FIX: Large limit for calendar
      params.set("status", "active");
      params.set("includeUnknown", "true");
      params.set("month", selectedMonth);
      params.set("year", selectedYear);
      if (selectedRegional) params.set("regional", selectedRegional);
      if (selectedSiteArea) params.set("siteArea", selectedSiteArea);

      const res = await fetch(`/api/po?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      const list = Array.isArray((json as any)?.data)
        ? (json as any).data
        : Array.isArray(json)
          ? json
          : [];
      setPoData(list);
    } catch {
      setPoData([]);
    } finally {
      setPoLoading(false);
    }
  }, [selectedRegional, selectedSiteArea]);

  useEffect(() => {
    fetchPOData();
    setSelectedDateKey(null); // Reset detail when location changes
  }, [fetchPOData]);

  // ── Derived Options ──
  const regionalOptions = useMemo(
    () =>
      Object.keys(regionalData)
        .sort()
        .map((r) => ({ value: r, label: r })),
    [regionalData]
  );

  const siteAreaOptions = useMemo(() => {
    if (!selectedRegional || !regionalData[selectedRegional]) return [];
    return regionalData[selectedRegional].map((s) => ({ value: s, label: s }));
  }, [selectedRegional, regionalData]);

  const monthOptions = MONTH_NAMES.map((m, i) => ({
    value: String(i + 1),
    label: m,
  }));

  const yearOptions = YEARS.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  // ── Calendar Logic ──
  const month = Number(selectedMonth);
  const year = Number(selectedYear);
  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay() returns 0=Sun, convert to Mon=0 based
  const firstDayRaw = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1; // Mon-based

  // UX FIX: Robust Regional Key Match Helper
  const formatDateKey = (y: number, m: number, d: number) => {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  // Group POs by tglkirim date string (YYYY-MM-DD)
  const groupedPOs = useMemo(() => {
    const map: Record<string, any[]> = {};
    poData.forEach((po) => {
      const raw = po.tglkirim || po.tglKirim;
      if (!raw) return;

      // FIX: Robust Date Parsing for Grouping
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;

      const key = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

      if (!map[key]) map[key] = [];
      map[key].push(po);
    });
    return map;
  }, [poData]);

  const totalScheduled = useMemo(() => {
    return poData.filter(po => po.tglkirim || po.tglKirim).length;
  }, [poData]);

  const totalUnscheduled = poData.filter((po) => !po.tglkirim && !po.tglKirim).length;

  // ── Handlers ──
  const handleRegionalChange = (val: string) => {
    setSelectedRegional(val);
    setSelectedSiteArea("");
    setSelectedDateKey(null);
  };

  const handlePrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    setSelectedMonth(String(m));
    setSelectedYear(String(y));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    setSelectedMonth(String(m));
    setSelectedYear(String(y));
    setSelectedDateKey(null);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
  };

  const formatDate = (d: any) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
  };

  const formatCurrency = (n: any) => {
    const num = Number(n);
    if (!num || isNaN(num)) return "-";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  // ── Loading State ──
  if (isLoading || role === null) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-full">
            <Loader2 size={32} className="text-indigo-500 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Memuat data wilayah...</p>
        </div>
      </div>
    );
  }

  // ── Build Calendar Cells ──
  const calendarCells: (null | number)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  // Pad end to make full rows of 7
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedDateLabel = selectedDateKey 
    ? (() => {
        const parts = selectedDateKey.split("-");
        return `${Number(parts[2])} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
      })()
    : "";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-lg shadow-violet-500/20">
              <Calendar size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Delivery Calendar
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-[52px]">
            Visualisasi jadwal pengiriman PO berdasarkan wilayah dan periode.
          </p>
        </div>
        {role === "rm" && userRegional && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
            <Globe2 size={14} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700">{userRegional}</span>
          </div>
        )}
      </div>

      {/* ─── Filter Section ─── */}
      <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Filter size={14} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700">Filter Wilayah & Periode</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {role === "pusat" && (
              <Dropdown
                label="Regional"
                icon={<Globe2 size={10} />}
                value={selectedRegional}
                onChange={handleRegionalChange}
                options={regionalOptions}
                placeholder="Pilih Regional..."
              />
            )}
            <Dropdown
              label="Site Area"
              icon={<MapPin size={10} />}
              value={selectedSiteArea}
              onChange={(v) => { setSelectedSiteArea(v); setSelectedDateKey(null); }}
              options={siteAreaOptions}
              placeholder={!selectedRegional ? "Pilih regional dulu" : "Pilih Site Area..."}
              disabled={!selectedRegional}
            />
            <Dropdown
              label="Bulan"
              icon={<CalendarRange size={10} />}
              value={selectedMonth}
              onChange={(v) => { setSelectedMonth(v); setSelectedDateKey(null); }}
              options={monthOptions}
            />
            <Dropdown
              label="Tahun"
              icon={<CalendarRange size={10} />}
              value={selectedYear}
              onChange={(v) => { setSelectedYear(v); setSelectedDateKey(null); }}
              options={yearOptions}
            />
          </div>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      {selectedSiteArea && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total Active PO",
              value: poData.length,
              icon: <Package size={18} />,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Sudah Dijadwalkan",
              value: totalScheduled,
              icon: <Truck size={18} />,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Belum Dijadwalkan",
              value: totalUnscheduled,
              icon: <Clock size={18} />,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200"
            >
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">{poLoading ? "..." : s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Calendar Section ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            {selectedSiteArea && (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {selectedSiteArea} · {selectedRegional}
              </p>
            )}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {!selectedSiteArea ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full mb-4">
              <Calendar size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Pilih Site Area terlebih dahulu</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Pilih Regional dan Site Area di filter atas untuk menampilkan jadwal pengiriman pada kalender.
            </p>
          </div>
        ) : poLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={20} className="text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Memuat data PO...</span>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            {/* HEADER HARI */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {DAY_LABELS.map((day, i) => (
                <div key={i} className="py-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* BODY TANGGAL */}
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="bg-slate-50/50 min-h-[50px] sm:min-h-[60px]" />;
                }

                const dateKey = formatDateKey(year, month, day);
                const pos = groupedPOs[dateKey] || [];
                const hasPOs = pos.length > 0;
                const isSelected = selectedDateKey === dateKey;
                const today = isToday(day);

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={`relative bg-white min-h-[50px] sm:min-h-[60px] p-2 cursor-pointer transition-all hover:bg-slate-50
                      ${hasPOs ? "bg-amber-50/60 hover:bg-amber-100/60" : ""}
                      ${isSelected ? "ring-2 ring-inset ring-indigo-500 z-10" : ""}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full
                        ${today ? "bg-indigo-600 text-white shadow-sm" : hasPOs ? "text-amber-900" : "text-slate-500"}
                      `}>
                        {day}
                      </span>
                      
                      {/* Tiny Badge Indicator if has POs */}
                      {hasPOs && (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-200/80 px-1.5 py-0.5 rounded-md leading-none">
                          {pos.length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Inline Detail Section ─── */}
      {selectedDateKey && (
        <div className="mt-8 border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${groupedPOs[selectedDateKey]?.length > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}`}>
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Jadwal Pengiriman: {selectedDateLabel}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {groupedPOs[selectedDateKey]?.length || 0} Purchase Orders Terjadwal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDateKey(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {groupedPOs[selectedDateKey] && groupedPOs[selectedDateKey].length > 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 border-r border-gray-100">No</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">No PO</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Company</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Inisial</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Tujuan</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Tgl PO</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Expired</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Site Area</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Regional</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">No Invoice</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Link PO</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Nama Produk</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-right">Total Nominal</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-right">Total Tagihan</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">Kirim</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">PO</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">Inv</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">Bayar</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">SDIF</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">FP</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">Kwi</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-center">Tagih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 uppercase">
                      {groupedPOs[selectedDateKey].map((po: any, idx: number) => {
                         const itemsStr = po.Items?.map((it: any) => it.Product?.name || it.namaProduk).join(", ") || "-";
                         const totalNominal = po.Items?.reduce((s: number, it: any) => s + (Number(it.nominal) || 0), 0) || 0;
                         const totalTagihan = po.Items?.reduce((s: number, it: any) => s + (Number(it.rpTagih) || 0), 0) || 0;

                         return (
                           <tr key={po.id || idx} className="hover:bg-slate-50/60 transition-colors">
                             <td className="px-4 py-3 whitespace-nowrap text-center font-semibold text-slate-500 border-r border-gray-100">{idx + 1}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-bold">{po.noPo || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800">{po.RitelModern?.namaPt || po.company || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800">{po.RitelModern?.inisial || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800 text-xs truncate max-w-[200px]" title={po.RitelModern?.tujuan || "-"}>{po.RitelModern?.tujuan || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800">{po.tglPo ? formatDateId(po.tglPo) : "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-rose-600 font-bold">{po.expiredTgl ? formatDateId(po.expiredTgl) : "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800">{po.UnitProduksi?.siteArea || po.siteArea || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800">{po.regional || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800">{po.noInvoice || "-"}</td>
                             <td className="px-4 py-3 whitespace-nowrap">
                               {po.linkPo && String(po.linkPo).trim() && po.linkPo !== "-" ? (
                                 <a href={po.linkPo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                   <ExternalLink size={16} />
                                 </a>
                               ) : "-"}
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-slate-800 text-xs truncate max-w-[200px]" title={itemsStr}>{itemsStr}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-right text-slate-800 font-medium">{formatCurrency(totalNominal)}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-right text-slate-800 font-medium">{formatCurrency(totalTagihan)}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusKirim ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusPo ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusInv ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusBayar ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusSdif ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusFp ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusKwi ? "Ya" : "Tidak"}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-slate-800">{po.statusTagih ? "Ya" : "Tidak"}</td>
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 bg-slate-50/50 border-2 border-slate-100 border-dashed rounded-3xl animate-in fade-in zoom-in duration-300">
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                  <Calendar size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold">Tidak ada pengiriman</p>
                <p className="text-slate-400 text-xs mt-1">Gak ada jadwal PO yang dikirim pada tanggal ini.</p>
              </div>
            )}
        </div>
      )}

      {/* ─── Legend ─── */}
      {selectedSiteArea && !poLoading && (
        <div className="flex items-center gap-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
            <span className="text-xs text-slate-500 font-medium">Ada Pengiriman</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded ring-2 ring-indigo-400" />
            <span className="text-xs text-slate-500 font-medium">Hari Ini</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">3</span>
            <span className="text-xs text-slate-500 font-medium">Jumlah PO</span>
          </div>
        </div>
      )}
    </div>
  );
}
