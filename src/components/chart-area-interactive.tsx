"use client";

import { openDashboardPOs } from "@/lib/dashboardDrilldown";
import * as React from "react";
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis } from "recharts";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Info,
  Loader2,
  MoveHorizontal,
  RotateCcw,
  Search,
  Table,
  X,
} from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const description = "An interactive area chart for Total KG overview";

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_SHORT_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
];
const MONTHS_FULL_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function parseYMD(dateStr: string): { year: number; month: number; day: number; dayOfWeek: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    year: y,
    month: m,
    day: d,
    dayOfWeek: dt.getUTCDay(),
  };
}

function formatShortDate(dateStr: string): string {
  const parsed = parseYMD(dateStr);
  if (!parsed) return dateStr;
  const monthName = MONTHS_SHORT_ID[parsed.month - 1] || "";
  return `${parsed.day} ${monthName}`;
}

function formatFullDate(dateStr: string): string {
  const parsed = parseYMD(dateStr);
  if (!parsed) return dateStr;
  const dayName = DAYS_ID[parsed.dayOfWeek];
  const monthName = MONTHS_FULL_ID[parsed.month - 1] || "";
  return `${dayName}, ${parsed.day} ${monthName} ${parsed.year}`;
}

interface TrendItem {
  date: string;
  mobile: number;
}

interface DisplayItem {
  key: string;
  date: string;
  displayDate: string;
  fullDate: string;
  mobile: number;
  isWeekly?: boolean;
}

function aggregateWeekly(items: TrendItem[]): DisplayItem[] {
  if (items.length <= 7) {
    return items.map((it) => ({
      key: it.date,
      date: it.date,
      displayDate: formatShortDate(it.date),
      fullDate: formatFullDate(it.date),
      mobile: it.mobile,
      isWeekly: false,
    }));
  }

  const result: DisplayItem[] = [];
  const chunkSize = 7;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const startDate = chunk[0].date;
    const endDate = chunk[chunk.length - 1].date;
    const totalKg = chunk.reduce((sum, c) => sum + c.mobile, 0);

    const startShort = formatShortDate(startDate);
    const endShort = formatShortDate(endDate);
    const displayDate = `${startShort} - ${endShort}`;
    const fullDate = `Periode ${startDate} s.d. ${endDate} (${chunk.length} hari)`;

    result.push({
      key: `${startDate}_${endDate}`,
      date: startDate,
      displayDate,
      fullDate,
      mobile: totalKg,
      isWeekly: true,
    });
  }
  return result;
}

const chartConfig = {
  mobile: { label: "Total KG", color: "#38bdf8" },
} satisfies ChartConfig;

export function ChartAreaInteractive({
  role,
  regional,
}: {
  role: "pusat" | "rm" | null;
  regional: string | null;
}) {
  const [timeRange, setTimeRange] = React.useState("90d");
  const [viewMode, setViewMode] = React.useState<"daily" | "weekly">("daily");
  const [series, setSeries] = React.useState<Array<TrendItem>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<DisplayItem | null>(null);
  const [showDataModal, setShowDataModal] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState("");
  const [modalFilter, setModalFilter] = React.useState<"all" | "positive" | "zero">("all");

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const observerRef = React.useRef<ResizeObserver | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const latestReqIdRef = React.useRef<number>(0);

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  // Track container width dynamically via callback ref (attaches when chart element mounts after loading)
  const containerCallbackRef = React.useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    containerRef.current = el;
    if (el) {
      setContainerWidth(el.clientWidth);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width || el.clientWidth;
          setContainerWidth(width);
        }
      });
      observer.observe(el);
      observerRef.current = observer;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!role) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const reqId = ++latestReqIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("metric", "kg");
      params.set("days", String(days));
      params.set("includeUnknown", "true");
      if (role === "rm" && regional) params.set("regional", regional);

      const res = await fetch(`/api/po/trend?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);

      if (reqId !== latestReqIdRef.current) return;

      if (!res.ok || !json) {
        const errMsg = json?.error || `Gagal memuat tren (${res.status} ${res.statusText})`;
        setError(errMsg);
        setSeries([]);
      } else {
        const rows: Array<{ date: string; kg: number }> = Array.isArray((json as any)?.data)
          ? (json as any).data
          : [];
        setSeries(
          rows.map((r) => ({
            date: String(r.date || ""),
            mobile: Number(r.kg) || 0,
          }))
        );
        setError(null);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (reqId === latestReqIdRef.current) {
        setError(e instanceof Error ? e.message : "Terjadi kendala jaringan saat memuat data.");
        setSeries([]);
      }
    } finally {
      if (reqId === latestReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [role, regional, days]);

  React.useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Reset selected item on filter changes
  React.useEffect(() => {
    setSelectedItem(null);
  }, [timeRange, viewMode]);

  const activeData: DisplayItem[] = React.useMemo(() => {
    if (viewMode === "weekly" && timeRange !== "7d") {
      return aggregateWeekly(series);
    }
    return series.map((s) => ({
      key: s.date,
      date: s.date,
      displayDate: formatShortDate(s.date),
      fullDate: formatFullDate(s.date),
      mobile: s.mobile,
      isWeekly: false,
    }));
  }, [series, viewMode, timeRange]);

  const totalKg = React.useMemo(() => {
    return series.reduce((sum, s) => sum + s.mobile, 0);
  }, [series]);

  const allZero = series.length > 0 && totalKg === 0;

  const minSlotWidth = viewMode === "weekly" ? 84 : 52;
  const calculatedWidth = activeData.length * minSlotWidth;
  const chartWidth = Math.max(containerWidth, calculatedWidth);
  const isOverflowing = activeData.length > 0 && calculatedWidth > containerWidth && containerWidth > 0;

  // Auto-scroll to end (most recent dates) when chart width expands
  React.useEffect(() => {
    if (containerRef.current && isOverflowing) {
      const scrollEl = containerRef.current;
      const timer = setTimeout(() => {
        if (scrollEl) {
          scrollEl.scrollLeft = scrollEl.scrollWidth;
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeData, isOverflowing, containerWidth]);

  const rangeLabel =
    timeRange === "90d"
      ? "3 bulan terakhir"
      : timeRange === "30d"
        ? "30 hari terakhir"
        : "7 hari terakhir";

  // Filtered rows for "Lihat Data" Dialog
  const filteredModalRows = React.useMemo(() => {
    return series.filter((item) => {
      if (modalFilter === "positive" && item.mobile <= 0) return false;
      if (modalFilter === "zero" && item.mobile > 0) return false;

      if (modalSearch.trim()) {
        const query = modalSearch.toLowerCase().trim();
        const shortDate = formatShortDate(item.date).toLowerCase();
        const fullDate = formatFullDate(item.date).toLowerCase();
        return (
          item.date.toLowerCase().includes(query) ||
          shortDate.includes(query) ||
          fullDate.includes(query)
        );
      }
      return true;
    });
  }, [series, modalFilter, modalSearch]);

  return (
    <>
      <Card className="pt-0">
        <CardHeader className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 space-y-0 border-b py-4 sm:py-5">
          <div className="grid flex-1 gap-1">
            <div className="flex items-center gap-2">
              <CardTitle>Total KG Overview</CardTitle>
              <button type="button" disabled={loading || !!error || !series.length} className="text-xs text-blue-600 underline disabled:opacity-50" onClick={() => openDashboardPOs({ tglFrom: series[0]?.date || "", tglTo: series[series.length - 1]?.date || "" }, "PO pada periode Total KG")}>Lihat PO periode ini</button>
              {viewMode === "weekly" && timeRange !== "7d" && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  Agregasi 7 Hari
                </span>
              )}
            </div>
            <CardDescription>
              Showing total KG for the {rangeLabel}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {timeRange !== "7d" && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("daily")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "daily"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Harian
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("weekly")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "weekly"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Mingguan
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowDataModal(true)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
                loading
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                  : "text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
              }`}
              title={loading ? "Sedang memuat data terbaru..." : "Buka tabel rincian data seluruh tanggal"}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin text-sky-500" />
              ) : (
                <Table size={14} className="text-sky-500" />
              )}
              <span>{loading ? "Memuat..." : "Lihat Data"}</span>
            </button>
            <div className="w-full sm:w-[155px] relative shrink-0">
              <SmoothSelect
                className="w-full"
                value={timeRange}
                onChange={(v) => {
                  setTimeRange(v);
                  if (v === "7d") setViewMode("daily");
                }}
                options={[
                  { value: "90d", label: "Last 3 months" },
                  { value: "30d", label: "Last 30 days" },
                  { value: "7d", label: "Last 7 days" },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {loading ? (
            <div className="h-[300px] w-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-sky-500" />
              <span className="text-xs font-semibold">Memuat tren volume PO...</span>
            </div>
          ) : error ? (
            <div className="h-[300px] w-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Gagal Memuat Data Tren</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchData()}
                className="inline-flex items-center gap-2 px-4 py-2 mt-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Coba Lagi</span>
              </button>
            </div>
          ) : series.length === 0 ? (
            <div className="h-[300px] w-full flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Info size={24} className="text-slate-300" />
              <p>Tidak ada data tercatat untuk rentang {rangeLabel}.</p>
            </div>
          ) : (
            <>
              {/* Informative Banner when all dates are 0 KG */}
              {allZero && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3.5 py-2.5 mb-3 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-200 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Data berhasil dimuat, namun seluruh tanggal bernilai <strong>0 KG</strong> pada {rangeLabel}.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDataModal(true)}
                    className="underline text-amber-700 dark:text-amber-300 hover:text-amber-900 font-bold shrink-0 cursor-pointer text-[11px]"
                  >
                    Cek Semua Tanggal di Tabel &rarr;
                  </button>
                </div>
              )}

              {/* Hint to swipe/scroll when content exceeds container */}
              {isOverflowing && (
                <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 animate-in fade-in duration-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MoveHorizontal size={14} className="text-sky-500 shrink-0 animate-pulse" />
                    <span>Geser grafik untuk melihat tanggal lainnya</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Total {activeData.length} {viewMode === "weekly" ? "minggu" : "hari"}</span>
                </div>
              )}

              {/* Scrollable Container */}
              <div
                ref={containerCallbackRef}
                className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div
                  style={{
                    width: chartWidth ? `${chartWidth}px` : "100%",
                    minWidth: "100%",
                  }}
                >
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[300px] w-full"
                  >
                    <ReBarChart
                      data={activeData}
                      onClick={(state: any) => {
                        if (!state) return;
                        let target: DisplayItem | null = null;
                        // 1. Try activeTooltipIndex (maps directly to array index)
                        if (
                          typeof state.activeTooltipIndex === "number" &&
                          state.activeTooltipIndex >= 0 &&
                          state.activeTooltipIndex < activeData.length
                        ) {
                          target = activeData[state.activeTooltipIndex] || null;
                        }
                        // 2. Try activeLabel (maps to item.key)
                        if (!target && state.activeLabel !== undefined && state.activeLabel !== null) {
                          target = activeData.find((d) => d.key === state.activeLabel) || null;
                        }
                        // 3. Fallback to activePayload
                        if (!target && Array.isArray(state.activePayload) && state.activePayload.length > 0) {
                          target = state.activePayload[0].payload || null;
                        }
                        if (target) {
                          setSelectedItem(target);
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--color-mobile)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-mobile)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="key"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        interval={0}
                        tickFormatter={(key) => {
                          const item = activeData.find((d) => d.key === key);
                          return item ? item.displayDate : String(key);
                        }}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-slate-400 dark:text-slate-500 font-medium"
                      />
                      <ChartTooltip
                        cursor={true}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(key: any) => {
                              const item = activeData.find((d) => d.key === key);
                              return item ? item.fullDate : String(key);
                            }}
                            config={chartConfig}
                            valueFormatter={(v: any) =>
                              `${Number(v || 0).toLocaleString("id-ID")} kg`
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="mobile"
                        fill="url(#fillMobile)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <ChartLegend
                        content={
                          <div className="mt-2 text-center">
                            <div className="flex items-center justify-center gap-2 text-xs">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ background: "var(--color-mobile)" }}
                              />
                              <span>Total KG {viewMode === "weekly" ? "(Mingguan)" : "(Harian)"}</span>
                            </div>
                          </div>
                        }
                      />
                    </ReBarChart>
                  </ChartContainer>
                </div>
              </div>

              {/* Highlighted selected day chip upon tap */}
              {selectedItem && (
                <div className="mt-3 flex items-center justify-between gap-3 px-3 py-2 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 rounded-xl text-xs text-sky-900 dark:text-sky-200 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>
                      <strong>{selectedItem.fullDate}:</strong>{" "}
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                        {selectedItem.mobile.toLocaleString("id-ID")} kg
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="p-1 text-sky-500 hover:text-sky-700 dark:hover:text-sky-300 rounded-lg transition-colors cursor-pointer"
                    aria-label="Tutup detail terpilih"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* "Lihat Data" Breakdown Dialog */}
      <Dialog open={showDataModal} onOpenChange={setShowDataModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl sm:rounded-[32px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl">
                <Table size={20} />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  Rincian Data Total KG Harian
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Menampilkan seluruh tanggal pada rentang {rangeLabel} {loading ? "(Memuat data...)" : `(${series.length} Hari)`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-sky-500" />
              <span className="text-xs font-semibold">Memuat rincian data {rangeLabel}...</span>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Gagal Memuat Data</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{error}</p>
              <button
                type="button"
                onClick={() => fetchData()}
                className="inline-flex items-center gap-2 px-4 py-2 mt-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Coba Lagi</span>
              </button>
            </div>
          ) : (
            <>
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 shrink-0 text-xs">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Volume</p>
                  <p className="text-sm font-black text-sky-600 dark:text-sky-400 mt-0.5">{totalKg.toLocaleString("id-ID")} kg</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Hari</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{series.length} Hari</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hari dengan Volume PO &gt; 0</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {series.filter((s) => s.mobile > 0).length} Hari
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hari 0 KG</p>
                  <p className="text-sm font-black text-slate-400 dark:text-slate-500 mt-0.5">
                    {series.filter((s) => s.mobile === 0).length} Hari
                  </p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="p-4 sm:px-6 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari tanggal..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setModalFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      modalFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Semua ({series.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter("positive")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      modalFilter === "positive" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold" : "text-slate-500 hover:text-emerald-600"
                    }`}
                  >
                    Volume PO &gt; 0 ({series.filter((s) => s.mobile > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter("zero")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      modalFilter === "zero" ? "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    0 KG ({series.filter((s) => s.mobile === 0).length})
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:px-6">
                {filteredModalRows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data yang cocok dengan pencarian / filter ini.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Tanggal Lengkap</th>
                        <th className="py-2.5 px-3 text-right">Volume (KG)</th>
                        <th className="py-2.5 px-3 text-center w-36">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {filteredModalRows.map((item, idx) => {
                        const isPos = item.mobile > 0;
                        return (
                          <tr key={item.date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold">
                              <span>{formatFullDate(item.date)}</span>
                              <span className="ml-2 text-[10px] text-slate-400 font-mono">({item.date})</span>
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isPos ? "text-sky-600 dark:text-sky-400" : "text-slate-400"}`}>
                              {item.mobile.toLocaleString("id-ID")} kg
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isPos ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                  <CheckCircle2 size={10} />
                                  Volume PO &gt; 0
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  0 KG
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowDataModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
