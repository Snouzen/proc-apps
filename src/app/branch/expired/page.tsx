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
  Clock,
  Package,
  AlertTriangle,
  Search,
  LayoutList,
  Check,
  ExternalLink,
  Truck,
} from "lucide-react";
import { getMe } from "@/lib/me";
import SmoothSelect from "@/components/ui/smooth-select";
import DateInputHybrid from "@/components/DateInputHybrid";
import { DataTable } from "@/components/data-table";

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

const formatDatePremium = (d: any) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MEI",
    "JUN",
    "JUL",
    "AGU",
    "SEP",
    "OKT",
    "NOV",
    "DES",
  ];
  return `${dt.getDate().toString().padStart(2, "0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

const formatCurrencyPremium = (n: any) => {
  const num = Number(n);
  if (!num || isNaN(num)) return "-";
  return `RP ${num.toLocaleString("id-ID")}`;
};

/* ──────────────────────────────────────────────
   Main Page Component
   ────────────────────────────────────────────── */
export default function ExpiredCalendarPage() {
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);
  const [regionalData, setRegionalData] = useState<Record<string, string[]>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);

  const now = new Date();
  const [selectedRegional, setSelectedRegional] = useState("");
  const [selectedSiteArea, setSelectedSiteArea] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const [poData, setPoData] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  // Fetch Role & Regions
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const r =
          me?.role === "rm" || me?.role === "sitearea" ? me.role : "pusat";
        setRole(r as any);
        setUserRegional(me?.regional || "");
        setUserSiteArea(me?.siteArea || "");

        if (r === "sitearea") {
          setSelectedRegional(me.regional || "");
          setSelectedSiteArea(me.siteArea || "");
        } else if (r === "rm") {
          setSelectedRegional(me.regional || "");
          setSelectedSiteArea("ALL");
        } else {
          setSelectedRegional("ALL");
          setSelectedSiteArea("ALL");
        }
      } catch {
        setRole("pusat");
      }
    })();

    fetch("/api/unit-produksi")
      .then((res) => res.json())
      .then((data) => {
        const grouped = (data || []).reduce((acc: any, curr: any) => {
          if (!curr.namaRegional) return acc;
          if (!acc[curr.namaRegional]) acc[curr.namaRegional] = [];
          if (curr.siteArea && !acc[curr.namaRegional].includes(curr.siteArea))
            acc[curr.namaRegional].push(curr.siteArea);
          return acc;
        }, {});
        setRegionalData(grouped);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch PO Data
  const fetchPOData = useCallback(async () => {
    setPoLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "5000",
        filterBy: "expired", // 👈 Kembalikan agar query API berdasarkan expiredTgl
        month: selectedMonth,
        year: selectedYear,
        includeItems: "true", // 👈 Agar bisa hitung total Kg
      });
      if (selectedRegional && selectedRegional !== "ALL")
        params.set("regional", selectedRegional);
      if (selectedSiteArea && selectedSiteArea !== "ALL")
        params.set("siteArea", selectedSiteArea);

      const res = await fetch(`/api/po?${params.toString()}`);
      const json = await res.json();
      setPoData(json?.data || []);
    } catch {
      setPoData([]);
    } finally {
      setPoLoading(false);
    }
  }, [selectedRegional, selectedSiteArea, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPOData();
  }, [fetchPOData]);

  // Calendar Logic
  const month = Number(selectedMonth);
  const year = Number(selectedYear);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayRaw = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const formatDateKey = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const groupedPOs = useMemo(() => {
    const map: Record<string, any[]> = {};
    poData.forEach((po) => {
      const raw = po.expiredTgl || po.expired; // FIX: Sync with Prisma field name
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(po);
    });
    return map;
  }, [poData]);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
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

  const toggleAllCols = (val: boolean) => {
    const next = {} as typeof visibleCols;
    Object.keys(visibleCols).forEach((k) => {
      next[k as keyof typeof visibleCols] = val;
    });
    setVisibleCols(next);
  };

  const filteredDetailPOs = useMemo(() => {
    if (!selectedDateKey || !groupedPOs[selectedDateKey]) return [];
    let list = groupedPOs[selectedDateKey];

    if (inlineSearch.trim()) {
      const q = inlineSearch.toLowerCase();
      list = list.filter((po) => {
        const noPo = String(po.noPo || "").toLowerCase();
        const comp = String(
          po.RitelModern?.namaPt || po.company || "",
        ).toLowerCase();
        const ini = String(po.RitelModern?.inisial || "").toLowerCase();
        return noPo.includes(q) || comp.includes(q) || ini.includes(q);
      });
    }
    if (inlineDateFrom) {
      const from = new Date(inlineDateFrom).getTime();
      list = list.filter(
        (po) => po.tglPo && new Date(po.tglPo).getTime() >= from,
      );
    }
    if (inlineDateTo) {
      const to = new Date(inlineDateTo).getTime() + 86399999;
      list = list.filter(
        (po) => po.tglPo && new Date(po.tglPo).getTime() <= to,
      );
    }
    return list;
  }, [selectedDateKey, groupedPOs, inlineSearch, inlineDateFrom, inlineDateTo]);

  // Reset detail states when date changes
  useEffect(() => {
    setInlineSearch("");
    setInlineDateFrom("");
    setInlineDateTo("");
    setColsOpen(false);
  }, [selectedDateKey]);

  if (isLoading || role === null) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">
          Memuat data kalender expired...
        </p>
      </div>
    );
  }

  const calendarCells: (null | number)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedDateLabel = selectedDateKey
    ? (() => {
        const parts = selectedDateKey.split("-");
        return `${Number(parts[2])} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
      })()
    : "";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg shadow-rose-500/20">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Expired Calendar
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-[52px]">
            Visualisasi tanggal kadaluarsa (expired) PO untuk monitoring limit
            waktu.
          </p>
        </div>
      </div>

      {/* Filters (Removed overflow-hidden to fix dropdown clipping) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {role !== "sitearea" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe2 size={12} /> Regional
              </label>
              <SmoothSelect
                value={selectedRegional}
                onChange={(v) => {
                  setSelectedRegional(v);
                  setSelectedSiteArea("ALL");
                  setSelectedDateKey(null);
                }}
                options={[
                  { value: "ALL", label: "Semua Regional" },
                  ...Object.keys(regionalData)
                    .sort()
                    .map((r) => ({ value: r, label: r })),
                ]}
                disabled={role !== "pusat"}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={12} /> Site Area
            </label>
            <SmoothSelect
              value={selectedRegional === "ALL" ? "" : selectedSiteArea}
              onChange={(v) => {
                setSelectedSiteArea(v);
                setSelectedDateKey(null);
              }}
              options={[
                { value: "ALL", label: "Semua Site Area" },
                ...(regionalData[selectedRegional] || []).map((s) => ({
                  value: s,
                  label: s,
                })),
              ]}
              disabled={role === "sitearea" || selectedRegional === "ALL"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarRange size={12} /> Bulan
            </label>
            <SmoothSelect
              value={selectedMonth}
              onChange={(v) => {
                setSelectedMonth(v);
                setSelectedDateKey(null);
              }}
              options={MONTH_NAMES.map((m, i) => ({
                value: String(i + 1),
                label: m,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarRange size={12} /> Tahun
            </label>
            <SmoothSelect
              value={selectedYear}
              onChange={(v) => {
                setSelectedYear(v);
                setSelectedDateKey(null);
              }}
              options={YEARS.map((y) => ({
                value: String(y),
                label: String(y),
              }))}
            />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between relative">
          <button
            onClick={() => {
              let m = month - 1,
                y = year;
              if (m < 1) {
                m = 12;
                y--;
              }
              setSelectedMonth(String(m));
              setSelectedYear(String(y));
              setSelectedDateKey(null);
            }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center relative pointer-events-auto">
              <h3 className="text-lg font-bold text-slate-800">
                {MONTH_NAMES[month - 1]} {year}
              </h3>
              {selectedSiteArea && (
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {selectedSiteArea} · {selectedRegional}
                </p>
              )}
              <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 flex items-center gap-2">
                <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg border border-rose-100 uppercase tracking-widest whitespace-nowrap">
                  {Object.values(groupedPOs)
                    .flat()
                    .reduce((acc, po) => {
                      const items = Array.isArray(po.Items) ? po.Items : [];
                      return (
                        acc +
                        items.reduce(
                          (s: number, it: any) =>
                            s +
                            (Number(it.pcs) || 0) *
                              (Number(it.Product?.satuanKg) || 1),
                          0,
                        )
                      );
                    }, 0)
                    .toLocaleString("id-ID")}{" "}
                  KG
                </span>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest whitespace-nowrap">
                  RP{" "}
                  {Object.values(groupedPOs)
                    .flat()
                    .reduce((acc, po) => {
                      const items = Array.isArray(po.Items) ? po.Items : [];
                      return (
                        acc +
                        items.reduce(
                          (s: number, it: any) => s + (Number(it.nominal) || 0),
                          0,
                        )
                      );
                    }, 0)
                    .toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              let m = month + 1,
                y = year;
              if (m > 12) {
                m = 1;
                y++;
              }
              setSelectedMonth(String(m));
              setSelectedYear(String(y));
              setSelectedDateKey(null);
            }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

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

        {poLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={20} className="text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">
              Memuat data PO...
            </span>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden m-6">
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
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {calendarCells.map((day, idx) => {
                if (day === null)
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="bg-slate-50/50 min-h-[50px] sm:min-h-[60px]"
                    />
                  );
                const dateKey = formatDateKey(year, month, day);
                const pos = groupedPOs[dateKey] || [];
                const hasPOs = pos.length > 0;
                const isSelected = selectedDateKey === dateKey;
                const today =
                  now.getFullYear() === year &&
                  now.getMonth() + 1 === month &&
                  now.getDate() === day;

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={`relative bg-white min-h-[50px] sm:min-h-[60px] p-2 cursor-pointer transition-all hover:bg-slate-50 group ${hasPOs ? "bg-rose-50/60 hover:bg-rose-100/60" : ""} ${isSelected ? "ring-2 ring-inset ring-rose-500 z-10" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${today ? "bg-rose-600 text-white shadow-sm" : hasPOs ? "text-rose-900" : "text-slate-500"}`}
                      >
                        {day}
                      </span>
                      {hasPOs && (
                        <span className="text-[9px] font-black text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded-md leading-none">
                          {pos.length}
                        </span>
                      )}
                    </div>

                    {/* KG Info (Sesuai Delivery Calendar) */}
                    {hasPOs && (
                      <div className="mt-1 relative z-10">
                        <span className="text-[10px] sm:text-[11px] font-black text-rose-800 tracking-tight leading-none block">
                          {pos
                            .reduce((acc, po) => {
                              const items = Array.isArray(po.Items)
                                ? po.Items
                                : [];
                              return (
                                acc +
                                items.reduce(
                                  (s: number, it: any) =>
                                    s +
                                    (Number(it.pcs) || 0) *
                                      (Number(it.Product?.satuanKg) || 1),
                                  0,
                                )
                              );
                            }, 0)
                            .toLocaleString("id-ID")}{" "}
                          <span className="text-[8px] font-bold text-rose-700/70 uppercase">
                            Kg
                          </span>
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

      {/* --- Detail Section Below Calendar (Concept Match with Delivery) --- */}
      {selectedDateKey && (
        <div className="mt-8 border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  PO Expired: {selectedDateLabel}
                </h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {filteredDetailPOs.length} /{" "}
                  {groupedPOs[selectedDateKey]?.length || 0} Purchase Orders
                  Berakhir
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
          <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center justify-between bg-zinc-50/80 p-3 rounded-2xl border border-slate-100">
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
                  placeholder="Cari No PO, Ritel..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
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

            <div className="relative">
              <button
                onClick={() => setColsOpen(!colsOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <LayoutList size={16} />
                Columns
                <ChevronDown
                  size={14}
                  className={`transition-transform ${colsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {colsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[120] p-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 border-b border-slate-50 flex items-center justify-between gap-1 mb-1">
                    <button
                      onClick={() => toggleAllCols(true)}
                      className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 px-2 py-1 rounded-md"
                    >
                      All
                    </button>
                    <button
                      onClick={() => toggleAllCols(false)}
                      className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 px-2 py-1 rounded-md"
                    >
                      None
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                    {Object.entries(visibleCols).map(([k, v]) => (
                      <div
                        key={k}
                        onClick={() =>
                          setVisibleCols((prev) => ({
                            ...prev,
                            [k]: !v,
                          }))
                        }
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${v ? "bg-rose-500 border-rose-500" : "bg-white border-slate-200"}`}
                        >
                          {v && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-slate-600 capitalize">
                          {k.replace(/([A-Z])/g, " $1")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: "noPo",
                label: "NO PO",
                hidden: !visibleCols.noPo,
                render: (_v: any, po: any) => (
                  <span className="text-xs font-black text-[#1e3a8a] whitespace-nowrap">
                    {po.noPo}
                  </span>
                ),
              },
              {
                key: "tglPo",
                label: "TGL PO",
                hidden: !visibleCols.tglPo,
                render: (_v: any, po: any) => (
                  <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                    {formatDatePremium(po.tglPo)}
                  </span>
                ),
              },
              {
                key: "expired",
                label: "EXPIRED",
                hidden: !visibleCols.expired,
                render: (_v: any, po: any) => (
                  <span className="text-[11px] font-black text-rose-500 whitespace-nowrap">
                    {formatDatePremium(po.expiredTgl)}
                  </span>
                ),
              },
              {
                key: "produk",
                label: "PRODUK / PT",
                hidden: !visibleCols.produk,
                render: (_v: any, po: any) => {
                  const names = (Array.isArray(po.Items) ? po.Items : [])
                    .map((it: any) => it.Product?.name || "")
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <span className="text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                      {names || "-"}
                    </span>
                  );
                },
              },
              {
                key: "tglKirim",
                label: "TGL KIRIM",
                hidden: !visibleCols.tglKirim,
                render: (_v: any, po: any) => (
                  <span
                    className={`text-[11px] font-black whitespace-nowrap ${po.tglkirim ? "text-amber-600" : "text-slate-300"}`}
                  >
                    {po.tglkirim ? formatDatePremium(po.tglkirim) : "-"}
                  </span>
                ),
              },
              {
                key: "pcs",
                label: "PCS",
                align: "center" as const,
                hidden: !visibleCols.pcs,
                render: (_v: any, po: any) => {
                  const total = (
                    Array.isArray(po.Items) ? po.Items : []
                  ).reduce(
                    (a: number, it: any) => a + (Number(it.pcs) || 0),
                    0,
                  );
                  return (
                    <span className="text-[11px] font-black text-slate-700">
                      {total.toLocaleString("id-ID")}
                    </span>
                  );
                },
              },
              {
                key: "pcsKirim",
                label: "PCS KIRIM",
                align: "center" as const,
                hidden: !visibleCols.pcsKirim,
                render: (_v: any, po: any) => {
                  const total = (
                    Array.isArray(po.Items) ? po.Items : []
                  ).reduce(
                    (a: number, it: any) => a + (Number(it.pcsKirim) || 0),
                    0,
                  );
                  return (
                    <span className="text-[11px] font-black text-amber-500">
                      {total ? total.toLocaleString("id-ID") : "-"}
                    </span>
                  );
                },
              },
              {
                key: "namaSupir",
                label: "NAMA SUPIR",
                hidden: !visibleCols.namaSupir,
                render: (_v: any, po: any) => (
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    {po.namaSupir || "-"}
                  </span>
                ),
              },
              {
                key: "platNomor",
                label: "PLAT NOMOR",
                hidden: !visibleCols.platNomor,
                render: (_v: any, po: any) => (
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    {po.platNomor || "-"}
                  </span>
                ),
              },
              {
                key: "totalKg",
                label: "TOTAL KG",
                align: "center" as const,
                hidden: !visibleCols.totalKg,
                render: (_v: any, po: any) => {
                  const total = (
                    Array.isArray(po.Items) ? po.Items : []
                  ).reduce(
                    (a: number, it: any) =>
                      a +
                      (Number(it.pcs) || 0) * Number(it.Product?.satuanKg || 1),
                    0,
                  );
                  return (
                    <span className="text-[11px] font-black text-slate-700">
                      {total.toLocaleString("id-ID")}
                    </span>
                  );
                },
              },
              {
                key: "tujuan",
                label: "TUJUAN",
                hidden: !visibleCols.tujuan,
                render: (_v: any, po: any) => (
                  <span className="text-[11px] font-bold text-slate-600 uppercase truncate max-w-[150px] inline-block">
                    {po.tujuanDetail || "-"}
                  </span>
                ),
              },
              {
                key: "nominal",
                label: "NOMINAL",
                align: "right" as const,
                hidden: !visibleCols.nominal,
                render: (_v: any, po: any) => {
                  const total = (po.Items || []).reduce(
                    (a: number, b: any) => a + (Number(b.nominal) || 0),
                    0,
                  );
                  return (
                    <span className="text-[11px] font-black text-indigo-600 whitespace-nowrap">
                      {formatCurrencyPremium(total)}
                    </span>
                  );
                },
              },
              {
                key: "actions",
                label: "AKSI",
                align: "right" as const,
                render: (_v: any, po: any) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/po?noPo=${po.noPo}`, "_blank");
                    }}
                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </button>
                ),
              },
            ]}
            data={filteredDetailPOs}
            rowKey={(po: any) => po.id}
            hidePagination
            loading={false}
            variant="rounded"
            className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xl shadow-slate-200/50"
            emptyMessage="Data Tidak Ditemukan"
          />
        </div>
      )}

      {!selectedSiteArea && selectedRegional !== "ALL" && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="p-4 bg-slate-50 rounded-2xl mb-4">
            <AlertTriangle size={32} className="text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">
            Pilih Site Area untuk memantau data expired
          </p>
        </div>
      )}
    </div>
  );
}
