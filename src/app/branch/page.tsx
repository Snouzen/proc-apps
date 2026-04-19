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
  Search,
} from "lucide-react";
import { getMe } from "@/lib/me";
import SmoothSelect from "@/components/ui/smooth-select";
import PODetailModal from "@/components/po-detail-modal";
import DateInputHybrid from "@/components/DateInputHybrid";

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */
const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
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
   Main Page Component
   ────────────────────────────────────────────── */
export default function BranchPage() {
  // ── Role & User State ──
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);

  // ── Dynamic Data ──
  const [regionalData, setRegionalData] = useState<Record<string, string[]>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);

  // ── Filter State ──
  const now = new Date();
  const [selectedRegional, setSelectedRegional] = useState("");
  const [selectedSiteArea, setSelectedSiteArea] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  // ── PO Data ──
  const [poData, setPoData] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  // ── UI State Below Calendar ──
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // ── State Inline Table ──
  const [inlineSearch, setInlineSearch] = useState("");
  const [inlineDateFrom, setInlineDateFrom] = useState("");
  const [inlineDateTo, setInlineDateTo] = useState("");
  const [colsOpen, setColsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    noPo: true,
    tglPo: true,
    expired: true,
    produk: true,
    tglKirim: true,
    pcs: true,
    pcsKirim: true,
    namaSupir: true,
    platNomor: true,
    totalKg: true,
    tujuan: true,
    regional: true,
    siteArea: true,
    nominal: true,
  });

  const [selectedDetailPO, setSelectedDetailPO] = useState<any>(null);

  const toggleAllCols = (val: boolean) => {
    const next = {} as typeof visibleCols;
    Object.keys(visibleCols).forEach((k) => {
      next[k as keyof typeof visibleCols] = val;
    });
    setVisibleCols(next);
  };

  // Reset state saat ganti tanggal
  useEffect(() => {
    setInlineSearch("");
    setInlineDateFrom("");
    setInlineDateTo("");
    setColsOpen(false);
  }, [selectedDateKey]);

  // ── Fetch Role ──
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const r = me?.role === "rm" || me?.role === "sitearea" 
          ? (me.role as "rm" | "sitearea") 
          : "pusat";
        
        setRole(r as any);

        // Ekstrak data asli & Normalisasi Fallback
        const reg = me?.regional || "";
        const emailPrefix = me?.email ? me.email.split('@')[0].toUpperCase() : "";
        
        // Normalisasi: SPPSUMBAWA -> SPP SUMBAWA, SPBDKI -> SPB DKI
        let formattedSite = emailPrefix;
        if (emailPrefix.startsWith("SPP") && emailPrefix.length > 3) {
            formattedSite = "SPP " + emailPrefix.substring(3);
        } else if (emailPrefix.startsWith("SPB") && emailPrefix.length > 3) {
            formattedSite = "SPB " + emailPrefix.substring(3);
        }

        const site = me?.siteArea || formattedSite;
        
        setUserRegional(reg);
        setUserSiteArea(site);

        // KUNCI STATE ABSOLUT
        if (r === "sitearea") {
          setSelectedRegional(reg);
          setSelectedSiteArea(site); 
        } else if (r === "rm") {
          setSelectedRegional(reg);
          setSelectedSiteArea("ALL");
        } else {
          setSelectedRegional("ALL");
          setSelectedSiteArea("ALL");
        }
      } catch {
        setRole("pusat");
      }
    })();
  }, []);



  // ── Fetch Regional Data from API ──
  const JUNK_VALUES = [
    "unknown",
    "site area belum ada unit produksi",
    "belum ada",
    "n/a",
    "none",
    "-",
    "",
  ];
  const isJunk = (v?: string | null) =>
    !v || JUNK_VALUES.includes(v.trim().toLowerCase());

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
          // Skip junk regional or junk site area
          if (isJunk(reg)) return acc;
          if (!acc[reg]) acc[reg] = [];
          if (!isJunk(site) && !acc[reg].includes(site)) acc[reg].push(site);
          return acc;
        },
        {} as Record<string, string[]>,
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
    // Role Pusat can view all, but RM and others must have at least regional selected if siteArea is not global
    // But for this calendar, let's allow total view if both are empty for Pusat
    setPoLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "5000"); // UX FIX: Large limit for calendar
      params.set("status", "active");
      params.set("includeUnknown", "true");
      params.set("month", selectedMonth);
      params.set("year", selectedYear);
      params.set("month", selectedMonth);
      params.set("year", selectedYear);
      if (selectedRegional && selectedRegional !== "ALL")
        params.set("regional", selectedRegional);
      if (selectedSiteArea && selectedSiteArea !== "ALL")
        params.set("siteArea", selectedSiteArea);

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
  const regionalOptions = useMemo(() => {
    // JIKA BUKAN PUSAT, KUNCI MATI HANYA DI REGIONAL MILIKNYA
    if (role !== "pusat" && selectedRegional) {
      return [{ value: selectedRegional, label: selectedRegional }];
    }
    
    const base = Object.keys(regionalData).sort().map((r) => ({ value: r, label: r }));
    return [{ value: "ALL", label: "Semua Regional" }, ...base];
  }, [regionalData, role, selectedRegional]);

  const siteAreaOptions = useMemo(() => {
    // KUNCI MATI UNTUK CABANG: HANYA ADA 1 OPSI
    if (role === "sitearea") {
      const siteLabel = userSiteArea || selectedSiteArea;
      return [{ value: siteLabel, label: siteLabel }];
    }

    if (!selectedRegional || selectedRegional === "ALL") {
      return [{ value: "ALL", label: "Semua Site Area" }];
    }
    
    const sites = regionalData[selectedRegional] || [];
    const base = sites.map((s) => ({ value: s, label: s }));
    return [{ value: "ALL", label: "Semua Site Area" }, ...base];
  }, [selectedRegional, regionalData, role, userSiteArea, selectedSiteArea]);

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
    return poData.filter((po) => po.tglkirim || po.tglKirim).length;
  }, [poData]);

  const totalUnscheduled = poData.filter(
    (po) => !po.tglkirim && !po.tglKirim,
  ).length;

  const filteredDetailPOs = useMemo(() => {
    if (!selectedDateKey || !groupedPOs[selectedDateKey]) return [];
    let list = groupedPOs[selectedDateKey];

    if (inlineSearch.trim()) {
      const q = inlineSearch.toLowerCase();
      list = list.filter((po) => {
        const noPo = String(po.noPo || "").toLowerCase();
        const noInv = String(po.noInvoice || "").toLowerCase();
        const comp = String(
          po.RitelModern?.namaPt || po.company || "",
        ).toLowerCase();
        const ini = String(po.RitelModern?.inisial || "").toLowerCase();
        return (
          noPo.includes(q) ||
          noInv.includes(q) ||
          comp.includes(q) ||
          ini.includes(q)
        );
      });
    }
    if (inlineDateFrom) {
      const from = new Date(inlineDateFrom).getTime();
      list = list.filter(
        (po) => po.tglPo && new Date(po.tglPo).getTime() >= from,
      );
    }
    if (inlineDateTo) {
      const to = new Date(inlineDateTo).getTime() + 86399999; // End of day
      list = list.filter(
        (po) => po.tglPo && new Date(po.tglPo).getTime() <= to,
      );
    }
    return list;
  }, [selectedDateKey, groupedPOs, inlineSearch, inlineDateFrom, inlineDateTo]);

  // ── Handlers ──
  const handleRegionalChange = (val: string) => {
    setSelectedRegional(val);
    setSelectedSiteArea("ALL");
    setSelectedDateKey(null);
  };

  const handlePrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m));
    setSelectedYear(String(y));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m));
    setSelectedYear(String(y));
    setSelectedDateKey(null);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    );
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
          <p className="text-sm font-semibold text-slate-500">
            Memuat data wilayah...
          </p>
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
      </div>

      {/* ─── Filter Section ─── */}
      <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Filter size={14} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700">
              Filter Wilayah & Periode
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SEMBUNYIKAN REGIONAL JIKA ROLE ADALAH CABANG */}
            {role !== "sitearea" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe2 size={12} /> Regional
                </label>
                <SmoothSelect
                  value={selectedRegional}
                  onChange={handleRegionalChange}
                  options={regionalOptions}
                  disabled={role !== "pusat"} // 👈 HANYA PUSAT YANG BISA UBAH REGIONAL
                />
              </div>
            )}
            
            {/* SITE AREA DIKUNCI JIKA CABANG */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={12} /> Site Area
              </label>
              <SmoothSelect
                value={selectedSiteArea}
                onChange={(v) => {
                  if (role !== "sitearea") {
                    setSelectedSiteArea(v);
                    setSelectedDateKey(null);
                  }
                }}
                options={siteAreaOptions}
                disabled={role === "sitearea"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarRange size={12} /> Bulan
              </label>
              <SmoothSelect
                value={selectedMonth}
                onChange={(v) => {
                  setSelectedMonth(v);
                  setSelectedDateKey(null);
                }}
                options={monthOptions}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarRange size={12} /> Tahun
              </label>
              <SmoothSelect
                value={selectedYear}
                onChange={(v) => {
                  setSelectedYear(v);
                  setSelectedDateKey(null);
                }}
                options={yearOptions}
              />
            </div>
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
                <p className="text-xs font-semibold text-slate-400">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {poLoading ? "..." : s.value}
                </p>
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
            <p className="text-sm font-semibold text-slate-500">
              Pilih Site Area terlebih dahulu
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Pilih Regional dan Site Area di filter atas untuk menampilkan
              jadwal pengiriman pada kalender.
            </p>
          </div>
        ) : poLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={20} className="text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">
              Memuat data PO...
            </span>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            {/* HEADER HARI */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {DAY_LABELS.map((day, i) => (
                <div
                  key={i}
                  className="py-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* BODY TANGGAL */}
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="bg-slate-50/50 min-h-[50px] sm:min-h-[60px]"
                    />
                  );
                }

                const dateKey = formatDateKey(year, month, day);
                const pos = groupedPOs[dateKey] || [];
                const hasPOs = pos.length > 0;
                const isSelected = selectedDateKey === dateKey;
                const today = isToday(day);

                const totalKg = hasPOs
                  ? pos.reduce((acc, po) => {
                      const items = Array.isArray(po.Items) ? po.Items : [];
                      const kg = items.reduce((s: number, it: any) => {
                        const sat = Number(it.Product?.satuanKg || 1);
                        return (
                          s + (Number(it.pcsKirim) || Number(it.pcs) || 0) * sat
                        );
                      }, 0);
                      return acc + kg;
                    }, 0)
                  : 0;

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={`relative group bg-white min-h-[50px] sm:min-h-[60px] p-2 cursor-pointer transition-all hover:bg-slate-50
                      ${hasPOs ? "bg-amber-50/60 hover:bg-amber-100/60" : ""}
                      ${isSelected ? "ring-2 ring-inset ring-indigo-500 z-10" : ""}
                    `}
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <span
                        className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full
                        ${today ? "bg-indigo-600 text-white shadow-sm" : hasPOs ? "text-amber-900" : "text-slate-500"}
                      `}
                      >
                        {day}
                      </span>

                      {/* Tiny Badge Indicator if has POs */}
                      {hasPOs && (
                        <span 
                          className="text-[9px] font-black text-amber-700 bg-amber-200/80 px-1.5 py-0.5 rounded-md leading-none"
                          title={`${pos.length} PO Terjadwal`}
                        >
                          {pos.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Embedded Total Kg Data */}
                    {hasPOs && (
                      <div className="mt-0.5 relative z-10">
                        <span className="text-[10px] sm:text-[11px] font-black text-amber-800 tracking-tight leading-none block">
                          {totalKg.toLocaleString("id-ID")} <span className="text-[8px] font-bold text-amber-700/70">KG</span>
                        </span>
                      </div>
                    )}
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
              <div
                className={`p-2.5 rounded-xl ${groupedPOs[selectedDateKey]?.length > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}`}
              >
                <Truck size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Jadwal Pengiriman: {selectedDateLabel}
                </h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {filteredDetailPOs.length} /{" "}
                  {groupedPOs[selectedDateKey]?.length || 0} Purchase Orders
                  Terjadwal
                  {inlineSearch && ` (Filter: "${inlineSearch}")`}
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

          {/* TOOLBAR TABEL */}
          <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center justify-between bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={inlineSearch}
                  onChange={(e) => setInlineSearch(e.target.value)}
                  placeholder="Cari No PO, Inv, Company, Inisial..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <DateInputHybrid
                  value={inlineDateFrom}
                  onChange={setInlineDateFrom}
                  placeholder="Date From"
                  className="w-36"
                />
                <span className="text-slate-300 font-bold">to</span>
                <DateInputHybrid
                  value={inlineDateTo}
                  onChange={setInlineDateTo}
                  placeholder="Date To"
                  className="w-36"
                />
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setColsOpen(!colsOpen)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2"
              >
                Customize Columns <ChevronDown size={14} />
              </button>
              {colsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[40]"
                    onClick={() => setColsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-[600px] max-w-[90vw] bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 z-50">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <span className="text-sm font-black text-slate-800">
                        Pilih Kolom
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAllCols(true)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100"
                        >
                          Show All
                        </button>
                        <button
                          onClick={() => toggleAllCols(false)}
                          className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100"
                        >
                          Hide All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 max-h-72 overflow-y-auto p-1">
                      {Object.keys(visibleCols).map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-[11px] font-bold text-slate-600 cursor-pointer capitalize"
                        >
                          <input
                            type="checkbox"
                            checked={(visibleCols as any)[key]}
                            onChange={() =>
                              setVisibleCols((prev) => ({
                                ...prev,
                                [key]: !(prev as any)[key],
                              }))
                            }
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {filteredDetailPOs.length > 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      {visibleCols.noPo && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          No PO
                        </th>
                      )}
                      {visibleCols.tglPo && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Tgl PO
                        </th>
                      )}
                      {visibleCols.expired && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Expired
                        </th>
                      )}
                      {visibleCols.produk && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Produk
                        </th>
                      )}
                      {visibleCols.tglKirim && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Tgl Kirim
                        </th>
                      )}
                      {visibleCols.pcs && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-right">
                          Pcs
                        </th>
                      )}
                      {visibleCols.pcsKirim && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-right">
                          Pcs Kirim
                        </th>
                      )}
                      {visibleCols.namaSupir && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Nama Supir
                        </th>
                      )}
                      {visibleCols.platNomor && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Plat Nomor
                        </th>
                      )}
                      {visibleCols.totalKg && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-right">
                          Total Kg
                        </th>
                      )}
                      {visibleCols.tujuan && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Tujuan
                        </th>
                      )}
                      {visibleCols.regional && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Regional
                        </th>
                      )}
                      {visibleCols.siteArea && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50">
                          Site Area
                        </th>
                      )}
                      {visibleCols.nominal && (
                        <th className="px-4 py-3 whitespace-nowrap bg-slate-50 text-right">
                          Nominal
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 uppercase">
                    {filteredDetailPOs.map((po: any, idx: number) => {
                      // --- LOGIKA AGREGASI MULTI-PRODUK ---
                      const items = po.Items || [];
                      const namaProduk = items
                        .map((it: any) => it.Product?.name || "-")
                        .join(", ");
                      const totalPcs = items.reduce(
                        (sum: number, it: any) => sum + (Number(it.pcs) || 0),
                        0,
                      );
                      const totalPcsKirim = items.reduce(
                        (sum: number, it: any) =>
                          sum + (Number(it.pcsKirim) || 0),
                        0,
                      );
                      const totalKg = items.reduce(
                        (sum: number, it: any) =>
                          sum +
                          (Number(it.pcsKirim) || Number(it.pcs) || 0) *
                            Number(it.Product?.satuanKg || 1),
                        0,
                      );
                      const totalNominal = items.reduce(
                        (sum: number, it: any) =>
                          sum + (Number(it.nominal) || 0),
                        0,
                      );

                      return (
                        <tr
                          key={po.id || idx}
                          onClick={() => {
                            const isShipped = items.some(
                              (it: any) => (Number(it.pcsKirim) || 0) > 0,
                            );
                            setSelectedDetailPO({
                              ...po,
                              buktiKirim: po.buktiKirim,
                              buktiFp: po.buktiFp,
                              company:
                                po.RitelModern?.namaPt ||
                                po.company ||
                                "Unknown",
                              siteArea: po.UnitProduksi?.siteArea || "-",
                              status: {
                                kirim: !!po.statusKirim || isShipped,
                                sdif: !!po.statusSdif,
                                po: !!po.statusPo,
                                fp: !!po.statusFp,
                                kwi: !!po.statusKwi,
                                inv: !!po.statusInv,
                                tagih: !!po.statusTagih,
                                bayar: !!po.statusBayar,
                              },
                            });
                          }}
                          className="border-b border-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                          title="Klik untuk melihat detail PO"
                        >
                          {visibleCols.noPo && (
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-700">
                              {po.noPo || "-"}
                            </td>
                          )}
                          {visibleCols.tglPo && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatDateId(po.tglPo)}
                            </td>
                          )}
                          {visibleCols.expired && (
                            <td className="px-4 py-3 whitespace-nowrap text-rose-600 font-semibold">
                              {formatDateId(po.expiredTgl)}
                            </td>
                          )}
                          {visibleCols.produk && (
                            <td
                              className="px-4 py-3 max-w-[200px] truncate"
                              title={namaProduk}
                            >
                              {namaProduk || "-"}
                            </td>
                          )}
                          {visibleCols.tglKirim && (
                            <td className="px-4 py-3 whitespace-nowrap text-amber-600 font-semibold">
                              {formatDateId(po.tglkirim || po.tglKirim)}
                            </td>
                          )}
                          {visibleCols.pcs && (
                            <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                              {totalPcs.toLocaleString("id-ID")}
                            </td>
                          )}
                          {visibleCols.pcsKirim && (
                            <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-amber-600">
                              {totalPcsKirim.toLocaleString("id-ID")}
                            </td>
                          )}
                          {visibleCols.namaSupir && (
                            <td className="px-4 py-3 whitespace-nowrap uppercase">
                              {po.namaSupir || "-"}
                            </td>
                          )}
                          {visibleCols.platNomor && (
                            <td className="px-4 py-3 whitespace-nowrap uppercase font-bold">
                              {po.platNomor || "-"}
                            </td>
                          )}
                          {visibleCols.totalKg && (
                            <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">
                              {totalKg.toLocaleString("id-ID")}
                            </td>
                          )}
                          {visibleCols.tujuan && (
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {po.tujuanDetail || po.RitelModern?.tujuan || "-"}
                            </td>
                          )}
                          {visibleCols.regional && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              {po.regional || "-"}
                            </td>
                          )}
                          {visibleCols.siteArea && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              {po.UnitProduksi?.siteArea || "-"}
                            </td>
                          )}
                          {visibleCols.nominal && (
                            <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-indigo-700">
                              Rp {totalNominal.toLocaleString("id-ID")}
                            </td>
                          )}
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
              <p className="text-slate-400 text-xs mt-1">
                Gak ada jadwal PO yang dikirim pada tanggal ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Legend ─── */}

      {/* KOMPONEN MODAL DETAIL PO */}
      <PODetailModal
        open={!!selectedDetailPO}
        onClose={() => setSelectedDetailPO(null)}
        data={selectedDetailPO}
      />
    </div>
  );
}
